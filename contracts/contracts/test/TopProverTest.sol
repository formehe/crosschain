// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Eth/prover/TopProver.sol";
import "../common/codec/EthProofDecoder.sol";
import "../../lib/lib/EthereumDecoder.sol";

contract TopProverTest is TopProver{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;
    using MPT for MPT.MerkleProof;

    constructor(address _bridgeLight)
    TopProver(_bridgeLight) {}

    function verifyHash(bytes32 hash) public returns(bool valid, string memory reason){
        bytes memory payload = abi.encodeWithSignature("blockHashes(bytes32)", hash);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }
    function decode1(bytes memory proofData) public view returns( EthProofDecoder.Proof memory proof){
        Borsh.Data memory borshData = Borsh.from(proofData);
        proof = borshData.decode();
        borshData.done();

        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        
        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = header.receiptsRoot;
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
        return proof;
    }

     function decode2(bytes memory proofData) public view returns( EthProofDecoder.Proof memory proof){
        Borsh.Data memory borshData = Borsh.from(proofData);
        proof = borshData.decode();
        borshData.done();
        return proof;
    }

}