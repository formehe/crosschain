// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface ILimit{
    function checkTransferedQuota(
        address _asset,
        uint256 _amount
    ) external view returns(bool);
    
    function checkFrozen(
        address _asset, 
        uint _timestamp
    ) external view returns(bool);

    function forbiddens(bytes32 proofIndex) external view returns(bool);

}

