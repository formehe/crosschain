// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./prover/ITopProver.sol";
import "../common/codec/EthProofDecoder.sol";
import "../common/Borsh.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "./bridge/TopDecoder.sol";
import "../common/Utils.sol";
import "../common/ILimit.sol";
import "../common/AdminControlledUpgradeable.sol";

contract Locker is Initializable,AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    mapping(address => ToAddressHash) public assets;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    ILimit public limit;
    bool public isEth;
    //keccak256("BLACK.UN.LOCK.ROLE")
    bytes32 constant public BLACK_UN_LOCK_ROLE = 0xc3af44b98af11d4a60c1cc6766bcc712210de97241b8cbefd5c9a0ff23992219;
    //keccak256("BLACK.LOCK.ROLE")
    bytes32 constant public BLACK_LOCK_ROLE = 0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4;

    event Locked (
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 amount,
        address receiver
    );

    event Unlocked (
        uint256 amount,
        address recipient
    );

    event BindAsset(
        address fromAssetHash,
        address toAssetHash,
        address peerLockProxyHash
    );

    struct ToAddressHash{
        address assetHash;
        address lockProxyHash;
    }

    struct VerifiedEvent {
        address fromToken;
        address toToken;
        address sender;
        uint256 amount;
        address receiver;
    }

    struct VerifiedReceipt {
        bytes32 proofIndex;
        VerifiedEvent data;
    }

    ITopProver private prover;

    // Proofs from blocks that are below the acceptance height will be rejected.
    // If `minBlockAcceptanceHeight` value is zero - proofs from block with any height are accepted.
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) public usedProofs;

    event ConsumedProof(bytes32 indexed _receiptId);


    function _Locker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        ILimit _limit,
        bool _isEth
    ) internal onlyInitializing{
        require(_owner != address(0));
        prover = _prover;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
        limit = _limit;
        isEth = _isEth;
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(_owner,UNPAUSED_ALL ^ 0xff);
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);

        _setRoleAdmin(BLACK_UN_LOCK_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_LOCK_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE,_owner);
        _grantRole(WITHDRAWAL_ROLE,_owner);
    } 

    struct BurnResult {
        uint128 amount;
        address token;
        address recipient;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        bytes32 proofIndex
    ) internal {
        usedProofs[proofIndex] = true;
    }

    function bindAssetHash(address _fromAssetHash, address _toAssetHash,address _peerLockProxyHash) external onlyRole(OWNER_ROLE) returns (bool) {
        if(isEth){
            require(_toAssetHash != address(0) && _peerLockProxyHash != address(0), "both asset addresses are not to be 0");
        }else{
            require(_fromAssetHash != address(0) && _toAssetHash != address(0) && _peerLockProxyHash != address(0), "both asset addresses are not to be 0");
        }
   
        assets[_fromAssetHash] = ToAddressHash({
            assetHash:_toAssetHash,
            lockProxyHash:_peerLockProxyHash
        });
        emit BindAsset(_fromAssetHash, _toAssetHash,_peerLockProxyHash);
        return true;
    }

    /// verify
    function _verify( bytes memory proofData, 
        uint64 proofBlockHeight) internal returns (VerifiedReceipt memory _receipt){
        _receipt = _parseAndConsumeProof(proofData,proofBlockHeight);
        _saveProof(_receipt.proofIndex);
        return _receipt;

    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes memory proofData, 
        uint64 proofBlockHeight
    ) internal returns (VerifiedReceipt memory _receipt) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        address contractAddress;
        (_receipt.data, contractAddress) = _parseLog(proof.logEntryData);
        require(contractAddress != address(0), "Invalid Token lock address");

        address fromToken = _receipt.data.toToken;
        ToAddressHash memory toAddressHash = assets[fromToken];
        require(toAddressHash.lockProxyHash == contractAddress, "proxy is not bound");

        EthereumDecoder.TransactionReceiptTrie memory receipt = EthereumDecoder.toReceipt(proof.reciptData);
        TopDecoder.LightClientBlock memory header = TopDecoder.decodeLightClientBlock(proof.headerData);
        limit.checkFrozen(_receipt.data.fromToken,prover.getAddLightClientTime(header.inner_lite.height));
        bytes memory reciptIndex = abi.encode(header.inner_lite.height, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);
        require(limit.forbiddens(proofIndex) == false, "receipt id has already been forbidden");
        (bool success,) = prover.verify(proof, receipt, header.inner_lite.receipts_root_hash,header.block_hash);
        require(success, "Proof should be valid");
        require(!usedProofs[proofIndex], "The burn event proof cannot be reused");
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) private view returns (VerifiedEvent memory _receipt, address _contractAddress) {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        //burn
        require(topics0 == 0x4f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842, "invalid the function of topics");
        (_receipt.amount, _receipt.receiver) = abi.decode(logInfo.data, (uint256, address));
        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }

    modifier lockToken_pauseable(){
        require(!hasRole(BLACK_LOCK_ROLE,_msgSender()) && ((paused & PAUSED_LOCK) == 0 || hasRole(CONTROLLED_ROLE,_msgSender())),"has been pause");
        _;
    }

    modifier unLock_pauseable(){
        require(!hasRole(BLACK_UN_LOCK_ROLE,_msgSender())&& ((paused & PAUSED_UNLOCK) == 0 || hasRole(CONTROLLED_ROLE,_msgSender())),"has been pause");
        _;
    }
}