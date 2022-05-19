// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "./AdminControlledUpgradeable.sol";

abstract contract Frozens is AdminControlledUpgradeable{
    uint public tokenFrozen; // unit is seconds
    uint public constant MAX_FROZEN_TIME = 15_552_000; //180 days

    function bindFrozen(
        uint _frozenDuration
    ) public onlyRole(AdminControlledUpgradeable.CONTROLLED_ROLE){
        require(_frozenDuration <= MAX_FROZEN_TIME, "freezon duration can not over 180 days");
        tokenFrozen = _frozenDuration;
    }

    function checkFrozen(
    uint _timestamp) internal view {
        require(block.timestamp >= (_timestamp + tokenFrozen), "the transaction is frozen");
    }
}