// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimeController is TimelockController {
    constructor (uint256 minDelay, address[] memory proposers, address[] memory executors) TimelockController(minDelay, proposers, executors){

    }

    function renounceRole(bytes32 /*role*/, address /*account*/) public pure override {
        require(false, "not support");
    }
}