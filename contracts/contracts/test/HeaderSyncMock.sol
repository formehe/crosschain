// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract HeaderSyncMock{
    constructor() {
    }

    bool isSuccess = true;

    function set(bool success_) external {
        isSuccess = success_;
    }
    
    function is_confirmed(uint256 , bytes32 ) public view returns (bool success) {
        return isSuccess;
    }
}