// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "hardhat/console.sol";

contract AdminControlledUpgradeable is Initializable,AccessControl {
    uint public paused;

    bytes32 constant public CONTROLLED_ROLE = keccak256("CONTROLLED_ROLE");
    bytes32 constant public OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 constant public WITHDRAWAL_ROLE = keccak256("WITHDRAWAL_ROLE");
    bytes32 constant public BLACK_BURN_ROLE = keccak256("BLACK.BURN.ROLE");
    bytes32 constant public BLACK_MINT_ROLE = keccak256("BLACK.MINT.ROLE");

    function _AdminControlledUpgradeable_init(address _admin, uint flags) internal onlyInitializing {
        _grantRole(CONTROLLED_ROLE, _admin);
        paused = flags;
    }

    modifier pausable(uint flag,bytes32 role) {
        require(isPause(flag) || hasRole(role,msg.sender),"has been pause");
        _;
    }

    function isPause(uint flag) internal view returns(bool){
        return (paused & flag) == 0;
    }
    
    function adminPause(uint flags) public onlyRole(CONTROLLED_ROLE) {
        paused = flags;
    }

    function adminSstore(uint key, uint value) public onlyRole(CONTROLLED_ROLE) {
        assembly {
            sstore(key, value)
        }
    }

    function adminSstoreWithMask(
        uint key,
        uint value,
        uint mask
    ) public onlyRole(CONTROLLED_ROLE) {
        assembly {
            let oldval := sload(key)
            sstore(key, xor(and(xor(value, oldval), mask), oldval))
        }
    }

    function adminSendEth(address payable destination, uint amount) public onlyRole(CONTROLLED_ROLE) {
        destination.transfer(amount);
    }

    // function adminReceiveEth() public payable onlyAdmin {}

    function adminDelegatecall(address target, bytes memory data) public payable onlyRole(CONTROLLED_ROLE) returns (bytes memory) {
        (bool success, bytes memory rdata) = target.delegatecall(data);
        require(success);
        return rdata;
    }
}
