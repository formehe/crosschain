// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
//import "hardhat/console.sol";

contract MultiLimit is AccessControl{
    //keccak256("OWNER.ROLE");
    bytes32 constant private OWNER_ROLE = 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6;
    //keccak256("FORBIDEN.ROLE");
    bytes32 constant private FORBIDEN_ROLE = 0x3ae7ceea3d592ba264a526759c108b4d8d582ba37810bbb888fcee6f32bbf04d;
    //keccak256("ADMIN.ROLE");
    bytes32 constant ADMIN_ROLE = 0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c;

    event MultiChainTxForbidden (
        uint256 chainId,
        bytes32 forbiddenId
    );

    event MultiChainTxRecovered (
        uint256 chainId,
        bytes32 forbiddenId
    );

    mapping(uint256 => mapping(bytes32 => bool)) public forbiddens;

    constructor(address owner){
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        
        _setRoleAdmin(FORBIDEN_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, owner);
        _grantRole(ADMIN_ROLE,_msgSender());
    }

    function forbiden(
        uint256 _chainId,
        bytes32 _forbiddenId
    ) external onlyRole(FORBIDEN_ROLE) {
        require(forbiddens[_chainId][_forbiddenId] == false, "id has been already forbidden");
        forbiddens[_chainId][_forbiddenId] = true;
        emit MultiChainTxForbidden(_chainId, _forbiddenId);
    }

    function recover(
        uint256 _chainId,
        bytes32 _forbiddenId
    ) external onlyRole(FORBIDEN_ROLE) {
        require(forbiddens[_chainId][_forbiddenId], "id has not been forbidden");
        forbiddens[_chainId][_forbiddenId] = false;
        emit MultiChainTxRecovered(_chainId, _forbiddenId);
    }
}