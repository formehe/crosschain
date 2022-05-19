// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "./AdminControlledUpgradeable.sol";

abstract contract TransferedQuotas is AdminControlledUpgradeable{
    struct Quota{
        uint256 maxTransferedToken;
        uint256 minTransferedToken;
    }

    Quota public tokenQuota;

    function bindTransferedQuota(
        uint256 _minTransferedToken, 
        uint256 _maxTransferedToken
    ) public onlyRole(OWNER_ROLE) {
        require(_maxTransferedToken >= _minTransferedToken, "the max quantity of permitted transfer token is less than the min");
        tokenQuota.maxTransferedToken = _maxTransferedToken;
        tokenQuota.minTransferedToken = _minTransferedToken;
    }

    function checkTransferedQuota(
        uint256 _amount
    ) internal view {
       require(_amount >= tokenQuota.minTransferedToken, "the amount of transfered is overflow");
       require(_amount <= tokenQuota.maxTransferedToken, "the amount of transfered is overflow");
    }
}