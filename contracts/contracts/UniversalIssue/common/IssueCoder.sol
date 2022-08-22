// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../../lib/external_lib/RLPEncode.sol";
import "../../../lib/external_lib/RLPDecode.sol";

library IssueCoder {
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;
    
    struct CirculationPerRight {
        uint256 rightId;
        uint256 amount;
    }

    struct CirculationPerChain {
        uint256 chainId;
        uint256 amountOfToken;
        CirculationPerRight[] circulationOfRights;
    }

    struct RightDesc {
        string name;
        string uri;
        string agreement;
    }

    struct RightDescWithId {
        uint256 id;
        RightDesc right;
    }

    struct IssuerDesc {
        address issuer;
        string  name;
        string  certification;
        string  agreement;
        string  uri;
    }

    struct IssueInfo {
        string       name;
        string       symbol;
        IssuerDesc   issuer;
        RightDescWithId[] rights;
        CirculationPerChain[]   issueOfChains;
    }

    struct RightRange {
        uint256 rightId;
        uint256 baseIndex;
        uint256 cap;
    }

    struct CirculationRangePerchain {
        RightRange[] rangeOfRights;
        uint256 baseIndexOfToken;
        uint256 capOfToken;
        uint256 chainId;
    }

    struct GeneralIssueInfo {
        string            name;
        string            symbol;
        IssuerDesc        issuer;
        RightDescWithId[] rights;
        CirculationRangePerchain[]  issueRangeOfChains;
    }

    struct SubIssueInfo {
        uint256  chainId;
        uint256  contractGroupId;
        address  asset;        
    }

    function encodeIssuer(IssuerDesc memory issuer) private pure returns (bytes memory) {
        bytes[] memory issuerInfo = new bytes[](5);
        issuerInfo[0] = RLPEncode.encodeBytes(abi.encodePacked(issuer.issuer));
        issuerInfo[1] = RLPEncode.encodeBytes(abi.encodePacked(issuer.name));
        issuerInfo[2] = RLPEncode.encodeBytes(abi.encodePacked(issuer.certification));
        issuerInfo[3] = RLPEncode.encodeBytes(abi.encodePacked(issuer.agreement));
        issuerInfo[4] = RLPEncode.encodeBytes(abi.encodePacked(issuer.uri));
        return RLPEncode.encodeList(issuerInfo);
    }

    function decodeIssuer(RLPDecode.RLPItem memory itemBytes) private pure returns (IssuerDesc memory issuer) {
        RLPDecode.Iterator memory it = itemBytes.iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      issuer.issuer         = it.next().toAddress();
            else if ( idx == 1 ) issuer.name           = string(it.next().toBytes());
            else if ( idx == 2 ) issuer.certification  = string(it.next().toBytes());
            else if ( idx == 3 ) issuer.agreement      = string(it.next().toBytes());
            else if ( idx == 4 ) issuer.uri            = string(it.next().toBytes());
            else it.next();
            idx++;
        }
    }

    function encodeRightDesc(RightDesc memory right) private pure returns (bytes memory) {
        bytes[] memory rightDesc = new bytes[](3);
        rightDesc[0] = RLPEncode.encodeBytes(abi.encodePacked(right.name));
        rightDesc[1] = RLPEncode.encodeBytes(abi.encodePacked(right.uri));
        rightDesc[2] = RLPEncode.encodeBytes(abi.encodePacked(right.agreement));
        return RLPEncode.encodeList(rightDesc);
    }

    function decodeRightDesc(RLPDecode.RLPItem memory itemBytes) private pure returns (RightDesc memory right) {
        RLPDecode.Iterator memory it = itemBytes.iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      right.name       = string(it.next().toBytes());
            else if ( idx == 1 ) right.uri        = string(it.next().toBytes());
            else if ( idx == 2 ) right.agreement  = string(it.next().toBytes());
            else it.next();
            idx++;
        }
    }

    function encodeRights(RightDescWithId[] memory rightWithIds) private pure returns (bytes memory) {
        bytes[] memory rights = new bytes[](rightWithIds.length);
        for (uint i = 0; i < rightWithIds.length; i++) {
            bytes[] memory rightWithId = new bytes[](2);
            rightWithId[0] = RLPEncode.encodeUint(rightWithIds[i].id); 
            rightWithId[1] = encodeRightDesc(rightWithIds[i].right);
            rights[i] = RLPEncode.encodeList(rightWithId);
        }
        return RLPEncode.encodeList(rights);
    }

    function decodeRights(RLPDecode.RLPItem memory itemBytes) private pure returns (RightDescWithId[] memory rightWithIds) {
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            rightWithIds = new RightDescWithId[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      rightWithIds[i].id    = it.next().toUint();
                    else if ( idx == 1 ) rightWithIds[i].right = decodeRightDesc(it.next());
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationOfRights(CirculationPerRight[] memory circulationOfRights) private pure returns(bytes memory){
        bytes[] memory circulation = new bytes[](circulationOfRights.length);
        for (uint i = 0; i < circulationOfRights.length; i++) {
            bytes[] memory circulationOfRight = new bytes[](2);
            circulationOfRight[0] = RLPEncode.encodeUint(circulationOfRights[i].rightId);
            circulationOfRight[1] = RLPEncode.encodeUint(circulationOfRights[i].amount);
            circulation[i] = RLPEncode.encodeList(circulationOfRight);
        }

        return RLPEncode.encodeList(circulation);
    }

    function decodeCirculationOfRights(RLPDecode.RLPItem memory itemBytes) private pure returns(CirculationPerRight[] memory circulationOfRights){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            circulationOfRights = new CirculationPerRight[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      circulationOfRights[i].rightId  = it.next().toUint();
                    else if ( idx == 1 ) circulationOfRights[i].amount   = it.next().toUint();
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationOfChains(CirculationPerChain[] memory circulations) private pure returns(bytes memory){
        bytes[] memory circulationOfChains = new bytes[](circulations.length);
        for (uint i = 0; i < circulations.length; i++) {
            bytes[] memory circulationOfChain = new bytes[](3);
            circulationOfChain[0] = RLPEncode.encodeUint(circulations[i].chainId);
            circulationOfChain[1] = RLPEncode.encodeUint(circulations[i].amountOfToken);
            circulationOfChain[2] = encodeCirculationOfRights(circulations[i].circulationOfRights);
            circulationOfChains[i] = RLPEncode.encodeList(circulationOfChain);
        }

        return RLPEncode.encodeList(circulationOfChains);
    }

    function decodeCirculationOfChains(RLPDecode.RLPItem memory itemBytes) private pure returns(CirculationPerChain[] memory circulations){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            circulations = new CirculationPerChain[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      circulations[i].chainId  = it.next().toUint();
                    else if ( idx == 1 ) circulations[i].amountOfToken   = it.next().toUint();
                    else if ( idx == 2 ) circulations[i].circulationOfRights = decodeCirculationOfRights(it.next());
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationRangeOfRights(RightRange[] memory rangeOfRights) private pure returns(bytes memory){
        bytes[] memory circulations = new bytes[](rangeOfRights.length);
        for (uint i = 0; i < rangeOfRights.length; i++) {
            bytes[] memory circulation = new bytes[](3);
            circulation[0] = RLPEncode.encodeUint(rangeOfRights[i].rightId);
            circulation[1] = RLPEncode.encodeUint(rangeOfRights[i].baseIndex);
            circulation[2] = RLPEncode.encodeUint(rangeOfRights[i].cap);
            circulations[i] = RLPEncode.encodeList(circulation);
        }

        return RLPEncode.encodeList(circulations);
    }

    function decodeCirculationRangeOfRights(RLPDecode.RLPItem memory itemBytes) private pure returns(RightRange[] memory rangeOfRights){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            rangeOfRights = new RightRange[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      rangeOfRights[i].rightId   = it.next().toUint();
                    else if ( idx == 1 ) rangeOfRights[i].baseIndex = it.next().toUint();
                    else if ( idx == 2 ) rangeOfRights[i].cap       = it.next().toUint();
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationRangeOfChains(CirculationRangePerchain[] memory circulationRangeOfChains) private pure returns(bytes memory){
        bytes[] memory circulations = new bytes[](circulationRangeOfChains.length);
        for (uint i = 0; i < circulationRangeOfChains.length; i++) {
            bytes[] memory circulation = new bytes[](4);
            circulation[0] = encodeCirculationRangeOfRights(circulationRangeOfChains[i].rangeOfRights);
            circulation[1] = RLPEncode.encodeUint(circulationRangeOfChains[i].baseIndexOfToken);
            circulation[2] = RLPEncode.encodeUint(circulationRangeOfChains[i].capOfToken);
            circulation[3] = RLPEncode.encodeUint(circulationRangeOfChains[i].chainId);
            circulations[i] = RLPEncode.encodeList(circulation);
        }

        return RLPEncode.encodeList(circulations);
    }

    function decodeCirculationRangeOfChains(RLPDecode.RLPItem memory itemBytes) private pure returns(CirculationRangePerchain[] memory circulations){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            circulations = new CirculationRangePerchain[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      circulations[i].rangeOfRights  = decodeCirculationRangeOfRights(it.next());
                    else if ( idx == 1 ) circulations[i].baseIndexOfToken   = it.next().toUint();
                    else if ( idx == 2 ) circulations[i].capOfToken = it.next().toUint();
                    else if ( idx == 3 ) circulations[i].chainId = it.next().toUint();
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeIssueInfo(IssueInfo memory issue) internal pure returns (bytes memory) {
        bytes[] memory issueInfo = new bytes[](5);
        issueInfo[0] = RLPEncode.encodeBytes(abi.encodePacked(issue.name));
        issueInfo[1] = RLPEncode.encodeBytes(abi.encodePacked(issue.symbol));
        issueInfo[2] = encodeIssuer(issue.issuer);
        issueInfo[3] = encodeRights(issue.rights);
        issueInfo[4] = encodeCirculationOfChains(issue.issueOfChains);
        return RLPEncode.encodeList(issueInfo);
    }

    function decodeIssueInfo(bytes memory issue) internal pure  returns(IssueInfo memory issueInfo) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(issue).iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      issueInfo.name          = string(it.next().toBytes());
            else if ( idx == 1 ) issueInfo.symbol        = string(it.next().toBytes());
            else if ( idx == 2 ) issueInfo.issuer        = decodeIssuer(it.next());
            else if ( idx == 3 ) issueInfo.rights        = decodeRights(it.next());
            else if ( idx == 4 ) issueInfo.issueOfChains = decodeCirculationOfChains(it.next());
            else it.next();
            idx++;
        }
    }

    function encodeGeneralIssueInfo(GeneralIssueInfo memory generalIssue) internal pure returns(bytes memory) {
        bytes[] memory generalIssueInfo = new bytes[](5);
        generalIssueInfo[0] = RLPEncode.encodeBytes(abi.encodePacked(generalIssue.name));
        generalIssueInfo[1] = RLPEncode.encodeBytes(abi.encodePacked(generalIssue.symbol));
        generalIssueInfo[2] = encodeIssuer(generalIssue.issuer);
        generalIssueInfo[3] = encodeRights(generalIssue.rights);
        generalIssueInfo[4] = encodeCirculationRangeOfChains(generalIssue.issueRangeOfChains);
        return RLPEncode.encodeList(generalIssueInfo);
    }

    function decodeGeneralIssueInfo(bytes memory generalIssue) internal pure returns (GeneralIssueInfo memory generalIssueInfo) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(generalIssue).iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      generalIssueInfo.name            = string(it.next().toBytes());
            else if ( idx == 1 ) generalIssueInfo.symbol          = string(it.next().toBytes());
            else if ( idx == 2 ) generalIssueInfo.issuer          = decodeIssuer(it.next());
            else if ( idx == 3 ) generalIssueInfo.rights          = decodeRights(it.next());
            else if ( idx == 4 ) generalIssueInfo.issueRangeOfChains = decodeCirculationRangeOfChains(it.next());
            else it.next();
            idx++;
        }
    }

    function encodeSubIssueInfo(SubIssueInfo memory subIssue) internal pure returns (bytes memory) {
        bytes[] memory serializer = new bytes[](3);
        serializer[0] = RLPEncode.encodeUint(subIssue.chainId);
        serializer[1] = RLPEncode.encodeUint(subIssue.contractGroupId);
        serializer[2] = RLPEncode.encodeBytes(abi.encodePacked(subIssue.asset));

        return RLPEncode.encodeList(serializer);
    }

    function decodeSubIssueInfo(bytes memory subIssue) internal pure returns (SubIssueInfo memory subIssueInfo) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(subIssue).iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      subIssueInfo.chainId         = it.next().toUint();
            else if ( idx == 1 ) subIssueInfo.contractGroupId = it.next().toUint();
            else if ( idx == 2 ) subIssueInfo.asset           = it.next().toAddress();
            else it.next();
            idx++;
        }
    }
}