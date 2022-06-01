// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "../../../lib/external_lib/RLPEncode.sol";
import "../../../lib/external_lib/RLPDecode.sol";

library TopDecoder {
    using RLPDecode for bytes;
    using RLPDecode for uint;
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;

    
    struct SECP256K1PublicKey {
        uint256 x;
        uint256 y;
    }

    struct BlockProducer {
        SECP256K1PublicKey publicKey;
        uint128 stake;
    }

    struct OptionalBlockProducers {
       bool some;
        BlockProducer[] blockProducers;
        bytes32 bp_hash; // Additional computable element
    }

    struct Signature {
        bytes32 r;
        bytes32 s;
        uint8 v;
    }

    struct OptionalSignature {
        bool some;
        Signature signature;
    }

    struct BlockHeaderInnerLite {
        uint64 version; //version of block header
        uint64 height; // Height of this block since the genesis block (height 0).
        uint64 epoch_id; // Epoch start hash of this block's epoch. Used for retrieving validator information
        uint64 timestamp; // Timestamp at which the block was built.
        bytes32 elections_hash; // Hash of the next epoch block producers set
        bytes32 txs_root_hash; // Hash of the next epoch block producers set
        bytes32 receipts_root_root; // Root of the outcomes of transactions and receipts.
        bytes32 prev_state_root; // Root hash of the state at the previous block.
        bytes32 block_merkle_root; //all block merkle root hash
        bytes32 inner_hash; // Additional computable element
    }

    struct LightClientBlock {
        BlockHeaderInnerLite inner_lite;
        bytes32 prev_block_hash;
        uint256 chain_bits;
        uint64 table_height;
        OptionalBlockProducers next_bps;
        OptionalSignature[] approvals_after_next;
        bytes32 block_hash; // Additional computable element
    }

    
    function decodeOptionalSignature(RLPDecode.RLPItem memory itemBytes)
        internal
        pure
        returns (OptionalSignature memory res)
    {
        RLPDecode.Iterator memory it = itemBytes.iterator();
        uint256 idx;
        while (it.hasNext()) {
            res.some = true;
            if (idx == 0) res.signature.r = bytes32(it.next().toUint());
            else if (idx == 1) res.signature.s = bytes32(it.next().toUint());
            else if (idx == 2) res.signature.v = uint8(it.next().toUint());
            else it.next();

            idx++;
        }
    }

    function decodeOptionalBlockProducers(RLPDecode.RLPItem memory itemBytes)
        internal
        view
        returns (OptionalBlockProducers memory res)
    {
        if (itemBytes.isList()) {
            RLPDecode.RLPItem[] memory ls = itemBytes.toList();
            if (ls.length > 0) {
                bytes memory hash_raw = itemBytes.toBytes();
                res.bp_hash = sha256(abi.encodePacked(hash_raw));
                console.log("OptionalBlockProducers bp_hash ");
                console.logBytes32(res.bp_hash);
                res.some = true;
                res.blockProducers = new BlockProducer[](ls.length);
                for (uint256 i = 0; i < ls.length; i++) {
                    RLPDecode.RLPItem[] memory items = ls[i].toList();
                    res.blockProducers[i].publicKey.x = items[0].toUint();
                    res.blockProducers[i].publicKey.y = items[1].toUint();
                    res.blockProducers[i].stake = uint128(items[2].toUint());
                }
            }
        }
    }

    function decodeBlockHeaderInnerLite(RLPDecode.RLPItem memory itemBytes)
        internal
        view
        returns (BlockHeaderInnerLite memory res)
    {
        //cacl innter hash
        bytes memory hash_raw = itemBytes.toRlpBytes();
        res.inner_hash = keccak256(abi.encodePacked(hash_raw));

        RLPDecode.Iterator memory it = itemBytes.iterator();

        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0)      res.version = uint64(it.next().toUint());
            else if (idx == 1) res.height = uint64(it.next().toUint());
            else if (idx == 2) res.epoch_id = uint64(it.next().toUint());
            else if (idx == 3) res.timestamp = uint64(it.next().toUint());
            else if (idx == 4) res.elections_hash = bytes32(it.next().toUint());
            else if (idx == 5) res.txs_root_hash = bytes32(it.next().toUint());
            else if (idx == 6) res.receipts_root_root = bytes32(it.next().toUint());
            else if (idx == 7) res.prev_state_root = bytes32(it.next().toUint());
            else if (idx == 8) res.block_merkle_root = bytes32(it.next().toUint());
            else it.next();

            idx++;
        }

    }

    function decodeLightClientBlock(bytes memory rlpBytes)
        internal
        view
        returns (LightClientBlock memory res)
    {

        RLPDecode.Iterator memory it = rlpBytes.toRlpItem().iterator();
   
        
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0) {
                res.inner_lite = decodeBlockHeaderInnerLite(it.next());
            } else if (idx == 1) {
                res.prev_block_hash = bytes32(it.next().toUint());

            } else if (idx == 2) {
                res.chain_bits = it.next().toUint();
            } else if (idx == 3) {
                res.table_height = uint64(it.next().toUint());
            } else if (idx == 4) {
                res.next_bps = decodeOptionalBlockProducers(it.next());
            } else if (idx == 5) {
                RLPDecode.RLPItem memory sig_item = it.next();
                if (sig_item.numItems() > 0) {
                    RLPDecode.RLPItem[] memory sig_ls = sig_item.toList();
                    res.approvals_after_next = new OptionalSignature[](sig_ls.length);
                    for (uint256 i = 0; i < sig_ls.length; i++) {
                        res.approvals_after_next[i] = decodeOptionalSignature(sig_ls[i]);
                    }
                }
            }
            idx++;
        }

        bytes[] memory raw_list = new bytes[](4);
        raw_list[0] = RLPEncode.encodeBytes(abi.encodePacked(res.inner_lite.inner_hash));
        raw_list[1] = RLPEncode.encodeBytes(abi.encodePacked(res.prev_block_hash));
        raw_list[2] = RLPEncode.encodeUint(res.chain_bits);
        raw_list[3] = RLPEncode.encodeUint(res.table_height);
        bytes memory  hash_raw = RLPEncode.encodeList(raw_list);

        res.block_hash = keccak256(abi.encodePacked(hash_raw));
        console.log("res.block_hash ");
        console.logBytes32(res.block_hash);
    }

}
