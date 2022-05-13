// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AdminControlledUpgradeable1 is Initializable,AccessControl {
    bytes32 constant public CONTROLLED_ADMIN_ROLE = keccak256("CONTROLLED_LOCK_ROLE");
    uint public paused;

    function _AdminControlledUpgradeable_init() internal onlyInitializing {
        _grantRole(CONTROLLED_ADMIN_ROLE, msg.sender);
    }

    modifier pausable(uint flag,bytes32 role) {
        require((paused & flag) == 0 || hasRole(role,msg.sender),"has been pause");
        _;
    }

    function adminPause(uint flags) public onlyRole(CONTROLLED_ADMIN_ROLE){
        paused = flags;
    }

    function adminSstore(uint key, uint value) public onlyRole(CONTROLLED_ADMIN_ROLE){
        assembly {
            sstore(key, value)
        }
    }

    function adminSstoreWithMask(
        uint key,
        uint value,
        uint mask
    ) public onlyRole(CONTROLLED_ADMIN_ROLE){
        assembly {
            let oldval := sload(key)
            sstore(key, xor(and(xor(value, oldval), mask), oldval))
        }
    }

    function adminSendEth(address payable destination, uint amount) public onlyRole(CONTROLLED_ADMIN_ROLE){
        destination.transfer(amount);
    }

    // function adminReceiveEth() public payable onlyAdmin {}

    function adminDelegatecall(address target, bytes memory data) public payable onlyRole(CONTROLLED_ADMIN_ROLE) returns (bytes memory) {
        (bool success, bytes memory rdata) = target.delegatecall(data);
        require(success);
        return rdata;
    }
}
