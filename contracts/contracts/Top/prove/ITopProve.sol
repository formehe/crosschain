// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface ITopProve {
    function verify(bytes calldata proofData) external returns(bool valid, string memory reason);
}