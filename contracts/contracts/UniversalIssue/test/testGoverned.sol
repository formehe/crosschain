// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../governance/IGovernanceCapability.sol";
contract TestGoverned is IGovernanceCapability{
    function isSupportCapability(
        bytes memory action
    ) external pure override returns (bool) {
        return true;
    }
}