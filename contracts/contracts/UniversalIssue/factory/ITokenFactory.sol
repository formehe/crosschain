// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

abstract contract ITokenFactory is Initializable {
    address templateCode;
    constructor(address code) {
        templateCode = code;
    }

    function clone(uint256 chainId, bytes memory rangeOfIssue, uint256 saltId, address minter) external returns(address){
        address predictAddr = Clones.predictDeterministicAddress(templateCode, bytes32(saltId));
        if (Address.isContract(predictAddr)) {
            return predictAddr;  
        } 
        console.logAddress(predictAddr);
        address code = Clones.cloneDeterministic(templateCode, bytes32(saltId));
        console.logAddress(code);
        

        initialize(chainId, code, rangeOfIssue, minter);
        return code;
    }

    function initialize(uint256 chainId, address code, bytes memory rangeOfIssue, address minter) internal virtual initializer{
    }

    function issue(bytes memory issueInfo) external view virtual returns(bytes memory, uint256[] memory);
}