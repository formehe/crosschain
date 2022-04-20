// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library BurnEvent {
    event Burned (
        uint128 amount,
        address token
    );

    struct BurnEventData {
        // address unLocker;
        uint256 amount;
        address token;
        address recipient;
    }

    function parse(bytes memory data)
    internal
    pure
    returns (BurnEventData memory burnEvent)
    {
        (burnEvent.amount, burnEvent.token, burnEvent.recipient) = abi.decode(data, (uint256, address, address));
    }
}