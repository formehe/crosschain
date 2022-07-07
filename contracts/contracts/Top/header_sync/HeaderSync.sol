// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

contract HeaderSync {
    address public bridgeLight;

    constructor(address _bridgeLight) {
        bridgeLight = _bridgeLight;
    }

    // function initGenesisHeader(bytes memory genesis) public view returns (bool success) {
    //     bytes memory payload = abi.encodeWithSignature("init(bytes,string)", genesis, "top-eth-bridge-precompile");
    //     (success,) = bridgeLight.call(payload);
    //     require (success);
    // }

    fallback() external {
        (bool success, bytes memory result) = bridgeLight.delegatecall(msg.data);
        require(success, string(result));
        assembly {
            return(add(result, 0x20), mload(result))
        }
    }

    function syncBlockHeader(bytes memory blockHeader) public returns (bool success) {
        bytes memory payload = abi.encodeWithSignature("sync(bytes)", blockHeader);
        (success,) = bridgeLight.call(payload);
        require (success);
    }

    function getCurrentBlockHeight() public returns (uint64 height) {
        bytes memory payload = abi.encodeWithSignature("get_height()");
        bool success = false;
        bytes memory returnData;
        (success, returnData) = bridgeLight.call(payload);
        require (success);
        (height) = abi.decode(returnData, (uint64));
    }

    function isHashConfrim(bytes32 hash) public returns(bool){
        bytes memory payload = abi.encodeWithSignature("is_confirmed(bytes32)", hash);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");
        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return true;
    }

}