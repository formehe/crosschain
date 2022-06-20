// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./AdminControlledUpgradeable.sol";
abstract contract ForbiddenRecorder is AdminControlledUpgradeable{
    mapping(bytes32 => bool) public forbiddens;

    function forbiden(
        bytes32 _forbiddenId
    ) public onlyRole(OWNER_ROLE) {
        require(forbiddens[_forbiddenId] == false, "the id has been already forbidden");
        forbiddens[_forbiddenId] = true;
    }

    function recover(
        bytes32 _forbiddenId
    ) public onlyRole(OWNER_ROLE) {
        require(forbiddens[_forbiddenId], "the id has not been forbidden");
        forbiddens[_forbiddenId] = false;
    }
}