// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

contract HeaderSync {
    address public bridgeLight;

    constructor(address _bridgeLight) {
        bridgeLight = _bridgeLight;
    }

    function initGenesisHeader(bytes memory genesis, string memory emitter) public returns (bool success) {
        bytes memory payload = abi.encodeWithSignature("init_genesis_block_header(bytes, string)", genesis, emitter);
        (success,) = bridgeLight.call(payload);
        require (success);
    }

    function syncBlockHeader(bytes memory blockHeader) public returns (bool success) {
        bytes memory payload = abi.encodeWithSignature("sync_block_header(bytes)", blockHeader);
        (success,) = bridgeLight.call(payload);
        require (success);
    }

    function getCurrentBlockHeight(uint64 chainId) public returns (uint64 height) {
        bytes memory payload = abi.encodeWithSignature("getCurrentHeightOfMainChain(uint64)", chainId);
        bool success = false;
        bytes memory returnData;
        (success, returnData) = bridgeLight.call(payload);
        require(returnData.length >= height + 32);
        assembly {
            height := mload(add(returnData, 0x20))
        }
        require (success);
    }

    function getBlockBashByHeight(uint64 chainId, uint64 height) public returns (bytes memory hashcode) {
        bytes memory payload = abi.encodeWithSignature("getHashOfMainChainByHeight(uint64, uint64)", chainId, height);
        bool success = false;
        (success, hashcode) = bridgeLight.call(payload);
        require (success);
    }
}