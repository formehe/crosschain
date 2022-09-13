// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./IProver.sol";
import "../../common/codec/EthProofDecoder.sol";
import "../../common/Deserialize.sol";
contract EthLikeProver is IProver{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    constructor(address bridge_) IProver(bridge_) {}

    function verify( bytes calldata proofData) external override returns(bool valid, bytes32 proofIndex) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        Deserialize.TransactionReceiptTrie memory receipt = Deserialize.toReceipt(proof.reciptData, proof.logIndex);
        Deserialize.BlockHeader memory header = Deserialize.toBlockHeader(proof.headerData);
        
        require((keccak256(proof.logEntryData) == keccak256(receipt.log)), "Log is not found");
        _verify(proof.reciptIndex, proof.reciptData, proof.proof, header.receiptsRoot);
        
        // 调用系统合约验证块头
        bytes memory payload = abi.encodeWithSignature("is_confirmed(uint256,bytes32)", header.number, header.hash);
        (bool success, bytes memory returnData) = bridge.staticcall(payload);
        require(success, "height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        proofIndex = keccak256(reciptIndex);
        return (true, proofIndex);
    }
}