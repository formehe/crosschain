// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/codec/EthProofDecoder.sol";
import "../../../lib/lib/EthereumDecoder.sol";
interface ITopProver {
    function verify(EthProofDecoder.Proof calldata proof, EthereumDecoder.TransactionReceiptTrie calldata receipt, bytes32 receiptsRoot,bytes32 hash) 
    external returns(bool valid, string memory reason);

    function getAddLightClientTime(uint64 height) external returns(uint256);
}