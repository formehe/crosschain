// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ProxyRegistry is AccessControl {
    address public proxy;

    //keccak256("OWNER.ROLE");
    bytes32 constant OWNER_ROLE = 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6;
    //keccak256("ADMIN.ROLE");
    bytes32 constant ADMIN_ROLE = 0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c;

    constructor(address proxy_, address owner_) {
        require(proxy_ != address(0), "invalid address");
        proxy = proxy_;
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function update(address proxy_) external onlyRole(ADMIN_ROLE) {
        require(proxy_ != address(0), "invalid address");
        proxy = proxy_;
    }

    function renounceRole(bytes32 /*role*/, address /*account*/) public pure override {
        require(false, "not support");
    }
}