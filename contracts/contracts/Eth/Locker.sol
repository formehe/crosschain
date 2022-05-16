// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./prover/INearProver.sol";
import "./prover/ProofDecoder.sol";
import "../common/Borsh.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/Utils.sol";

contract Locker is Initializable{
    using Borsh for Borsh.Data;
    using ProofDecoder for Borsh.Data;

    mapping(address => ToAddressHash) public assetHashMap;

    struct ToAddressHash{
        address toAssetHash;
        address peerLockProxyHash;
    }

    INearProver private prover;

    // Proofs from blocks that are below the acceptance height will be rejected.
    // If `minBlockAcceptanceHeight` value is zero - proofs from block with any height are accepted.
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) private usedProofs;

    event ConsumedProof(bytes32 indexed _receiptId);

    function _locker_initialize(
        INearProver _prover,
        uint64 _minBlockAcceptanceHeight
    ) internal onlyInitializing{
        prover = _prover;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
    } 
    
    struct BurnResult {
        uint128 amount;
        address token;
        address recipient;
    }

    // Parses the provided proof and consumes it if it's not already used.
    // The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(bytes memory proofData, uint64 proofBlockHeight)
        internal
        returns (BurnResult memory result1)
    {
        ProofDecoder.ExecutionStatus memory result;
        require(prover.proveOutcome(proofData, proofBlockHeight), "Proof should be valid");

        // Unpack the proof and extract the execution outcome.
        Borsh.Data memory borshData = Borsh.from(proofData);
        ProofDecoder.FullOutcomeProof memory fullOutcomeProof = borshData.decodeFullOutcomeProof();
        borshData.done();

        require(
            fullOutcomeProof.block_header_lite.inner_lite.height >= minBlockAcceptanceHeight,
            "Proof is from the ancient block"
        );

        bytes32 receiptId = fullOutcomeProof.outcome_proof.outcome_with_id.outcome.receipt_ids[0];
        require(!usedProofs[receiptId], "The burn event proof cannot be reused");
        usedProofs[receiptId] = true;

        result = fullOutcomeProof.outcome_proof.outcome_with_id.outcome.status;
        require(!result.failed, "Cannot use failed execution outcome for unlocking the tokens");
        require(!result.unknown, "Cannot use unknown execution outcome for unlocking the tokens");

        emit ConsumedProof(receiptId);

        Borsh.Data memory borshData1 = Borsh.from(result.successValue);
        uint8 flag = borshData1.decodeU8();
        require(flag == 0, "ERR_NOT_WITHDRAW_RESULT");
        result1.amount = borshData1.decodeU128();
        bytes20 token = borshData1.decodeBytes20();
        result1.token = address(uint160(token));
        bytes20 recipient = borshData1.decodeBytes20();
        result1.recipient = address(uint160(recipient));
        
        ToAddressHash memory toAddressHash = assetHashMap[result1.token];

        require(keccak256(fullOutcomeProof.outcome_proof.outcome_with_id.outcome.executor_id)
            == keccak256(Utils.toBytes(toAddressHash.peerLockProxyHash)),
            "Can only unlock tokens from the linked proof producer on Near blockchain");

        borshData1.done();
    }

}