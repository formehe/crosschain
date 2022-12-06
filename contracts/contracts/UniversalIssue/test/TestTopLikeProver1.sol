// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../prover/TopLikeProver.sol";
import "../../common/codec/TopProofDecoder.sol";
import "../../common/Deserialize.sol";
contract TestTopLikeProver1 is IProver{
    using Borsh for Borsh.Data;
    using TopProofDecoder for Borsh.Data;

    constructor(address bridge_) IProver(bridge_) {}
    bool success = true;

    function verify(
        bytes calldata proofData
    ) external override view returns(bool valid, bytes32 blockHash, uint256 receiptIndex, uint256 time) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        TopProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();
        
        Deserialize.LightClientBlock memory header = Deserialize.decodeMiniLightClientBlock(proof.headerData);
  
        return (success, header.block_hash, proof.reciptIndex, 0);
    }

    function set(
        bool success_
    ) external {
        success = success_;
    }
}