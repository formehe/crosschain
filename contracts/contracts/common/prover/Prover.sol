// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./IProver.sol";
import "../../../lib/lib/MPT.sol";
//import "hardhat/console.sol";

contract Prover{
    using MPT for MPT.MerkleProof;
    address public bridgeLight;

    constructor(address _bridgeLight) {
        bridgeLight = _bridgeLight;
    }

    function _verify(
        EthProofDecoder.Proof calldata proof, 
        EthereumDecoder.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot
    ) internal view {
        require((keccak256(proof.logEntryData) == keccak256(EthereumDecoder.getLog(receipt.logs[proof.logIndex]))), "Log is not found");

        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = receiptsRoot;
        merkleProof.proof = proof.proof;
        merkleProof.expectedValue = proof.reciptData;
        bytes memory actualKey = RLPEncode.encodeUint(proof.reciptIndex);

        bytes memory key = new bytes(actualKey.length << 1);
        uint j;
        for (uint i = 0; i < actualKey.length; i++) {
            key[j] = actualKey[i] >> 4;
            j += 1;
            key[j] = actualKey[i] & 0x0f;
            j += 1;
        }
        merkleProof.key = key;
        bool valid = merkleProof.verifyTrieProof();
        require(valid, "Fail to verify");
    }
}