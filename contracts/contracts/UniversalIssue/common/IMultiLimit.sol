// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IMultiLimit{
    function forbiddens(uint256 chainId, bytes32 proofIndex) external view returns(bool);
}