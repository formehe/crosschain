// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./prover/ITopProver.sol";
import "../common/codec/EthProofDecoder.sol";
import "../common/Borsh.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/Utils.sol";

contract Locker is Initializable{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    mapping(address => ToAddressHash) public assetHashMap;

    struct ToAddressHash{
        address toAssetHash;
        address peerLockProxyHash;
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

    function _locker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight
    ) internal onlyInitializing{
        prover = _prover;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
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
        ToAddressHash memory toAddressHash = assetHashMap[fromToken];
        require(toAddressHash.peerLockProxyHash == contractAddress, "proxy is not bound");

        EthereumDecoder.TransactionReceiptTrie memory receipt = EthereumDecoder.toReceipt(proof.reciptData);
        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);

        (bool success,) = prover.verify(proof, receipt, header.receiptsRoot,header.hash);
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