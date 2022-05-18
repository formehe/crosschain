// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "./AdminControlledUpgradeable1.sol";

abstract contract Frozens is AdminControlledUpgradeable1{
    mapping(address => uint) public tokenFrozens; // unit is seconds
    uint public constant MAX_FROZEN_TIME = 15_552_000; //180 days

    function bindFrozen(
        address _asset, 
        uint _frozenDuration
    ) public onlyRole(AdminControlledUpgradeable1.CONTROLLED_ROLE){
        require(_frozenDuration <= MAX_FROZEN_TIME, "freezon duration can not over 180 days");
        tokenFrozens[_asset] = _frozenDuration;
    }

    function getFrozen(
        address _asset
    ) public view returns(uint) {
        return tokenFrozens[_asset];
    }

    function checkFrozen(
        address _asset, 
    uint _timestamp) internal view {
        require(block.timestamp >= (_timestamp + tokenFrozens[_asset]), "the transaction is frozen");
    }
}