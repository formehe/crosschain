// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract TimeController is TimelockController {
    uint256 constant public proposalMaxOperations = 10; // 10 actions
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

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override onlyRoleOrOpenRole(EXECUTOR_ROLE) {
        require(targets.length <=  proposalMaxOperations, "too many actions");
        for (uint256 i = 0; i < targets.length; i++) {
            require(Address.isContract(targets[i]), "invalid contract");
        }

        super.executeBatch(targets, values, datas, predecessor, salt);
    }

    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) public override onlyRole(PROPOSER_ROLE) {
        require(targets.length <=  proposalMaxOperations, "too many actions");
        for (uint256 i = 0; i < targets.length; i++) {
            require(Address.isContract(targets[i]), "invalid contract");
        }

        super.scheduleBatch(targets, values, datas, predecessor, salt, delay);
    }
}