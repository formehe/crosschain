// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./prover/INearProver.sol";
import "./prover/ProofDecoder.sol";
import "../common/Borsh.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/Utils.sol";

contract Bridge is Initializable{
    using Borsh for Borsh.Data;
    using ProofDecoder for Borsh.Data;

    event ConsumedProof(bytes32 indexed _receiptId);

    INearProver private prover;
    address private lockProxyHash;

    // Proofs from blocks that are below the acceptance height will be rejected.
    // If `minBlockAcceptanceHeight` value is zero - proofs from block with any height are accepted.
    uint64 private minBlockAcceptanceHeight;
    mapping(bytes32 => bool) private usedProofs;

    function _Bridge_init(
        INearProver _prover,
        address _lockProxyHash,
        uint64 _minBlockAcceptanceHeight
    ) internal onlyInitializing {
        prover = _prover;
        lockProxyHash = _lockProxyHash;
        minBlockAcceptanceHeight = _minBlockAcceptanceHeight;
    }

    struct LockEventData {
        address fromToken;
        uint64  fromChainId;
        uint64  toChainId;   
        address toToken;

        address sender;
        uint256 amount;
        address recipient;
    }

    // Parses the provided proof and consumes it if it's not already used.
    // The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(bytes memory proofData, uint64 proofBlockHeight)
        internal
        returns (ProofDecoder.ExecutionStatus memory result)
    {
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

        require(keccak256(fullOutcomeProof.outcome_proof.outcome_with_id.outcome.executor_id)
            == keccak256(Utils.toBytes(lockProxyHash)),
            "Can only unlock tokens from the linked proof producer on Near blockchain");

        result = fullOutcomeProof.outcome_proof.outcome_with_id.outcome.status;
        require(!result.failed, "Cannot use failed execution outcome for unlocking the tokens");
        require(!result.unknown, "Cannot use unknown execution outcome for unlocking the tokens");

        emit ConsumedProof(receiptId);
    }

    function parseLog(bytes memory log)
        private
        view
        returns (LockEventData memory lockEvent, address contractAddress)
    {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        (lockEvent.fromChainId, lockEvent.toChainId, lockEvent.amount, lockEvent.recipient) = abi.decode(logInfo.data, (uint64, uint64, uint256, address));

        lockEvent.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        lockEvent.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        lockEvent.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        contractAddress = logInfo.contractAddress;
    }
}