// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library LockEvent2 {
    event Locked (
        address indexed fromToken,
        address indexed toToken,
        uint64  toChainId,
        address indexed sender,
        uint256 amount,
        address recipient
    );

    struct LockEventData {
        address fromToken;
        address toToken;
        uint64  toChainId;
        address sender;
        uint256 amount;
        address recipient;
    }

    function parse(bytes memory data)
        internal
        pure
        returns (LockEventData memory lockEvent)
    {
        (lockEvent.toChainId, lockEvent.amount, lockEvent.recipient) = abi.decode(data, (uint64, uint256, address));
    }
}