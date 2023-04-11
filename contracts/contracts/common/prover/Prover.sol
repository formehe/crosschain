// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../codec/EthProofDecoder.sol";
import "../Deserialize.sol";
import "../../../lib/lib/MPT.sol";
import "../../../lib/external_lib/RLPEncode.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
//import "hardhat/console.sol";

contract Prover is Initializable{
    using MPT for MPT.MerkleProof;
    address public bridgeLight;

    // constructor(address _bridgeLight) {
    //     bridgeLight = _bridgeLight;
    // }

    function _Prover_initialize(
        address _bridgeLight
    ) internal onlyInitializing{
        bridgeLight = _bridgeLight;
    } 

    function _verify(
        bytes memory logEntryData, 
        uint64 reciptIndex,
        bytes memory reciptData,
        bytes[] memory proof,
        Deserialize.TransactionReceiptTrie calldata receipt, 
        bytes32 receiptsRoot
    ) internal view {
        // console.logBytes(receipt.log);
        require((keccak256(logEntryData) == keccak256(receipt.log)), "Log is not found");

        MPT.MerkleProof memory merkleProof;
        merkleProof.expectedRoot = receiptsRoot;
        merkleProof.proof = proof;
        merkleProof.expectedValue = reciptData;
        bytes memory actualKey = RLPEncode.encodeUint(reciptIndex);

        bytes memory key = new bytes(actualKey.length << 1);
        uint j;
        for (uint i = 0; i < actualKey.length; i++) {
            key[j] = actualKey[i] >> 4;
            j += 1;
            key[j] = actualKey[i] & 0x0f;
            j += 1;
        }
        merkleProof.key = key;
        bool valid = merkleProof.verifyTrieProof();
        require(valid, "Fail to verify");
    }
}