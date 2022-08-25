// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../../../lib/lib/MPT.sol";
import "../../../lib/external_lib/RLPEncode.sol";

abstract contract IProver {
    using MPT for MPT.MerkleProof;
    address public bridge;
    constructor(address bridge_) {
        bridge = bridge_;
    }

    function verify(bytes calldata proofData) external virtual returns(bool valid, bytes32 proofIndex);
    function _verify(uint64 reciptIndex, bytes memory reciptData, bytes[] memory proof, bytes32 receiptsRoot) internal view {
        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = receiptsRoot;
        merkleProof.proof = proof;
        merkleProof.expectedValue = reciptData;
        bytes memory actualKey = RLPEncode.encodeUint(reciptIndex);

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