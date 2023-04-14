// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Dao/TimeController.sol";

contract TimeControllerTest is TimeController {
    constructor (uint256 minDelay) TimeController(minDelay) {
    }

    function _TimeControllerTest_initialize(
        address _caller,
        uint256 _lowDelayThreshold,
        uint256 _upDelayThreshold
    ) external initializer {
        upDelayThreshold = _upDelayThreshold;
        lowDelayThreshold = _lowDelayThreshold;
        _setupRole(PROPOSER_ROLE, _caller);
	    _setupRole(EXECUTOR_ROLE, _caller);
    }
}