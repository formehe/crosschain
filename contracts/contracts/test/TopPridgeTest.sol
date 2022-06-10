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
        TopDecoder.LightClientBlock[] memory clientBlocks = new TopDecoder.LightClientBlock[](3);
        RLPDecode.Iterator memory it = rlpBytes.toRlpItem().iterator();
        uint j = 0;
        while (it.hasNext()) {
            TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(it.next().toBytes());
            clientBlocks[j] = topBlock;
            j = j + 1;
        }
        return clientBlocks;
    }

}