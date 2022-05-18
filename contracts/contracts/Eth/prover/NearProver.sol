// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../common/AdminControlledUpgradeable1.sol";
import "../bridge/INearBridge.sol";
import "../bridge/NearDecoder.sol";
import "./ProofDecoder.sol";
import "./INearProver.sol";

contract NearProver is Initializable, INearProver, AdminControlledUpgradeable1 {
    using Borsh for Borsh.Data;
    using NearDecoder for Borsh.Data;
    using ProofDecoder for Borsh.Data;

    uint constant UNPAUSE_ALL = 0;
    uint constant PAUSED_VERIFY = 1;

    INearBridge public bridge;

    function initialize(
        INearBridge _bridge,
        address _owner
    ) external initializer {
        bridge = _bridge;
        AdminControlledUpgradeable1._AdminControlledUpgradeable_init(_owner,UNPAUSE_ALL ^ 0xff);
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _grantRole(OWNER_ROLE,_owner);
    }

    function proveOutcome(bytes memory proofData, uint64 blockHeight)
        public
        view
        override
        pausable(PAUSED_VERIFY,CONTROLLED_ROLE)
        returns (bool)
    {
        Borsh.Data memory borsh = Borsh.from(proofData);
        ProofDecoder.FullOutcomeProof memory fullOutcomeProof = borsh.decodeFullOutcomeProof();
        borsh.done();

        bytes32 hash = _computeRoot(
            fullOutcomeProof.outcome_proof.outcome_with_id.hash,
            fullOutcomeProof.outcome_proof.proof
        );

        hash = sha256(abi.encodePacked(hash));

        hash = _computeRoot(hash, fullOutcomeProof.outcome_root_proof);

        require(
            hash == fullOutcomeProof.block_header_lite.inner_lite.outcome_root,
            "NearProver: outcome merkle proof is not valid"
        );

        bytes32 expectedBlockMerkleRoot = bridge.blockMerkleRoots(blockHeight);

        require(
            _computeRoot(fullOutcomeProof.block_header_lite.hash, fullOutcomeProof.block_proof) ==
                expectedBlockMerkleRoot,
            "NearProver: block proof is not valid"
        );

        return true;
    }

    function _computeRoot(bytes32 node, ProofDecoder.MerklePath memory proof) internal view returns (bytes32 hash) {
        hash = node;
        for (uint i = 0; i < proof.items.length; i++) {
            ProofDecoder.MerklePathItem memory item = proof.items[i];
            if (item.direction == 0) {
                hash = sha256(abi.encodePacked(item.hash, hash));
            } else {
                hash = sha256(abi.encodePacked(hash, item.hash));
            }
        }
    }
}
