// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../external_lib/RLPDecode.sol";
import "../../contracts/common/Utils.sol";
import "hardhat/console.sol";
/*
    Documentation:
    - https://eth.wiki/en/fundamentals/patricia-tree
    - https://github.com/blockchainsllc/in3/wiki/Ethereum-Verification-and-MerkleProof
    - https://easythereentropy.wordpress.com/2014/06/04/understanding-the-ethereum-trie/
*/
library MPT {
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;

    struct MerkleProof {
        bytes32 expectedRoot;
        bytes key;
        bytes[] proof;
        uint256 keyIndex;
        uint256 proofIndex;
        bytes expectedValue;
    }

    function verifyTrieProof(
        MerkleProof memory data
    ) view internal returns (bool)
    {
        bytes memory node = data.proof[data.proofIndex];
        RLPDecode.Iterator memory dec = RLPDecode.toRlpItem(node).iterator();
        if (data.keyIndex == 0) {
            require(keccak256(node) == data.expectedRoot, "verifyTrieProof root node hash invalid");
        }
        else if (node.length < 32) {
            bytes32 root = bytes32(dec.next().toUint());
            require(root == data.expectedRoot, "verifyTrieProof < 32");
        }
        else {
            require(keccak256(node) == data.expectedRoot, "verifyTrieProof else");
        }

        uint256 numberItems = RLPDecode.numItems(dec.item);

        // branch
        if (numberItems == 17) {
            return verifyTrieProofBranch(data);
        }
        // leaf / extension
        else if (numberItems == 2) {
            return verifyTrieProofLeafOrExtension(dec, data);
        }

        if (data.expectedValue.length == 0) return true;
        else return false;
    }

    function verifyTrieProofBranch(
        MerkleProof memory data
    ) view internal returns (bool)
    {
        bytes memory node = data.proof[data.proofIndex];

        if (data.keyIndex >= data.key.length) {
            bytes memory item = RLPDecode.toRlpItem(node).toList()[16].toBytes();
            if (keccak256(item) == keccak256(data.expectedValue)) {
                return true;
            }
        }
        else {
            uint256 index = uint256(uint8(data.key[data.keyIndex]));
            RLPDecode.RLPItem memory _newExpectedRoot = RLPDecode.toRlpItem(node).toList()[index].toBytesItem();

            if (!(_newExpectedRoot.len == 0)) {
                data.expectedRoot = _b2b32(_newExpectedRoot.memPtr);
                data.keyIndex += 1;
                data.proofIndex += 1;
                return verifyTrieProof(data);
            }
        }

        if (data.expectedValue.length == 0) return true;
        else return false;
    }

    function verifyTrieProofLeafOrExtension(
        RLPDecode.Iterator memory dec,
        MerkleProof memory data
    ) view internal returns (bool)
    {
        bytes memory nodekey = dec.next().toBytes();
        RLPDecode.RLPItem memory nodevalue = dec.next().toBytesItem();
        uint256 prefix;
        assembly {
            let first := shr(248, mload(add(nodekey, 32)))
            prefix := shr(4, first)
        }

        bytes memory key;
        uint j;
        if ((prefix & 0x1 == 0) && (nodekey.length > 1 )) { 
            key = new bytes((nodekey.length - 1) << 1);
        } else if (prefix & 0x1 == 0x1) {
            key = new bytes(((nodekey.length - 1) << 1) + 1);
            key[j] = nodekey[0] & 0x0f;
            j += 1;
        }

        for (uint i = 1; i < nodekey.length; i++) {
            key[j] = nodekey[i] >> 4;
            j += 1;
            key[j] = nodekey[i] & 0x0f;
            j += 1;
        }
        
        if ((prefix == 2) || (prefix == 3)) {
            // leaf odd
            bytes memory actualKey = sliceTransform(key, 32, key.length);
            bytes memory restKey = sliceTransform(data.key, 32 + data.keyIndex, data.key.length - data.keyIndex);

            if (keccak256(data.expectedValue) == Utils.keccak256Raw(nodevalue.memPtr, nodevalue.len)) {
                if (keccak256(actualKey) == keccak256(restKey)) return true;
            }
        }
        else if ((prefix == 0) || (prefix == 1)) {
            // extension even
            bytes memory shared_nibbles = sliceTransform(key, 32, key.length);
            bytes memory restKey = sliceTransform(data.key, 32 + data.keyIndex, key.length);
            if (
                keccak256(shared_nibbles) == keccak256(restKey)
            ) {
                data.expectedRoot = _b2b32(nodevalue.memPtr);
                data.keyIndex += key.length;
                data.proofIndex += 1;
                return verifyTrieProof(data);
            }
        }
        else {
            revert("Invalid proof");
        }
        if (data.expectedValue.length == 0) return true;
        else return false;
    }

    // function b2b32(bytes memory data) pure internal returns(bytes32 part) {
    //     assembly {
    //         part := mload(add(data, 32))
    //     }
    // }

    function _b2b32(uint data) pure internal returns(bytes32 part) {
        assembly {
            part := mload(data)
        }
    }

    function sliceTransform(
        bytes memory data,
        uint256 start,
        uint256 length
    )
        pure internal returns(bytes memory)
    {
        uint256 slots = length / 32;
        uint256 rest = (length % 32) * 8;
        uint256 pos = 32;
        uint256 si = 0;
        uint256 source;
        bytes memory newdata = new bytes(length);
        assembly {
            source := add(start, data)

            for {let i := si} lt(i, slots) {i := add(i, 1)} {
                mstore(add(newdata, pos), mload(add(source, pos)))
                pos := add(pos, 32)
            }
            mstore(add(newdata, pos), shl(
                rest,
                shr(rest, mload(add(source, pos)))
            ))
        }
    }

    function getNibbles(bytes1 b) internal pure returns (bytes1 nibble1, bytes1 nibble2) {
        assembly {
                nibble1 := shr(4, b)
                nibble2 := shr(4, shl(4, b))
            }
    }

    function expandKeyEven(bytes memory data) internal pure returns (bytes memory) {
        uint256 length = data.length * 2;
        bytes memory expanded = new bytes(length);

        for (uint256 i = 0 ; i < data.length; i++) {
            (bytes1 nibble1, bytes1 nibble2) = getNibbles(data[i]);
            expanded[i * 2] = nibble1;
            expanded[i * 2 + 1] = nibble2;
        }
        return expanded;
    }

    function expandKeyOdd(bytes memory data) internal pure returns(bytes memory) {
        uint256 length = data.length * 2 - 1;
        bytes memory expanded = new bytes(length);
        expanded[0] = data[0];

        for (uint256 i = 1 ; i < data.length; i++) {
            (bytes1 nibble1, bytes1 nibble2) = getNibbles(data[i]);
            expanded[i * 2 - 1] = nibble1;
            expanded[i * 2] = nibble2;
        }
        return expanded;
    }
}
