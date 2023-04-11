// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/prover/Prover.sol";
import "./ITopProver.sol";
import "../../../lib/lib/MPT.sol";
import "../../common/Deserialize.sol";

contract TopProver is Prover, ITopProver{
    using MPT for MPT.MerkleProof;

    // constructor(address _bridgeLight)
    // Prover(_bridgeLight) {}
    function _TopProver_initialize(
        address _bridgeLight
    ) external initializer {
        _Prover_initialize(_bridgeLight);
    }

    function verify(
        TopProofDecoder.Proof calldata proof, 
        Deserialize.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot, bytes32 blockHash
    ) external view override returns (bool valid, string memory reason) {
        _verify(proof.logEntryData, proof.reciptIndex, proof.reciptData, proof.reciptProof, receipt, receiptsRoot);
        _verifyBlock(proof, blockHash);
        return (true, "");
    }

    function _verifyBlock(TopProofDecoder.Proof calldata proof,bytes32 blockHash) internal view{
        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = _getBlockMerkleRoot(proof.polyBlockHeight);
        merkleProof.proof = proof.blockProof;
        merkleProof.expectedValue = abi.encodePacked(blockHash);

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

    function getAddLightClientTime(uint64 height) external override returns(uint256 time){
        bytes memory payload = abi.encodeWithSignature("blockHeights(uint64)", height);
        (bool success, bytes memory returnData) = bridgeLight.staticcall(payload);
        require(success, "Height is not confirmed");
        (time) = abi.decode(returnData, (uint256));
        require(time > 0, "Height is not confirmed1");
        return time;
    }

    function _getBlockMerkleRoot(uint64 height) internal view returns(bytes32 blockMerkleRoot){
        bytes memory payload = abi.encodeWithSignature("blockMerkleRoots(uint64)", height);
        (bool success, bytes memory returnData) = bridgeLight.staticcall(payload);
        require(success, "Height is not confirmed3");
        (blockMerkleRoot) = abi.decode(returnData, (bytes32));
        require(uint(blockMerkleRoot) > 0, "Height is not confirmed4");
        return blockMerkleRoot;
    }

}