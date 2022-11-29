// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../prover/IProver.sol";
import "../../common/codec/EthProofDecoder.sol";
import "../../common/Deserialize.sol";
contract TestEthLikeProver is IProver{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    constructor(address bridge_) IProver(bridge_) {}

    function verify(
        bytes calldata proofData
    ) external override view returns(bool valid, bytes32 blockHash, uint256 receiptIndex, uint256 time) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        Deserialize.TransactionReceiptTrie memory receipt = Deserialize.toReceipt(proof.reciptData, proof.logIndex);
        Deserialize.BlockHeader memory header = Deserialize.toBlockHeader(proof.headerData);
        
        require((keccak256(proof.logEntryData) == keccak256(receipt.log)), "Log is not found");

        return (true, header.hash, proof.reciptIndex, 0);
    }
}