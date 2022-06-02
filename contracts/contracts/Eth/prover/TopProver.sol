// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/prover/Prover.sol";
import "./ITopProver.sol";
import "../../../lib/lib/MPT.sol";
//import "hardhat/console.sol";

contract TopProver is Prover, ITopProver{

    constructor(address _bridgeLight)
    Prover(_bridgeLight) {}
      
    using MPT for MPT.MerkleProof;
    function verify(
        EthProofDecoder.Proof calldata proof, 
        EthereumDecoder.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot,bytes32 hash
    ) external override returns (bool valid, string memory reason) {
        
        _verify(proof, receipt, receiptsRoot);
        // 调用系统合约验证块头
        bytes memory payload = abi.encodeWithSignature("blockHashes(bytes32)", hash);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }
}