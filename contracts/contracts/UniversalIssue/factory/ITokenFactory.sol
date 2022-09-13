// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

abstract contract ITokenFactory is Initializable {
    address templateCode;
    address contractor;
    constructor(address code_, address contractor_) {
        templateCode = code_;
        contractor = contractor_;
    }

    function clone(uint256 chainId, bytes memory rangeOfIssue, uint256 saltId, address minter) external returns(address){
        require(msg.sender == contractor, "caller is not permit");

        address predictAddr = Clones.predictDeterministicAddress(templateCode, bytes32(saltId));
        if (Address.isContract(predictAddr)) {
            return predictAddr;  
        }

        address code = Clones.cloneDeterministic(templateCode, bytes32(saltId));        
        initialize(chainId, code, rangeOfIssue, minter);
        return code;
    }

    function initialize(uint256 chainId, address code, bytes memory rangeOfIssue, address minter) internal virtual;
    function issue(bytes memory issueInfo) external view virtual returns(bytes memory, uint256[] memory);
    function expand(address contractCode, uint256 peerChainId, address issuer) external view virtual returns(bytes memory);
}