// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TRC20Upgradeable is ERC20PausableUpgradeable, AccessControlUpgradeable, OwnableUpgradeable{
    bytes32 public constant DEFAULT_OPERATION_ROLE = "0x01";

    function intialize(string memory _name, string memory _symbol, address _admin) external initializer {
        OwnableUpgradeable.__Ownable_init();
        AccessControlUpgradeable._setupRole(AccessControlUpgradeable.DEFAULT_ADMIN_ROLE, _admin);
        AccessControlUpgradeable._setupRole(DEFAULT_OPERATION_ROLE, _admin);
        AccessControlUpgradeable._setRoleAdmin(DEFAULT_OPERATION_ROLE, AccessControlUpgradeable.DEFAULT_ADMIN_ROLE);
        ERC20Upgradeable.__ERC20_init(_name, _symbol);
        ERC20PausableUpgradeable.__ERC20Pausable_init();
    }

    function mint(
        address account, 
        uint256 amount
    ) external whenNotPaused onlyRole(DEFAULT_OPERATION_ROLE) {
        super._mint(account, amount);
    }

    function burn(
        address account, 
        uint256 amount
    ) external whenNotPaused onlyRole(DEFAULT_OPERATION_ROLE) {
        super._burn(account, amount);
    }

    function pause() external onlyRole(getRoleAdmin(DEFAULT_OPERATION_ROLE)) {
        _pause();
    }

    function unpause() external onlyRole(getRoleAdmin(DEFAULT_OPERATION_ROLE)) {
        _unpause();
    }
}