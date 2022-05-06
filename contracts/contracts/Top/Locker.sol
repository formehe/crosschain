// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./prove/ITopProve.sol";
import "./codec/EthProofDecoder.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/event/LockEvent2.sol";
import "../common/Utils.sol";
import "hardhat/console.sol";
contract Locker {
    ITopProve public prover;
    address public peerLockContract;

    /// Proofs from blocks that are below the acceptance height will be rejected.
    // If `minBlockAcceptanceHeight` value is zero - proofs from block with any height are accepted.
    uint64 public minBlockAcceptanceHeight;

    // OutcomeReciptId -> Used
    mapping(bytes32 => bool) public usedProofs;

    constructor(ITopProve _prover, uint64 _minBlockAcceptanceHeight) {
        require(address(_prover) != address(0), "Invalid prover address");
        prover = _prover;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
    }

    function _bindLockContract(bytes memory _peerLockContract) internal returns (bool) {
        require(Utils.toAddress(_peerLockContract) != address(0), "Invalid Token lock address");
        peerLockContract = Utils.toAddress(_peerLockContract);
        return true;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(EthProofDecoder.Proof memory proof, address contractAddress, uint64 proofBlockHeight)
        internal
        returns (bool)
    {
        require(peerLockContract != address(0), "Invalid Token lock address");
        address peerContract = peerLockContract;
        require(
            contractAddress == peerContract,
            "Can only unlock tokens from the linked proof producer on Top blockchain");
        
        EthereumDecoder.TransactionReceiptTrie memory receipt = EthereumDecoder.toReceipt(proof.reciptData);
        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number,proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);
        require(!usedProofs[proofIndex], "The burn event proof cannot be reused");
        (bool success,) = prover.verify(proof, receipt, header);
        require(success, "Proof should be valid");
        usedProofs[proofIndex] = true;
        return true;
    }
}
