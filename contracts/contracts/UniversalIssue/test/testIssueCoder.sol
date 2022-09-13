// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../common/IssueCoder.sol";
import "hardhat/console.sol";

contract testIssueCoder {
    constructor(){

    }

    function encodeCirculationRangeOfRights(IssueCoder.RightRange[] memory rangeOfRights) public view returns(bytes memory) {
        bytes memory returnValue = IssueCoder.encodeCirculationRangeOfRights(rangeOfRights);
        return returnValue;
    }

    function encodeIssueInfo(IssueCoder.IssueInfo memory issueInfo) public view returns(bytes memory){
        bytes memory returnValue = IssueCoder.encodeIssueInfo(issueInfo);
        return returnValue;
    }

    function encodeCirculationOfChains(IssueCoder.CirculationPerChain[] memory chains) public view returns(bytes memory) {
        bytes memory returnValue = IssueCoder.encodeCirculationOfChains(chains);
        return returnValue;
    }

    function decodeIssueInfo(bytes memory issue) public view returns(IssueCoder.IssueInfo memory issueInfo) {
        return IssueCoder.decodeIssueInfo(issue);
    }
}
