// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

interface ITokenLocker {
    function lockToken(address fromToken,uint256 amount, address receiver) payable external;
    function unlockToken(bytes memory proofData, uint64 proofBlockHeight) payable external;
}