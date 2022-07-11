// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../external_lib/RLPEncode.sol";
import "../external_lib/RLPDecode.sol";
//import "hardhat/console.sol";

library EthereumDecoder {
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
            else if ( idx == 1 ) receipt.gasUsed = it.next().toUint();
            else if ( idx == 2 ) receipt.logsBloom = it.next().toBytes();
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
