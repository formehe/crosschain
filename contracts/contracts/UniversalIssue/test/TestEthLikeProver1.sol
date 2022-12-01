// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../prover/EthLikeProver.sol";
import "../../common/codec/EthProofDecoder.sol";
import "../../common/Deserialize.sol";
contract TestEthLikeProver1 is EthLikeProver{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    constructor(address bridge_) EthLikeProver(bridge_) {}

    function verifyTest(
        bytes calldata proofData
    ) external {
        super.verify(proofData);
    }
}