// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "hardhat/console.sol";

contract AdminControlledUpgradeable is Initializable,AccessControl {
    uint public paused;

    //keccak256("OWNER.ROLE");
    bytes32 constant OWNER_ROLE = 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6;
    //keccak256("ADMIN.ROLE");
    bytes32 constant ADMIN_ROLE = 0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c;
    //keccak256("CONTROLLED.ROLE")
    bytes32 constant CONTROLLED_ROLE = 0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de;
    //keccak256("BLACK.ROLE")
    bytes32 constant BLACK_ROLE = 0xfb47a4753d25ec0f8c1b28af2736043b542a783458d15c76337d12de4bc914b3;
    //keccak256("BLACK.BURN.ROLE")
    bytes32 constant BLACK_BURN_ROLE = 0x644464d9d2566ad56a676295c65afc4dcee3d72dac5acd473e78e531f06e0bce;
    //keccak256("BLACK.MINT.ROLE")
    bytes32 constant BLACK_MINT_ROLE = 0xd4e43efef4d741d853f42cbb6ea70c0f7d0e722b28b900128e3706c76762edc8;
    //keccak256("DAO.ADMIN.ROLE");
    bytes32 constant DAO_ADMIN_ROLE = 0xba89994fffa21b6259d0e98b52260f21bc06a07249825a4125b51c20e48d06ff;

    function _AdminControlledUpgradeable_init(address _admin, uint flags) internal onlyInitializing {
        _grantRole(CONTROLLED_ROLE, _admin);
        paused = flags;
    }

    modifier pausable(uint flag) {
        require(isPause(flag) || hasRole(CONTROLLED_ROLE,msg.sender),"has been pause");
        _;
    }

    function isPause(uint flag) internal view returns(bool){
        return (paused & flag) == 0;
    }
    
    function adminPause(uint flags) public onlyRole(CONTROLLED_ROLE) {
        paused = flags;
    }

    function renounceRole(bytes32 /*role*/, address /*account*/) public pure override {
        require(false, "not support");
    }

    modifier accessable_and_unpauseable(bytes32 role_, uint pause_) {
        require(!hasRole(role_,_msgSender()) && ((paused & pause_) == 0) ,"no permit");
        _;
    }
}
