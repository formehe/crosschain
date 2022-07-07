// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

contract Limit is AccessControl{
    //keccak256("OWNER.ROLE");
    bytes32 constant public OWNER_ROLE = 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6;
    //keccak256("FORBIDEN.ROLE");
    bytes32 constant public FORBIDEN_ROLE = 0x3ae7ceea3d592ba264a526759c108b4d8d582ba37810bbb888fcee6f32bbf04d;

    struct Quota{
        uint256 maxTransferedToken;
        uint256 minTransferedToken;
    }

    mapping(address => Quota) public tokenQuotas;
    mapping(bytes32 => bool) public forbiddens;
    mapping(address => uint) public tokenFrozens; // unit is seconds
    uint public constant MAX_FROZEN_TIME = 15_552_000; //180 days

    constructor(){
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(FORBIDEN_ROLE, OWNER_ROLE);
        _grantRole(OWNER_ROLE,_msgSender());
        _grantRole(FORBIDEN_ROLE,_msgSender());
    }

    function bindTransferedQuota(
        address _asset, 
        uint256 _minTransferedToken, 
        uint256 _maxTransferedToken
    ) external onlyRole(OWNER_ROLE) {
        require(_maxTransferedToken > _minTransferedToken, "max quantity of permitted token is less than the min");
        tokenQuotas[_asset].maxTransferedToken = _maxTransferedToken;
        tokenQuotas[_asset].minTransferedToken = _minTransferedToken;
    }

    function getTransferedQuota(
        address _asset
    ) external view returns(uint256 _minTransferedToken, uint256 _maxTransferedToken) {
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
    ) external onlyRole(FORBIDEN_ROLE) {
        require(forbiddens[_forbiddenId] == false, "id has been already forbidden");
        forbiddens[_forbiddenId] = true;
    }

    function recover(
        bytes32 _forbiddenId
    ) external onlyRole(FORBIDEN_ROLE) {
        require(forbiddens[_forbiddenId], "id has not been forbidden");
        forbiddens[_forbiddenId] = false;
    }

    function bindFrozen(
        address _asset, 
        uint _frozenDuration
    ) external onlyRole(OWNER_ROLE){
        require(_frozenDuration <= MAX_FROZEN_TIME, "freezon duration can not over 180 days");
        tokenFrozens[_asset] = _frozenDuration;
    }

    function getFrozen(
        address _asset
    ) external view returns(uint) {
        return tokenFrozens[_asset];
    }

    function checkFrozen(
        address _asset, 
        uint _timestamp
    ) external view returns(bool) {
        return block.timestamp >= _timestamp + tokenFrozens[_asset];
    }
}