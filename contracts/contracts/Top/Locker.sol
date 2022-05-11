// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./prove/ITopProve.sol";
import "./codec/EthProofDecoder.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/Utils.sol";
import "hardhat/console.sol";
contract Locker is Initializable {
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;
    
    ITopProve private prover;
    address private lockProxyHash;
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) public usedProofs;

    struct LockEventData {
        address fromToken;
        address toToken;
        uint64  fromChainId;
        uint64  toChainId;
        address sender;
        uint256 amount;
        address recipient;
    }

    struct LockData {
        bytes32 proofIndex;
        LockEventData data;
    }

    function _Locker_init(
        ITopProve _prover,
        address _lockProxyHash,
        uint64 _minBlockAcceptanceHeight
    ) internal onlyInitializing {
        prover = _prover;
        lockProxyHash = _lockProxyHash;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(bytes32 proofIndex)
        internal
    {
        usedProofs[proofIndex] = true;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(bytes memory proofData, uint64 proofBlockHeight)
        internal
        returns (LockData memory _lockData)
    {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        address contractAddress;
        (_lockData.data, contractAddress)  = parseLog(proof.logEntryData);
        require(contractAddress != address(0), "Invalid Token lock address");
        address peerContract = lockProxyHash;
        require(
            contractAddress == lockProxyHash,
            "Can only unlock tokens from the linked proof producer on Top blockchain");
        
        EthereumDecoder.TransactionReceiptTrie memory receipt = EthereumDecoder.toReceipt(proof.reciptData);
        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);
        require(!usedProofs[proofIndex], "The burn event proof cannot be reused");
        (bool success,) = prover.verify(proof, receipt, header);
        require(success, "Proof should be valid");
        _lockData.proofIndex = proofIndex;
        usedProofs[proofIndex] = true;
    }

    function parseLog(bytes memory log)
        private
        view
        returns (LockEventData memory lockEvent, address contractAddress)
    {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        (lockEvent.fromChainId, lockEvent.toChainId, lockEvent.amount, lockEvent.recipient) = abi.decode(logInfo.data, (uint64, uint64, uint256, address));

        lockEvent.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        lockEvent.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        lockEvent.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        contractAddress = logInfo.contractAddress;
    }
}
