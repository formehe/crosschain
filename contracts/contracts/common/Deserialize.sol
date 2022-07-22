// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../lib/external_lib/RLPEncode.sol";
import "../../lib/external_lib/RLPDecode.sol";
import "./Utils.sol";
// import "hardhat/console.sol";

library Deserialize{
    using RLPDecode for bytes;
    using RLPDecode for uint;
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;
    
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
        bytes32 additional_hash;
        bytes32                 block_hash; // Additional computable element
        bytes32                 signature_hash; // Additional computable element
    }

    function decodeOptionalSignature(RLPDecode.RLPItem memory itemBytes)
        private
        pure
        returns (OptionalSignature memory res)
    {
        RLPDecode.Iterator memory it = itemBytes.iterator();
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0)  {
                res.some = it.next().toBoolean();
            }
            else if (idx == 1) {
                RLPDecode.RLPItem memory item = it.next();
                if (item.isList()) {
                    uint256 idx1;
                    RLPDecode.Iterator memory it1 = item.iterator();
                    while (it1.hasNext()) {
                        if (idx1 == 0) res.signature.r = bytes32(it1.next().toUint());
                        else if (idx1 == 1) res.signature.s = bytes32(it1.next().toUint());
                        else if (idx1 == 2) res.signature.v = uint8(it1.next().toUint());
                        else it1.next();
                        idx1++;
                    }

                    // console.log("OptionalSignature's signature r s v:", uint(res.signature.r), uint(res.signature.s), uint(res.signature.v));
                }
            } else it.next();

            idx++;
        }

        // console.log("OptionalSignature's some:", res.some);
    }

    function decodeOptionalBlockSignatures(RLPDecode.RLPItem memory itemBytes)
        private
        pure
        returns (OptionalBlockSignatures memory res)
    {
        if (itemBytes.isList()) {
            RLPDecode.Iterator memory it = itemBytes.iterator();
            uint256 idx;
            while (it.hasNext()) {
                if (idx == 0) res.epochId = uint64(it.next().toUint());
                else if (idx == 1) {
                    RLPDecode.RLPItem memory item = it.next();
                    RLPDecode.RLPItem[] memory ls = item.toList();
                    if (ls.length > 0) {
                        res.approvals_after_next = new OptionalSignature[](ls.length);
                        for (uint256 i = 0; i < ls.length; i++) {
                            res.approvals_after_next[i] = decodeOptionalSignature(ls[i]);
                        }
                    }
                }
                else it.next();

                idx++;
            }
        }
    }

    function decodeOptionalBlockProducers(RLPDecode.RLPItem memory itemBytes)
        private
        pure
        returns (OptionalBlockProducers memory res)
    {
        // console.logBytes(itemBytes.toBytes());
        if (itemBytes.isList()) {
            RLPDecode.Iterator memory it = itemBytes.iterator();
            uint256 idx;
            while (it.hasNext()) {
                if (idx == 0) res.epochId = uint64(it.next().toUint());
                else if (idx == 1) {
                    RLPDecode.RLPItem memory item = it.next();
                    RLPDecode.RLPItem[] memory ls = item.toList();
                    if (ls.length > 0) {                       
                        res.blockProducers = new BlockProducer[](ls.length);
                        res.some = true;
                        for (uint256 i = 0; i < ls.length; i++) {
                            RLPDecode.RLPItem[] memory items = ls[i].toList();
                            res.blockProducers[i].publicKey.x = items[0].toUint();
                            res.blockProducers[i].publicKey.y = items[1].toUint();
                            res.blockProducers[i].publicKey.signer = address(uint160(uint256(keccak256(abi.encodePacked(res.blockProducers[i].publicKey.x, res.blockProducers[i].publicKey.y)))));
                            // console.log("OptionalBlockProducers producer's publickey x:", uint(res.blockProducers[i].publicKey.x));
                            // console.log("OptionalBlockProducers producer's publickey y:", uint(res.blockProducers[i].publicKey.y));
                        }
                    }
                }else it.next();

                idx++;
            }
            // console.log("OptionalBlockProducers epoch id:", uint(res.epochId));
        }
    }

    function decodeBlockHeaderInnerLite(RLPDecode.RLPItem memory itemBytes)
        private
        pure
        returns (BlockHeaderInnerLite memory res)
    {
        //cacl innter hash
        res.inner_hash =  Utils.keccak256Raw(itemBytes.memPtr, itemBytes.len);//keccak256(abi.encodePacked(itemBytes.toRlpBytes()));
        // console.logBytes(itemBytes);

        RLPDecode.Iterator memory it = itemBytes.iterator();
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0) res.height = uint64(it.next().toUint());
            else if (idx == 1) res.timestamp = uint64(it.next().toUint());
            // else if (idx == 2) res.txs_root_hash = bytes32(it.next().toUint());
            else if (idx == 3) res.receipts_root_hash = bytes32(it.next().toUint());
            else if (idx == 4) res.block_merkle_root = bytes32(it.next().toUint());
            // else if (idx == 5) res.prev_block_hash = bytes32(it.next().toUint());
            else if (idx == 6) res.next_bps = decodeOptionalBlockProducers(it.next());
            else it.next();

            idx++;
        }

        // console.log("inner header's hash:", uint(res.inner_hash));
        // console.logBytes32(res.inner_hash);
        // console.log("inner header's timestamp:", uint(res.timestamp));
        // console.log("inner header's txs root hash:", uint(res.txs_root_hash));
        // console.logBytes32(res.txs_root_hash);
        // console.log("inner header's receipts root hash:", uint(res.receipts_root_hash));
        // console.logBytes32(res.receipts_root_hash);
        // console.log("inner header's block merkle hash:", uint(res.block_merkle_root));
        // console.logBytes32(res.block_merkle_root);
        // console.log("inner header's preview hash:", uint(res.prev_block_hash));
        // console.logBytes32(res.prev_block_hash);
    }

    function decodeMiniLightClientBlock(bytes memory rlpBytes)
        internal
        pure
        returns (LightClientBlock memory res)
    {
        uint byte0;
        assembly {
            byte0 := byte(0, mload(add(rlpBytes, 0x20)))
        }

        res.version = uint8(byte0);
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(rlpBytes, 1).iterator();
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0) {
                res.inner_lite = decodeBlockHeaderInnerLite(it.next());
            } else {
                it.next();
            }
            idx++;
        }

        res.block_hash = keccak256(abi.encodePacked(res.version, res.inner_lite.inner_hash));
        // console.log("header's version:", uint(res.version));
        // console.log("header's block_hash:", uint(res.block_hash));
    }

    function decodeLightClientBlock(bytes memory rlpBytes)
        internal
        pure
        returns (LightClientBlock memory res)
    {
        uint byte0;
        assembly {
            byte0 := byte(0, mload(add(rlpBytes, 0x20)))
        }

        // console.logBytes(rlpBytes);

        res.version = uint8(byte0);
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(rlpBytes, 1).iterator();
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0) {
                res.inner_lite = decodeBlockHeaderInnerLite(it.next());
            } else if (idx == 1) {
                res.approvals = decodeOptionalBlockSignatures(it.next());
            } else if (idx == 2) {
                res.additional_hash = bytes32(it.next().toUint());
            }
            else {
                it.next();
            }
            idx++;
        }

        res.block_hash = keccak256(abi.encodePacked(res.version, res.inner_lite.inner_hash));
        // console.logBytes32(res.block_hash);
        // console.logBytes(abi.encodePacked(res.block_hash, res.approvals.epochId, res.additional_hash));
        res.signature_hash = keccak256(abi.encodePacked(res.block_hash, res.approvals.epochId, res.additional_hash));
        // console.logBytes32(res.signature_hash);
    }

    function toBlockHeader(bytes memory rlpHeader) internal pure returns (BlockHeader memory header) {

        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(rlpHeader).iterator();

        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      header.parentHash       = bytes32(it.next().toUint());
            else if ( idx == 1 ) header.sha3Uncles       = bytes32(it.next().toUint());
            else if ( idx == 2 ) header.miner            = it.next().toAddress();
            else if ( idx == 3 ) header.stateRoot        = bytes32(it.next().toUint());
            else if ( idx == 4 ) header.transactionsRoot = bytes32(it.next().toUint());
            else if ( idx == 5 ) header.receiptsRoot     = bytes32(it.next().toUint());
            else if ( idx == 6 ) header.logsBloom        = it.next().toBytes();
            else if ( idx == 7 ) header.difficulty       = it.next().toUint();
            else if ( idx == 8 ) header.number           = it.next().toUint();
            else if ( idx == 9 ) header.gasLimit         = it.next().toUint();
            else if ( idx == 10 ) header.gasUsed         = it.next().toUint();
            else if ( idx == 11 ) header.timestamp       = it.next().toUint();
            else if ( idx == 12 ) header.extraData       = it.next().toBytes();
            else if ( idx == 13 ) header.mixHash         = bytes32(it.next().toUint());
            else if ( idx == 14 ) header.nonce           = uint64(it.next().toUint());
            else if ( idx == 15 ) header.baseFeePerGas   = it.next().toUint();
            else it.next();
            idx++;
        }
        header.hash = keccak256(rlpHeader);
    }

    function toReceiptLog(bytes memory data) internal pure returns (Log memory log) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(data).iterator();

        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 ) {
                log.contractAddress = it.next().toAddress();
            }
            else if ( idx == 1 ) {
                RLPDecode.RLPItem[] memory list = it.next().toList();
                log.topics = new bytes32[](list.length);
                for (uint256 i = 0; i < list.length; i++) {
                    bytes32 topic = bytes32(list[i].toUint());
                    log.topics[i] = topic;
                }
            }
            else if ( idx == 2 ) {
                log.data = it.next().toBytes();
            }
            else it.next();
            idx++;
        }
    }

    function toReceipt(bytes memory data, uint logIndex) internal pure returns (TransactionReceiptTrie memory receipt) {
        uint byte0;
        RLPDecode.Iterator memory it;        
        assembly {
            byte0 := byte(0, mload(add(data, 0x20)))
        }

        if (byte0 <= 0x7f) {
            it = RLPDecode.toRlpItem(data, 1).iterator();
        } else {
            it = RLPDecode.toRlpItem(data).iterator();
        }

        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 ) receipt.status = uint8(it.next().toUint());
            // else if ( idx == 1 ) receipt.gasUsed = it.next().toUint();
            // else if ( idx == 2 ) receipt.logsBloom = it.next().toBytes();
            else if ( idx == 3 ) {
                RLPDecode.RLPItem[] memory list = it.next().toList();
                require(logIndex < list.length, "log index is invalid");
                receipt.log = list[logIndex].toRlpBytes();
            }
            else it.next();
            idx++;
        }
    }
}