// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "./IEthProver.sol";
import "../../../lib/lib/MPT.sol";
import "../../common/prover/Prover.sol";
//import "hardhat/console.sol";

contract EthProver is Prover, IEthProver{
    constructor(address _bridgeLight)
    Prover(_bridgeLight) {}
      
    using MPT for MPT.MerkleProof;
    function verify(
        EthProofDecoder.Proof calldata proof, 
        EthereumDecoder.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot,
        bytes32 blockHash
    ) external override returns (bool valid, string memory reason) {
        
        _verify(proof.logIndex,proof.logEntryData,proof.reciptIndex,proof.reciptData,proof.proof,receipt, receiptsRoot);
        // 调用系统合约验证块头
        bytes memory payload = abi.encodeWithSignature("is_confirmed(bytes32)", blockHash);
        (bool success, bytes memory returnData) = bridgeLight.call(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }
}