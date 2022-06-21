// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Eth/bridge/TopBridge.sol";

contract TopPridgeTest is TopBridge{
    using RLPDecode for bytes;
    using RLPDecode for uint;
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;

    
    /// @dev Parse a single
    function decodeLightClientBlock(bytes memory data) view public returns(TopDecoder.LightClientBlock memory){
        TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);
        //TopDecoder.LightClientBlock memory topBlock;
         return topBlock;
    }

    
    /// @dev Parsing multiple
    function decodeLightClientBlocks(bytes memory rlpBytes) view public returns(TopDecoder.LightClientBlock[] memory){
        TopDecoder.LightClientBlock[] memory clientBlocks = new TopDecoder.LightClientBlock[](10);
        RLPDecode.Iterator memory it = rlpBytes.toRlpItem().iterator();
        uint j = 0;
        while (it.hasNext()) {
            TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(it.next().toBytes());
            clientBlocks[j] = topBlock;
            j = j + 1;
        }
        return clientBlocks;
    }

    /// @dev add block
    function addLightClientBlockTest(bytes memory data) public{
        require(initialized, "Contract is not initialized");
        addLightClientBlock(data);
    }

    function getEpochs() public view returns(Epoch[] memory){
        Epoch[] memory returnEpochs = new Epoch[](epochs.length);
        for(uint i = 0; i < epochs.length; i++){
           Epoch memory epoch;
           epoch.epochId = epochs[i].epochId;
           epoch.keys = epochs[i].keys;
           epoch.numBPs = epochs[i].numBPs;
           epoch.packedStakes = epochs[i].packedStakes;
           epoch.stakeThreshold = epochs[i].stakeThreshold;
           returnEpochs[i] = epoch;
        }
        return returnEpochs;
    } 

    function addEpochsTest(bytes memory data) public{
        TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);
        setBlockProducers(topBlock.next_bps.blockProducers, topBlock.next_bps.epochId, topBlock.inner_lite.height);
    }

    function getValidationEpochTest(uint64 epochId) public view returns(Epoch memory epoch){
        uint cnt = epochs.length;
        for (uint i = cnt-1; i >= 0; i--) {
            if(epochs[i].epochId == epochId){
                epoch = epochs[i];
                break;
            }
        }
        return epoch;
    }

    function checkValidatorSignatureTest(
        bytes32 block_hash,
        bytes32 r,bytes32 s,uint8 v,
        uint256 x,uint256 y
    ) internal pure returns(bool) {
        return ecrecover(
            block_hash,
            v + (v < 27 ? 27 : 0),
            r,
            s
        ) == address(uint160(uint256(keccak256(abi.encodePacked(x,y)))));
    }

    function setBlockHashes(bytes32 _hash,bool _bool) public{
        blockHashes[_hash] = _bool;
    }

    function setBlockHeights(uint64 height,uint256 time) public{
        blockHeights[height] = time;
    }

}