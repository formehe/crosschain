// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../lib/EthereumDecoder.sol";

contract LightClientMock {
    mapping(uint256 => bytes32) public blockHashes;

    function getConfirmedBlockHash(uint256 number) view public returns (bytes32 hash) {
        return blockHashes[number];
    }

    function _addBlock(EthereumDecoder.BlockHeader memory header) public {
        blockHashes[header.number] = header.hash;
    }
}
