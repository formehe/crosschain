// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/Borsh.sol";
// import "hardhat/console.sol";

library TopProofDecoder {
    using Borsh for Borsh.Data;
    using TopProofDecoder for Borsh.Data;

    struct Proof {
        uint64 logIndex;
        bytes logEntryData;
        uint64 reciptIndex;
        bytes reciptData;
        bytes headerData;
        bytes[] reciptProof;

        uint64 blockIndex;
        uint64 polyBlockHeight;
        bytes[] blockProof;  
    }

    function decode(Borsh.Data memory data) internal pure returns (Proof memory proof) {
        proof.logIndex = data.decodeU64();
        proof.logEntryData = data.decodeBytes();
        proof.reciptIndex = data.decodeU64();
        proof.reciptData = data.decodeBytes();
        proof.headerData = data.decodeBytes();

        uint32 recipLength = data.decodeU32();
        proof.reciptProof = new bytes[](recipLength);
        for (uint i = 0; i < recipLength; i++) {
            proof.reciptProof[i] = data.decodeBytes();
        }
        proof.blockIndex = data.decodeU64();
        proof.polyBlockHeight = data.decodeU64();
        uint32 blockLength = data.decodeU32();
        proof.blockProof = new bytes[](blockLength);
        for (uint i = 0; i < blockLength; i++) {
            proof.blockProof[i] = data.decodeBytes();
        }

    }

}
