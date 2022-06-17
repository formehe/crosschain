// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Top/ERC20MintProxy.sol";

contract ERC20MintProxyTest is ERC20MintProxy{
    function _parseLog(
        bytes memory log
    ) internal override view returns (VerifiedEvent memory _receipt, address _contractAddress) {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        require(topics0 == 0x4f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842, "invalid the function of topics");
        (_receipt.amount, _receipt.receiver) = abi.decode(logInfo.data, (uint256, address));
        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }
}