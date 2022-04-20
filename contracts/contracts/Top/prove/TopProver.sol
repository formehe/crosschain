// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./ITopProve.sol";
import "../codec/EthProofDecoder.sol";
import "../../../lib/lib/EthereumDecoder.sol";
import "../../../lib/lib/MPT.sol";
import "../../common/Borsh.sol";

contract TopProve is ITopProve{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;
    using MPT for MPT.MerkleProof;
    address public bridgeLight;

    constructor(address _bridgeLight) {
        bridgeLight = _bridgeLight;
    }

    function verify(bytes memory proofData) 
        external
        override 
        returns (bool valid, string memory reason) {

        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        EthereumDecoder.TransactionReceiptTrie memory receiptData = EthereumDecoder.toReceipt(proof.reciptData);
        require((keccak256(proof.logEntryData) == keccak256(EthereumDecoder.getLog(receiptData.logs[proof.logIndex]))), "Log is not found");

        EthereumDecoder.BlockHeader memory header = EthereumDecoder.toBlockHeader(proof.headerData);
        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = header.receiptsRoot;
        merkleProof.proof = proof.proof;
        merkleProof.expectedValue = proof.reciptData;
        merkleProof.key = RLPEncode.encodeUint(proof.reciptIndex);
        valid = merkleProof.verifyTrieProof();
        require(valid, "Fail to verify");
        // 调用系统合约验证块头
        bytes memory payload = abi.encodeWithSignature("getHeaderIfHeightConfirmed(bytes, uint64)", proof.headerData, 2);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }
}