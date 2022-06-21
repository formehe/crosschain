// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Eth/prover/TopProver.sol";

contract TopProverTest is TopProver{
    constructor(address _bridgeLight)
    TopProver(_bridgeLight) {}

    function verifyHash(bytes32 hash) public returns(bool valid, string memory reason){
        bytes memory payload = abi.encodeWithSignature("blockHashes(bytes32)", hash);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }

}