// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./ITopProve.sol";
import "../../../lib/lib/MPT.sol";
//import "hardhat/console.sol";

contract TopProve is ITopProve{
    using MPT for MPT.MerkleProof;
    address public bridgeLight;

    constructor(address _bridgeLight) {
        bridgeLight = _bridgeLight;
    }

    function verify(
        EthProofDecoder.Proof calldata proof, 
        EthereumDecoder.TransactionReceiptTrie calldata receipt, 
        EthereumDecoder.BlockHeader calldata header
    ) external override returns (bool valid, string memory reason) {
        
        require((keccak256(proof.logEntryData) == keccak256(EthereumDecoder.getLog(receipt.logs[proof.logIndex]))), "Log is not found");

        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = header.receiptsRoot;
        merkleProof.proof = proof.proof;
        merkleProof.expectedValue = proof.reciptData; 
        bytes memory actualKey = RLPEncode.encodeUint(proof.reciptIndex);

        bytes memory key = new bytes(actualKey.length << 1);
        uint j;
        for (uint i = 0; i < actualKey.length; i++) {
            key[j] = actualKey[i] >> 4;
            j += 1;
            key[j] = actualKey[i] & 0x0f;
            j += 1;
        }
        merkleProof.key = key;
        valid = merkleProof.verifyTrieProof();
        require(valid, "Fail to verify");
        // 调用系统合约验证块头
        // bytes memory payload = abi.encodeWithSignature("getHeaderIfHeightConfirmed(bytes, uint64)", proof.headerData, 2);
        // (bool success, bytes memory returnData) = bridgeLight.call(payload);
        // require(success, "Height is not confirmed");

        // (success) = abi.decode(returnData, (bool));
        // require(success, "fail to decode");
        return (true, "");
    }
}