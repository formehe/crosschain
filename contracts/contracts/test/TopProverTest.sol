// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Eth/prover/TopProver.sol";
import "../common/codec/TopProofDecoder.sol";
import "../common/IDeserialize.sol";

contract TopProverTest is TopProver{
    using Borsh for Borsh.Data;
    using TopProofDecoder for Borsh.Data;
    using MPT for MPT.MerkleProof;

    IDeserialize deserializer;

    constructor(address _bridgeLight, IDeserialize _deserializer)
    TopProver(_bridgeLight) {
        deserializer = _deserializer;
    }

    function verifyHash(bytes32 hash) public returns(bool valid, string memory reason){
        bytes memory payload = abi.encodeWithSignature("blockHashes(bytes32)", hash);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }

    function verifyReceiptProof(bytes memory proofData) public view returns(TopProofDecoder.Proof memory proof){
        Borsh.Data memory borshData = Borsh.from(proofData);
        proof = borshData.decode();
        borshData.done();

        IDeserialize.LightClientBlock memory header = deserializer.decodeLightClientBlock(proof.headerData);
    
        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = header.inner_lite.receipts_root_hash;
        merkleProof.proof = proof.reciptProof;
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

    function verifyBlockProof(bytes memory proofData) public view returns(TopProofDecoder.Proof memory proof){
        Borsh.Data memory borshData = Borsh.from(proofData);
        proof = borshData.decode();
        borshData.done();

        IDeserialize.LightClientBlock memory header = deserializer.decodeLightClientBlock(proof.headerData);

        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = _getBlockMerkleRoot(proof.polyBlockHeight);
        merkleProof.proof = proof.blockProof;
        merkleProof.expectedValue = abi.encodePacked(header.block_hash);

        bytes memory actualKey = RLPEncode.encodeUint(proof.blockIndex);

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
        require(valid, "Fail to verify1");
       
    }

    function decodeProof(bytes memory proofData) public pure returns( TopProofDecoder.Proof memory proof){
        Borsh.Data memory borshData = Borsh.from(proofData);
        proof = borshData.decode();
        borshData.done();
        return proof;
    }


}