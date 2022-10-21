// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IGovernanceCapability {
    function isSupportCapability(bytes32 classId, bytes32 subClass, bytes memory action) external view returns (bool);
}