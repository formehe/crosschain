// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/Borsh.sol";
// import "hardhat/console.sol";

library EthProofDecoder {
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    struct Proof {
        uint64 logIndex;
        bytes logEntryData;
        uint64 reciptIndex;
        bytes reciptData;
        bytes headerData;
        bytes[] proof;
    }

    function decode(Borsh.Data memory data) internal pure returns (Proof memory proof) {
        proof.logIndex = data.decodeU64();
        proof.logEntryData = data.decodeBytes();
        proof.reciptIndex = data.decodeU64();
        proof.reciptData = data.decodeBytes();
        proof.headerData = data.decodeBytes();
        uint32 length = data.decodeU32();
        proof.proof = new bytes[](length);
        for (uint i = 0; i < length; i++) {
            proof.proof[i] = data.decodeBytes();
        }
    }
}
