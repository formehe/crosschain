// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/codec/TopProofDecoder.sol";
import "../../common/Deserialize.sol";
interface ITopProver {
    function verify( TopProofDecoder.Proof calldata proof, 
        Deserialize.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot,bytes32 blockHash) 
    external returns(bool valid, string memory reason);

    function getAddLightClientTime(uint64 height) external returns(uint256);
}