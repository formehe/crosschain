// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract ITokenFactory is Initializable {
    address templateCode;
    constructor(address code) {
        templateCode = code;
    }

    function clone(uint256 chainId, bytes memory rangeOfIssue, uint256 saltId) external returns(address){
        address code = Clones.cloneDeterministic(templateCode, bytes32(saltId));
        initialize(chainId, code, rangeOfIssue);
        return code;
    }

    function initialize(uint256 chainId, address code, bytes memory rangeOfIssue) internal virtual initializer{
    }

    function issue(bytes memory issueInfo) external view virtual returns(bytes memory, uint256[] memory);
}