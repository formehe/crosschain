// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface ITopBridge {
    
    event BlockHashAdded(uint64 indexed height, bytes32 blockHash);
    event BlockHashReverted(uint64 indexed height, bytes32 blockHash);

    // function deposit() external payable;

    // function withdraw() external;

    function initWithBlock(bytes calldata data) external;

    function addLightClientBlocks(bytes calldata data) external;

}