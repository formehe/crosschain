// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../../../common/AdminControlledUpgradeable.sol";
import "../../../../Top/prover/IEthProver.sol";
import "../../../../common/ILimit.sol";

abstract contract NFTMintVerifier is Initializable, AdminControlledUpgradeable {
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    struct PeerLockEvent {
        address fromToken;
        address toToken;
        address sender;
        uint256 tokenId;
        address receiver;
    }

    struct VerifiedReceipt {
        bytes32 proofIndex;
        PeerLockEvent data;
    }

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_BURN = 1 << 0;
    uint constant PAUSED_MINT = 1 << 1;

    IEthProver public prover;
    ILimit public limiter;

    address public lockProxyHash;
    mapping(bytes32 => bool) public usedProofs;

    function _NFTMintVerifier_init(
        IEthProver _prover,
        address   _peerLockProxyHash,
        ILimit    _limiter
    ) internal onlyInitializing {
        prover = _prover;
        lockProxyHash = _peerLockProxyHash;
        limiter = _limiter;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        bytes32 proofIndex
    ) internal {
        usedProofs[proofIndex] = true;
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
        require(lockProxyHash == contractAddress, "proxy is not bound");

        Deserialize.TransactionReceiptTrie memory receipt = Deserialize.toReceipt(proof.reciptData, proof.logIndex);
        Deserialize.BlockHeader memory header = Deserialize.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);
        require(limiter.forbiddens(proofIndex) == false, "receipt id has already been forbidden");

        (bool success,) = prover.verify(proof, receipt, header.receiptsRoot,header.hash, header.number);
        require(success, "Proof should be valid");
        require(!usedProofs[proofIndex], "The burn event proof cannot be reused");
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) internal virtual view returns (PeerLockEvent memory _receipt, address _contractAddress) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        
        //Lock
        require(topics0 == 0x56b161a6e4643e17140e8adce689a2b4dd38a651272b26645c7320a9284d7ab3, "invalid the function of topics");
        (_receipt.tokenId, _receipt.receiver) = abi.decode(logInfo.data, (uint256, address));
        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }

    modifier mint_pauseable(){
         require(!hasRole(BLACK_MINT_ROLE, _msgSender())&& ((paused & PAUSED_MINT) == 0 || hasRole(CONTROLLED_ROLE, _msgSender())), "no permit");
        _;
    }

    modifier burn_pauseable(){
        require(!hasRole(BLACK_BURN_ROLE, _msgSender()) && ((paused & PAUSED_BURN) == 0), "no permit");
        _;
    }
}
