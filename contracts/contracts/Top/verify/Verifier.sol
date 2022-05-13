// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../prove/ITopProve.sol";
import "./VerifierCommon.sol";
// import "hardhat/console.sol";
contract Verifier is VerifierCommon {    
    ITopProve private prover;
    address private lockProxyHash;
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) private usedProofs;

    constructor (ITopProve _prover,
        address _peerLockProxyHash,
        uint64 _minBlockAcceptanceHeight
    ) {
        prover = _prover;
        lockProxyHash = _peerLockProxyHash;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(bytes32 proofIndex)
        internal
    {
        usedProofs[proofIndex] = true;
    }

    function _check(
        address _proxyHash, 
        bytes32 _proofIndex,
        EthProofDecoder.Proof memory _proof, 
        EthereumDecoder.TransactionReceiptTrie memory _receipt, 
        EthereumDecoder.BlockHeader memory _header
    ) internal override {
        require(_proxyHash == lockProxyHash,
                "proxy is not bound");
        require(!usedProofs[_proofIndex], "The burn event proof cannot be reused");
        (bool success,) = prover.verify(_proof, _receipt, _header);
        require(success, "Proof should be valid");
    }
}
