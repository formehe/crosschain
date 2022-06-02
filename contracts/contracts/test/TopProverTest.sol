// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Eth/prover/TopProver.sol";

contract TopProverTest is TopProver{
    constructor(address _bridgeLight)
    TopProver(_bridgeLight) {}

    function verifyHeight(uint64 height) public returns(bool valid, string memory reason){
        // 调用系统合约验证块头
        bytes memory payload = abi.encodeWithSignature("blockHashes(uint64)", height);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");
        require(returnData.length > 0, "Height is not confirmed1");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }

}