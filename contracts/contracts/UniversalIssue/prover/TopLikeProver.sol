// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./IProver.sol";
import "../../common/codec/TopProofDecoder.sol";
import "../../common/Deserialize.sol";
import "../../../lib/lib/MPT.sol";

contract TopLikeProver is IProver{
    using Borsh for Borsh.Data;
    using TopProofDecoder for Borsh.Data;
    using MPT for MPT.MerkleProof;

    constructor(address bridge_) IProver(bridge_) {}

    function verify(
        bytes memory proofData
    ) external override view returns(bool valid, bytes32 blockHash, uint256 receiptIndex, uint256 time) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        TopProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();
        
        Deserialize.TransactionReceiptTrie memory receipt = Deserialize.toReceipt(proof.reciptData, proof.logIndex);
        Deserialize.LightClientBlock memory header = Deserialize.decodeMiniLightClientBlock(proof.headerData);
        
        require((keccak256(proof.logEntryData) == keccak256(receipt.log)), "Log is not found");
        _verify(proof.reciptIndex, proof.reciptData, proof.reciptProof, header.inner_lite.receipts_root_hash);
        _verify(proof.blockIndex, abi.encodePacked(header.block_hash), proof.blockProof,  _getBlockMerkleRoot(proof.polyBlockHeight));
        time = getAddLightClientTime(proof.polyBlockHeight);
        return (true, header.block_hash, proof.reciptIndex, time);
    }

    function _getBlockMerkleRoot(
        uint64 height
    ) internal view returns(bytes32 blockMerkleRoot){
        bytes memory payload = abi.encodeWithSignature("blockMerkleRoots(uint64)", height);
        (bool success, bytes memory returnData) = bridge.staticcall(payload);
        require(success, "Height is not confirmed3");
        (blockMerkleRoot) = abi.decode(returnData, (bytes32));
        require(uint(blockMerkleRoot) > 0, "Height is not confirmed4");
        return blockMerkleRoot;
    }

    function getAddLightClientTime(
        uint64 height
    ) internal view returns(uint256 time){
        bytes memory payload = abi.encodeWithSignature("blockHeights(uint64)", height);
        (bool success, bytes memory returnData) = bridge.staticcall(payload);
        require(success, "Height is not confirmed");
        (time) = abi.decode(returnData, (uint256));
        require(time > 0, "Height is not confirmed1");
        return time;
    }
}