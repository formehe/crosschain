// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../lib/external_lib/RLPDecode.sol";

interface IDeserialize{
    struct BlockHeader {
        bytes32 hash;
        bytes32 parentHash;
        bytes32 sha3Uncles;  // ommersHash
        address miner;       // beneficiary
        bytes32 stateRoot;
        bytes32 transactionsRoot;
        bytes32 receiptsRoot;
        bytes logsBloom;
        uint256 difficulty;
        uint256 number;
        uint256 gasLimit;
        uint256 gasUsed;
        uint256 timestamp;
        bytes extraData;
        bytes32 mixHash;
        uint64 nonce;
        uint256 totalDifficulty;
        uint256 baseFeePerGas;
    }

    struct Log {
        address contractAddress;
        bytes32[] topics;
        bytes data;
    }

    struct TransactionReceiptTrie {
        uint8 status;
        uint256 gasUsed;
        bytes logsBloom;
        bytes log;
    }

    struct SECP256K1PublicKey {
        uint256 x;
        uint256 y;
        address signer; //additional
    }

    struct BlockProducer {
        SECP256K1PublicKey publicKey;
        uint128 stake;
    }

    struct OptionalBlockProducers {
       bool some; 
       uint64 epochId;
       BlockProducer[] blockProducers;
    }

    struct Signature {
        bytes32 r;
        bytes32 s;
        uint8 v;
    }

    struct OptionalSignature {
        bool some; //add
        Signature signature;
    }

    struct OptionalBlockSignatures {
        uint64  epochId;
        bytes32 additional_hash;
        OptionalSignature[] approvals_after_next;
    }

    struct BlockHeaderInnerLite {
        uint64 height; // Height of this block since the genesis block (height 0).
        uint64 timestamp; // Timestamp at which the block was built.
        bytes32 txs_root_hash; // Hash of the next epoch block producers set
        bytes32 receipts_root_hash; // Root of the outcomes of transactions and receipts.
        bytes32 block_merkle_root; //all block merkle root hash
        bytes32 prev_block_hash;
        OptionalBlockProducers next_bps;
        bytes32 inner_hash;// Additional computable element
    }

    struct LightClientBlock {
        uint8 version; //added
        BlockHeaderInnerLite    inner_lite;
        OptionalBlockSignatures approvals;
        bytes32                 block_hash; // Additional computable element
        bytes32                 signature_hash; // Additional computable element
    }

    function decodeMiniLightClientBlock(bytes memory rlpBytes)
        external
        view
        returns (LightClientBlock memory res);

    function decodeLightClientBlock(bytes memory rlpBytes)
        external
        view
        returns (LightClientBlock memory res);

    function toBlockHeader(bytes memory rlpHeader) external view returns (BlockHeader memory header);
    function toReceiptLog(bytes memory data) external view returns (Log memory log);
    function toReceipt(bytes memory data, uint logIndex) external view returns (TransactionReceiptTrie memory receipt);
}