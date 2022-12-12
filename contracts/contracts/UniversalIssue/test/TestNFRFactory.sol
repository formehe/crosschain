// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

contract TestNFRFactory {
    address proxy;
    function initialize(address proxy_) external{
        proxy = proxy_;
    }

    function issue(
        bytes calldata issueInfo_
    ) external returns(bytes memory issueInfo, uint256[] memory chains){
        bytes memory payload = abi.encodeWithSignature("issue(bytes)", issueInfo_);
        (bool success, bytes memory returnData) = proxy.call(payload);
        if (!success) {
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }

        (issueInfo, chains) = abi.decode(returnData,(bytes,uint256[]));
    }

    function clone(
        uint256 chainId,
        bytes calldata rangeOfIssue,
        uint256 saltId,
        address minter
    ) external returns(address asset) {
        bytes memory payload = abi.encodeWithSignature("clone(uint256,bytes,uint256,address)", chainId,rangeOfIssue,saltId,minter);
        (bool success, bytes memory returnData) = proxy.call(payload);
        if (!success) {
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }

        (asset) = abi.decode(returnData,(address));
    }

    function expand(
        address contractCode,
        uint256 peerChainId,
        address issuer
    ) external returns(bytes memory expandInfo) {
        bytes memory payload = abi.encodeWithSignature("expand(address,uint256,address)", contractCode, peerChainId, issuer);
        (bool success, bytes memory returnData) = proxy.call(payload);
        if (!success) {
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }

        (expandInfo) = abi.decode(returnData,(bytes));
    }
}