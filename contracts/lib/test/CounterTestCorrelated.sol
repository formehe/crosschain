// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// Used to mimic a Counter contract with the same address, on 2 chains
// Syncing state transaction goes through a proxy
contract CounterTestCorrelated {
    int32 public count = 5;
    address public proxy;

    event LogChange(bytes message);

    constructor(address _proxy) {
        proxy = _proxy;
    }

    function incrementCounter(int32 value) public {
        require(msg.sender == proxy, "invalid msg.sender");
        count += value;
        emit LogChange(abi.encodePacked("Counter is now: ", count));
    }

    function decrementCounter(int32 value) public {
        require(msg.sender == proxy, "invalid msg.sender");
        count -= value;
        emit LogChange(abi.encodePacked("Counter is now: ", count));
    }

    function getCounter() view public returns(int32) {
        return count;
    }

    function resetCounter(int32 value) payable public {
        require(msg.sender == proxy, "invalid msg.sender");
        count = value;
        emit LogChange(abi.encodePacked("Counter is reset!"));
    }
}
