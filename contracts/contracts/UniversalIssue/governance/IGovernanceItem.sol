// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IGovernanceItem {
    function supportNameSpace() external view returns (uint256 namespace);
    function supportItemList() external view returns (uint256[] memory items);
    function isSupportItem(uint256 itemId) external view returns (bool);
}