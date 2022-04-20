// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../bridge/INearBridge.sol";

abstract contract NearBridgeMock is INearBridge {
    mapping(uint64 => bytes32) public override blockHashes;
    mapping(uint64 => bytes32) public override blockMerkleRoots;

    function setBlockMerkleRoot(uint64 blockNumber, bytes32 root) external {
        blockMerkleRoots[blockNumber] = root;
    }

    function setBlockHash(uint64 blockNumber, bytes32 hash) external {
        blockHashes[blockNumber] = hash;
    }

    function balanceOf(address) external pure override returns (uint256) {
        return 0;
    }

    function deposit() external payable override {}

    function withdraw() external override {}

    function addLightClientBlock(bytes calldata) external override {}
}
