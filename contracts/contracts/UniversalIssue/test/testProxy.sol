// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

contract TestProxy {
    address proxy;
    constructor(address proxy_){
        proxy = proxy_;
    }

    function bindAssetGroup(
        address asset,
        uint256 contractGroupId,
        address templateCode
    ) external {
        bytes memory payload = abi.encodeWithSignature("bindAssetGroup(address,uint256,address)", asset, contractGroupId, address(templateCode));
        (bool success, bytes memory returnData) = proxy.call(payload);
        if (!success) {
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }
    }

    function bindAssetProxyGroup(
        address asset,
        uint256 chainId,
        uint256 contractGroupId,
        address templateCode
    ) external {
        bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256,address)", asset, chainId, contractGroupId, address(templateCode));
        (bool success, bytes memory returnData) = proxy.call(payload);
        if (!success) {
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }
    }
}