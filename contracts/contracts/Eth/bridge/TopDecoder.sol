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
    //    bytes32 bp_hash; // Additional computable element
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

    struct BlockHeaderInnerLite {
        uint8 version; //version of block header, modified
        uint64 height; // Height of this block since the genesis block (height 0).
        uint64 epoch_id; // Epoch start hash of this block's epoch. Used for retrieving validator information
        uint64 timestamp; // Timestamp at which the block was built.
        bytes32 txs_root_hash; // Hash of the next epoch block producers set
        bytes32 receipts_root_hash; // Root of the outcomes of transactions and receipts.
        bytes32 block_merkle_root; //all block merkle root hash
        bytes32 inner_hash; // Additional computable element
    }

    struct LightClientBlock {
        uint8 version; //added
        BlockHeaderInnerLite inner_lite;
        bytes32 prev_block_hash;
        OptionalBlockProducers next_bps;
        OptionalSignature[] approvals_after_next;
        bytes32 block_hash; // Additional computable element
    }

    
    function decodeOptionalSignature(RLPDecode.RLPItem memory itemBytes)
        internal
        view
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

                    console.log("OptionalSignature's signature r s v:", uint(res.signature.r), uint(res.signature.s), uint(res.signature.v));
                }
            } else it.next();

            idx++;
        }

        console.log("OptionalSignature's some:", res.some);
    }

    function decodeOptionalBlockProducers(RLPDecode.RLPItem memory itemBytes)
        internal
        view
        returns (OptionalBlockProducers memory res)
    {
        console.logBytes(itemBytes.toBytes());
        // res.bp_hash = sha256(abi.encodePacked(itemBytes.toBytes()));
        if (itemBytes.isList()) {
            RLPDecode.Iterator memory it = itemBytes.iterator();
            uint256 idx;
            while (it.hasNext()) {
                if (idx == 0) res.epochId = uint64(it.next().toUint());
                else if (idx == 1) {
                    res.some = true;
                    RLPDecode.RLPItem memory item = it.next();
                    RLPDecode.RLPItem[] memory ls = item.toList();
                    if (ls.length > 0) {                       
                        res.blockProducers = new BlockProducer[](ls.length);
                        for (uint256 i = 0; i < ls.length; i++) {
                            RLPDecode.RLPItem[] memory items = ls[i].toList();
                            res.blockProducers[i].publicKey.x = items[0].toUint();
                            res.blockProducers[i].publicKey.y = items[1].toUint();
                            res.blockProducers[i].stake = uint128(items[2].toUint());
                            res.blockProducers[i].publicKey.signer = address(uint160(uint256(keccak256(abi.encodePacked(res.blockProducers[i].publicKey.x, res.blockProducers[i].publicKey.y)))));
                            console.log("OptionalBlockProducers producer's publickey x:", uint(res.blockProducers[i].publicKey.x));
                            console.log("OptionalBlockProducers producer's publickey y:", uint(res.blockProducers[i].publicKey.y));
                            console.log("OptionalBlockProducers producer's stake:", uint(res.blockProducers[i].stake));
                        }
                    }
                }else it.next();

                idx++;
            }
            console.log("OptionalBlockProducers epoch id:", uint(res.epochId));
        }
    }

    function decodeBlockHeaderInnerLite(bytes memory itemBytes)
        internal
        view
        returns (BlockHeaderInnerLite memory res)
    {
        //cacl innter hash
        res.inner_hash = keccak256(abi.encodePacked(itemBytes));
        console.logBytes(itemBytes);
        uint byte0;
        assembly {
            byte0 := byte(0, mload(add(itemBytes, 0x20)))
        }

        res.version = uint8(byte0);
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(itemBytes, 1).iterator();
        
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0) res.height = uint64(it.next().toUint());
            else if (idx == 1) res.epoch_id = uint64(it.next().toUint());
            else if (idx == 2) res.timestamp = uint64(it.next().toUint());
            else if (idx == 3) res.txs_root_hash = bytes32(it.next().toUint());
            else if (idx == 4) res.receipts_root_hash = bytes32(it.next().toUint());
            else if (idx == 5) res.block_merkle_root = bytes32(it.next().toUint());
            else it.next();

            idx++;
        }

        console.log("inner header's hash:", uint(res.inner_hash));
        console.logBytes32(res.inner_hash);
        console.log("inner header's version:", uint(res.version));
        console.log("inner header's height:", uint(res.height));
        console.log("inner header's epochId:", uint(res.epoch_id));
        console.log("inner header's timestamp:", uint(res.timestamp));
        console.log("inner header's txs root hash:", uint(res.txs_root_hash));
        console.log("inner header's receipts root hash:", uint(res.receipts_root_hash));
        console.log("inner header's block merkle hash:", uint(res.block_merkle_root));
    }

    function decodeLightClientBlock(bytes memory rlpBytes)
        internal
        view
        returns (LightClientBlock memory res)
    {
        uint byte0;
        assembly {
            byte0 := byte(0, mload(add(rlpBytes, 0x20)))
        }

        console.logBytes(rlpBytes);

        res.version = uint8(byte0);
        RLPDecode.RLPItem memory bp;
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(rlpBytes, 1).iterator();
        uint256 idx;
        while (it.hasNext()) {
            if (idx == 0) {
                res.inner_lite = decodeBlockHeaderInnerLite(it.next().toBytes());
            } else if (idx == 1) {
                res.prev_block_hash = bytes32(it.next().toUint());
            } else if (idx == 2) {
                bp = it.next();
                res.next_bps = decodeOptionalBlockProducers(bp);
            } else if (idx == 3) {
                RLPDecode.RLPItem memory sig_item = it.next();
                if (sig_item.numItems() > 0) {
                    RLPDecode.RLPItem[] memory sig_ls = sig_item.toList();
                    res.approvals_after_next = new OptionalSignature[](sig_ls.length);
                    console.logUint(sig_ls.length);
                    for (uint256 i = 0; i < sig_ls.length; i++) {
                        res.approvals_after_next[i] = decodeOptionalSignature(sig_ls[i]);
                    }
                }
            } else {
                it.next();
            }
            idx++;
        }

        bytes[] memory raw_list = new bytes[](4);
        raw_list[0] = RLPEncode.encodeUint(res.version);
        raw_list[1] = RLPEncode.encodeBytes(abi.encodePacked(res.inner_lite.inner_hash));
        raw_list[2] = RLPEncode.encodeBytes(abi.encodePacked(res.prev_block_hash));
        bytes[] memory raw_list1;
        if (res.next_bps.some) {
            raw_list1 = new bytes[](1);
            raw_list1[0] = bp.toBytes();
            raw_list[3] = RLPEncode.encodeList(raw_list1);
        } else {
            raw_list[3] = RLPEncode.encodeList(raw_list1);
        }

        bytes memory  hash_raw = RLPEncode.encodeList(raw_list);
        console.logBytes(hash_raw);

        //calc innter hash
        res.block_hash = keccak256(abi.encodePacked(hash_raw));
        console.log("header's version:", uint(res.version));
        console.log("header's prev block hash:", uint(res.prev_block_hash));
        console.log("header's block_hash:", uint(res.block_hash));
        console.logBytes32(res.block_hash);
    }
}
