// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../prover/IEthProver.sol";
// import "hardhat/console.sol";
abstract contract VerifierUpgradeable is Initializable {
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

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

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_BURN = 1 << 0;
    uint constant PAUSED_MINT = 1 << 1;

    IEthProver private prover;
    address private lockProxyHash;
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) public usedProofs;

    function _VerifierUpgradeable_init(
        IEthProver _prover,
        address _peerLockProxyHash,
        uint64 _minBlockAcceptanceHeight
    ) internal onlyInitializing {
        prover = _prover;
        lockProxyHash = _peerLockProxyHash;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
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
        EthereumDecoder.TransactionReceiptTrie memory receipt = EthereumDecoder.toReceipt(proof.reciptData);
        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);

        (bool success,) = prover.verify(proof, receipt, header.receiptsRoot);
        require(success, "Proof should be valid");
        require(!usedProofs[proofIndex], "The burn event proof cannot be reused");
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) private view returns (VerifiedEvent memory _receipt, address _contractAddress) {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        (_receipt.amount, _receipt.receiver) = abi.decode(logInfo.data, (uint256, address));

        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }
}
