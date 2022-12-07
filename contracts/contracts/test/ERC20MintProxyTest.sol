// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Top/ERC20MintProxy.sol";

contract ERC20MintProxyTest is ERC20MintProxy{
    function _parseLog(
        bytes memory log
    ) internal override view returns (VerifiedEvent memory _receipt, address _contractAddress) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        //burn
        require(topics0 == 0xfbaa2af2805102bd1c30d2403521626bd712d23ea3cef9452ef78ef826ba2282, "invalid the function of topics");
        (_receipt.amount, _receipt.receiver, _receipt.decimals) = abi.decode(logInfo.data, (uint256, address, uint8));
        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }
}