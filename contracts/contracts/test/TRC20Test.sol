// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Top/TRC20.sol";
import "../common/ILimit.sol";

contract TRC20Test is TRC20{
  constructor (
        IEthProver _prover,
        address _peerProxyHash,
        address _peerAssetHash,
        uint64 _minBlockAcceptanceHeight,
        string memory _name,
        string memory _symbol,
        address _owner,
        ILimit _limiter
    ) TRC20(_prover, _peerProxyHash,_peerAssetHash,_minBlockAcceptanceHeight,_name,_symbol, _owner, _limiter) {}


    function _parseLog(
        bytes memory log
    ) internal override pure returns (VerifiedEvent memory _receipt, address _contractAddress) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        require(topics0 == 0xfbaa2af2805102bd1c30d2403521626bd712d23ea3cef9452ef78ef826ba2282, "invalid the function of topics");
        (_receipt.amount, _receipt.receiver, _receipt.decimals) = abi.decode(logInfo.data, (uint256, address, uint8));
        _receipt.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        _receipt.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        _receipt.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        _contractAddress = logInfo.contractAddress;
    }
}
   
