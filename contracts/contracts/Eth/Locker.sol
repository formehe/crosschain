// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./prover/ITopProver.sol";
import "../common/codec/TopProofDecoder.sol";
import "../common/Borsh.sol";
import "../common/ILimit.sol";
import "../common/AdminControlledUpgradeable.sol";
import "../common/Deserialize.sol";
import "../common/IERC20Decimals.sol";

contract Locker is Initializable,AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using TopProofDecoder for Borsh.Data;

    mapping(address => ToAddressHash) public assets;
    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    ILimit public limit;
    //keccak256("BLACK.UN.LOCK.ROLE")
    bytes32 constant BLACK_UN_LOCK_ROLE = 0xc3af44b98af11d4a60c1cc6766bcc712210de97241b8cbefd5c9a0ff23992219;
    //keccak256("BLACK.LOCK.ROLE")
    bytes32 constant BLACK_LOCK_ROLE = 0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4;

    event Locked (
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 amount,
        address receiver
    );

    event Unlocked (
        bytes32 proofIndex,
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

    struct WithdrawHistory{
        uint time;
        uint256 accumulativeAmount;
    }

    mapping(address => uint256) public withdrawQuotas;
    mapping(address => WithdrawHistory) public withdrawHistories;

    ITopProver public prover;

    // Proofs from blocks that are below the acceptance height will be rejected.
    // If `minBlockAcceptanceHeight` value is zero - proofs from block with any height are accepted.
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) public usedProofs;

    function _Locker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        ILimit _limit
    ) internal onlyInitializing{
        require(_owner != address(0));
        prover = _prover;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
        limit = _limit;
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(msg.sender, UNPAUSED_ALL ^ 0xff);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_UN_LOCK_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_LOCK_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE,_owner);
        _grantRole(ADMIN_ROLE,msg.sender);
    } 

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        bytes32 proofIndex
    ) internal {
        usedProofs[proofIndex] = true;
    }

    function bindWithdrawQuota(address _asset, uint256 _withdrawQuota) external onlyRole(ADMIN_ROLE) {
        require(_withdrawQuota != 0, "withdraw quota can not be 0");
        withdrawQuotas[_asset] = _withdrawQuota;
    }

    function _checkAndRefreshWithdrawTime(address _asset, uint256 amount) internal {
        uint256 quota = withdrawQuotas[_asset];
        require(quota != 0, "withdraw quota is not bound");
        require(amount <= quota, "withdraw quota is not enough");

        uint time = block.timestamp;
        WithdrawHistory memory history = withdrawHistories[_asset];
        require(time > history.time, "block time is too old");

        if ((history.time == 0) || (time - history.time >= 1 days)) {
            withdrawHistories[_asset].time = time;
            withdrawHistories[_asset].accumulativeAmount = amount;
        } else {
            require (quota - history.accumulativeAmount >= amount, "today's quota is used up");
            withdrawHistories[_asset].accumulativeAmount = history.accumulativeAmount + amount;
        }
    }

    function _bindAssetHash(address _fromAssetHash,address _toAssetHash,address _peerLockProxyHash) internal{
        require(assets[_fromAssetHash].assetHash == address(0), "Can not modify the bind asset");
        assets[_fromAssetHash] = ToAddressHash({
            assetHash:_toAssetHash,
            lockProxyHash:_peerLockProxyHash
        });
        emit BindAsset(_fromAssetHash, _toAssetHash,_peerLockProxyHash);
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
        TopProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        address contractAddress;
        (_receipt.data, contractAddress) = _parseLog(proof.logEntryData);
        require(contractAddress != address(0), "Invalid Token lock address");

        address fromToken = _receipt.data.toToken;
        ToAddressHash memory toAddressHash = assets[fromToken];
        require(toAddressHash.lockProxyHash == contractAddress, "proxy is not bound");

        Deserialize.TransactionReceiptTrie memory receipt = Deserialize.toReceipt(proof.reciptData, proof.logIndex);
        Deserialize.LightClientBlock memory header = Deserialize.decodeMiniLightClientBlock(proof.headerData);
        uint256 time;
        time = prover.getAddLightClientTime(proof.polyBlockHeight);
        require(limit.checkFrozen(_receipt.data.fromToken, time),'tx is frozen');
        bytes memory reciptIndex = abi.encode(header.inner_lite.height, proof.reciptIndex);

        bytes32 proofIndex = keccak256(reciptIndex);
        require(limit.forbiddens(proofIndex) == false, "tx is forbidden");
        (bool success,) = prover.verify(proof, receipt, header.inner_lite.receipts_root_hash, header.block_hash);
        require(success, "proof is invalid");
        require(!usedProofs[proofIndex], "proof is reused");
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) private pure returns (VerifiedEvent memory _receipt, address _contractAddress) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "wrong number of topic");
        bytes32 topics0 = logInfo.topics[0];
        
        //burn
        require(topics0 == 0x4f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842, "invalid signature");
        (_receipt.amount, _receipt.receiver) = abi.decode(logInfo.data, (uint256, address));
        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }

    modifier lockToken_pauseable(){
        require(!hasRole(BLACK_LOCK_ROLE,_msgSender()) && ((paused & PAUSED_LOCK) == 0),"no permit");
        _;
    }

    modifier unLock_pauseable(){
        require(!hasRole(BLACK_UN_LOCK_ROLE,_msgSender())&& ((paused & PAUSED_UNLOCK) == 0),"no permit");
        _;
    }
}