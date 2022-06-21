// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface ILimit{
    function getTransferedQuota(
        address _asset
    ) external view returns(uint256 _minTransferedToken, uint256 _maxTransferedToken);

    function checkTransferedQuota(
        address _asset,
        uint256 _amount
    ) external view;
   
    function getFrozen(
        address _asset
    ) external view returns(uint);

    function checkFrozen(
        address _asset, 
        uint _timestamp
    ) external view;

    function forbiddens(bytes32 proofIndex) external view returns(bool);

}

