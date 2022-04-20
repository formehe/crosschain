// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../common/Borsh.sol";
import "./prove/ITopProve.sol";
import "./codec/EthProofDecoder.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/event/LockEvent2.sol";
import "../common/Utils.sol";

contract Locker2 {
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    ITopProve public prover;
    bytes public peerLockContract;

    /// Proofs from blocks that are below the acceptance height will be rejected.
    // If `minBlockAcceptanceHeight` value is zero - proofs from block with any height are accepted.
    uint64 public minBlockAcceptanceHeight;

    // OutcomeReciptId -> Used
    mapping(bytes32 => bool) public usedProofs;

    constructor(bytes memory _peerLockContract, ITopProve _prover, uint64 _minBlockAcceptanceHeight) {
        require(_peerLockContract.length > 0, "Invalid Near Token Factory address");
        require(address(_prover) != address(0), "Invalid Near prover address");

        peerLockContract = _peerLockContract;
        prover = _prover;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(bytes memory proofData, address contractAddress, uint64 proofBlockHeight)
        internal
        returns (bool)
    {        
        require(
            keccak256(Utils.toBytes(contractAddress)) == keccak256(peerLockContract),
            "Can only unlock tokens from the linked proof producer on Top blockchain");        

        bytes32 proofIndex = keccak256(proofData);
        require(!usedProofs[proofIndex], "The burn event proof cannot be reused");
        (bool success,) = prover.verify(proofData);
        require(success, "Proof should be valid");
        usedProofs[proofIndex] = true;
        return true;
    }
}
