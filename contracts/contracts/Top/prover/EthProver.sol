// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "./IEthProver.sol";
import "../../../lib/lib/MPT.sol";
import "../../common/prover/Prover.sol";
//import "hardhat/console.sol";

contract EthProver is Prover, IEthProver{
    // constructor(address _bridgeLight)
    // Prover(_bridgeLight) {}
    function _EthProver_initialize(
        address _bridgeLight
    ) external initializer {
        _Prover_initialize(_bridgeLight);
    }
    using MPT for MPT.MerkleProof;
    function verify(
        EthProofDecoder.Proof calldata proof, 
        Deserialize.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot,
        bytes32 blockHash,
        uint256 height
    ) external override returns (bool valid, string memory reason) {
        
        _verify(proof.logEntryData,proof.reciptIndex,proof.reciptData,proof.proof,receipt, receiptsRoot);
        // 调用系统合约验证块头
        bytes memory payload = abi.encodeWithSignature("is_confirmed(uint256,bytes32)", height, blockHash);
        (bool success, bytes memory returnData) = bridgeLight.staticcall(payload);
        require(success, "Height is not confirmed");

        (success) = abi.decode(returnData, (bool));
        require(success, "fail to decode");
        return (true, "");
    }
}