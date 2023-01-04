// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimeController is TimelockController {
    constructor (uint256 minDelay, address[] memory proposers, address[] memory executors) TimelockController(minDelay, proposers, executors){
        for (uint256 i = 0; i < proposers.length; ++i) {
            require(proposers[i] != address(0), "proposer can not be zero");
        }

        for (uint256 i = 0; i < executors.length; ++i) {
            require(executors[i] != address(0), "executor can not be zero");
        }
    }

    function renounceRole(bytes32 /*role*/, address /*account*/) public pure override {
        require(false, "not support");
    }
}