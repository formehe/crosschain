// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "./AdminControlledUpgradeable1.sol";

abstract contract TransferedQuotas is AdminControlledUpgradeable1{
    struct Quota{
        uint256 maxTransferedToken;
        uint256 minTransferedToken;
    }

    mapping(address => Quota) public tokenQuotas;

    function bindTransferedQuota(
        address _asset, 
        uint256 _minTransferedToken, 
        uint256 _maxTransferedToken
    ) public onlyRole(AdminControlledUpgradeable1.CONTROLLED_ROLE) {
        require(_maxTransferedToken >= _minTransferedToken, "the max quantity of permitted transfer token is less than the min");
        tokenQuotas[_asset].maxTransferedToken = _maxTransferedToken;
        tokenQuotas[_asset].minTransferedToken = _minTransferedToken;
    }

    function getTransferedQuota(
        address _asset
    ) public view returns(uint256 _minTransferedToken, uint256 _maxTransferedToken) {
        _minTransferedToken = tokenQuotas[_asset].minTransferedToken;
        _maxTransferedToken = tokenQuotas[_asset].maxTransferedToken;
    }

    function checkTransferedQuota(
        address _asset,
        uint256 _amount
    ) internal view {
       Quota memory  quota = tokenQuotas[_asset];
       require(_amount >= quota.minTransferedToken, "the amount of transfered is overflow");
       require(_amount <= quota.maxTransferedToken, "the amount of transfered is overflow");
    }
}