// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Limit is Ownable{
    struct Quota{
        uint256 maxTransferedToken;
        uint256 minTransferedToken;
    }

    mapping(address => Quota) public tokenQuotas;
    mapping(bytes32 => bool) public forbiddens;
    mapping(address => uint) public tokenFrozens; // unit is seconds
    uint public constant MAX_FROZEN_TIME = 15_552_000; //180 days

    function bindTransferedQuota(
        address _asset, 
        uint256 _minTransferedToken, 
        uint256 _maxTransferedToken
    ) public onlyOwner {
        require(_maxTransferedToken > _minTransferedToken, "max quantity of permitted token is less than the min");
        tokenQuotas[_asset].maxTransferedToken = _maxTransferedToken;
        tokenQuotas[_asset].minTransferedToken = _minTransferedToken;
    }

    function getTransferedQuota(
        address _asset
    ) public view returns(uint256 _minTransferedToken, uint256 _maxTransferedToken) {
        _minTransferedToken = tokenQuotas[_asset].minTransferedToken;
        _maxTransferedToken = tokenQuotas[_asset].maxTransferedToken;
    }

    function checkTransferedQuota(
        address _asset,
        uint256 _amount
    ) external {
       Quota memory  quota = tokenQuotas[_asset];
       require(quota.maxTransferedToken != 0, "quota is not exist");
       require(_amount > quota.minTransferedToken, "amount of token is underflow");
       require(_amount <= quota.maxTransferedToken, "amount of token is overflow");
    }

    function forbiden(
        bytes32 _forbiddenId
    ) public onlyOwner {
        require(forbiddens[_forbiddenId] == false, "id has been already forbidden");
        forbiddens[_forbiddenId] = true;
    }

    function recover(
        bytes32 _forbiddenId
    ) public onlyOwner {
        require(forbiddens[_forbiddenId], "id has not been forbidden");
        forbiddens[_forbiddenId] = false;
    }

    function bindFrozen(
        address _asset, 
        uint _frozenDuration
    ) public onlyOwner{
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
        uint _timestamp
    ) external view returns(bool) {
        return block.timestamp >= _timestamp + tokenFrozens[_asset];
    }
}