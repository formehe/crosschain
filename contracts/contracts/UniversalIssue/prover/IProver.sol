// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IProver {
    function verify(bytes calldata proof) external returns(bool valid, string memory reason);
}