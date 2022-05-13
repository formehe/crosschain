// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../codec/EthProofDecoder.sol";
import "../../../lib/lib/EthereumDecoder.sol";
import "hardhat/console.sol";
abstract contract VerifierCommon {
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

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(bytes memory proofData, uint64 proofBlockHeight)
        internal
        returns (VerifiedReceipt memory _receipt)
    {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        address contractAddress;
        (_receipt.data, contractAddress) = _parseLog(proof.logEntryData);
        require(contractAddress != address(0), "Invalid Token lock address");

        EthereumDecoder.TransactionReceiptTrie memory receipt = EthereumDecoder.toReceipt(proof.reciptData);
        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);
         _check(contractAddress, proofIndex, proof, receipt, header);
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(bytes memory log)
        private
        view
        returns (VerifiedEvent memory _receipt, address _contractAddress)
    {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        (_receipt.amount, _receipt.receiver) = abi.decode(logInfo.data, (uint256, address));

        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }

    function _check(
        address _proxyHash, 
        bytes32 _proofIndex,
        EthProofDecoder.Proof memory _proof, 
        EthereumDecoder.TransactionReceiptTrie memory _receipt,
        EthereumDecoder.BlockHeader memory _header
    ) internal virtual;
}