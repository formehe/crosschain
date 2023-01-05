// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../../lib/external_lib/RLPEncode.sol";
import "../../../lib/external_lib/RLPDecode.sol";

library IssueCoder {
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;
    
    struct CirculationPerRight {
        uint256 id;
        uint256 amount;
    }

    struct CirculationPerChain {
        address issuer;
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

    struct IssueRight {
        uint256 id;
        uint256 totalAmount;
        RightDesc right;
    }

    struct IssuerDesc {
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

    struct CirculationRangePerchain {
        address issuer;
        CirculationPerRight[] rangeOfRights;
        uint256 baseIndexOfToken;
        uint256 capOfToken;
        uint256 chainId;
    }

    struct GeneralIssueInfo {
        string            name;
        string            symbol;
        uint256           totalAmountOfToken;
        IssuerDesc        issuer;
        IssueRight[]      rights;
        CirculationRangePerchain[]  issueRangeOfChains;
    }

    struct SubIssueInfo {
        uint256  chainId;
        uint256  contractGroupId;
        address  asset;        
    }

    function encodeIssuer(IssuerDesc memory issuer) internal pure returns (bytes memory) {
        bytes[] memory issuerInfo = new bytes[](4);
        issuerInfo[0] = RLPEncode.encodeBytes(abi.encodePacked(issuer.name));
        issuerInfo[1] = RLPEncode.encodeBytes(abi.encodePacked(issuer.certification));
        issuerInfo[2] = RLPEncode.encodeBytes(abi.encodePacked(issuer.agreement));
        issuerInfo[3] = RLPEncode.encodeBytes(abi.encodePacked(issuer.uri));
        return RLPEncode.encodeList(issuerInfo);
    }

    function decodeIssuer(RLPDecode.RLPItem memory itemBytes) internal pure returns (IssuerDesc memory issuer) {
        RLPDecode.Iterator memory it = itemBytes.iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 ) issuer.name           = string(it.next().toBytes());
            else if ( idx == 1 ) issuer.certification  = string(it.next().toBytes());
            else if ( idx == 2 ) issuer.agreement      = string(it.next().toBytes());
            else if ( idx == 3 ) issuer.uri            = string(it.next().toBytes());
            else it.next();
            idx++;
        }
    }

    function encodeRightDesc(RightDesc memory right) internal pure returns (bytes memory) {
        bytes[] memory rightDesc = new bytes[](3);
        rightDesc[0] = RLPEncode.encodeBytes(abi.encodePacked(right.name));
        rightDesc[1] = RLPEncode.encodeBytes(abi.encodePacked(right.uri));
        rightDesc[2] = RLPEncode.encodeBytes(abi.encodePacked(right.agreement));
        return RLPEncode.encodeList(rightDesc);
    }

    function decodeRightDesc(RLPDecode.RLPItem memory itemBytes) internal pure returns (RightDesc memory right) {
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

    function encodeRights(RightDescWithId[] memory rightWithIds) internal pure returns (bytes memory) {
        bytes[] memory rights = new bytes[](rightWithIds.length);
        for (uint i = 0; i < rightWithIds.length; i++) {
            bytes[] memory rightWithId = new bytes[](2);
            rightWithId[0] = RLPEncode.encodeUint(rightWithIds[i].id); 
            rightWithId[1] = encodeRightDesc(rightWithIds[i].right);
            rights[i] = RLPEncode.encodeList(rightWithId);
        }
        return RLPEncode.encodeList(rights);
    }

    function decodeRights(RLPDecode.RLPItem memory itemBytes) internal pure returns (RightDescWithId[] memory rightWithIds) {
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            rightWithIds = new RightDescWithId[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 ) rightWithIds[i].id    = it.next().toUint();
                    else if ( idx == 1 ) rightWithIds[i].right = decodeRightDesc(it.next());
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeIssueRights(IssueRight[] memory rightWithIds) internal pure returns (bytes memory) {
        bytes[] memory rights = new bytes[](rightWithIds.length);
        for (uint i = 0; i < rightWithIds.length; i++) {
            bytes[] memory rightWithId = new bytes[](3);
            rightWithId[0] = RLPEncode.encodeUint(rightWithIds[i].id);
            rightWithId[1] = RLPEncode.encodeUint(rightWithIds[i].totalAmount);
            rightWithId[2] = encodeRightDesc(rightWithIds[i].right);
            rights[i] = RLPEncode.encodeList(rightWithId);
        }
        return RLPEncode.encodeList(rights);
    }

    function decodeIssueRights(RLPDecode.RLPItem memory itemBytes) internal pure returns (IssueRight[] memory rightWithIds) {
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            rightWithIds = new IssueRight[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 ) rightWithIds[i].id    = it.next().toUint();
                    else if ( idx == 1 ) rightWithIds[i].totalAmount    = it.next().toUint();
                    else if ( idx == 2 ) rightWithIds[i].right = decodeRightDesc(it.next());
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationOfRights(CirculationPerRight[] memory circulationOfRights) internal pure returns(bytes memory){
        bytes[] memory circulation = new bytes[](circulationOfRights.length);
        for (uint i = 0; i < circulationOfRights.length; i++) {
            bytes[] memory circulationOfRight = new bytes[](2);
            circulationOfRight[0] = RLPEncode.encodeUint(circulationOfRights[i].id);
            circulationOfRight[1] = RLPEncode.encodeUint(circulationOfRights[i].amount);
            circulation[i] = RLPEncode.encodeList(circulationOfRight);
        }

        return RLPEncode.encodeList(circulation);
    }

    function decodeCirculationOfRights(RLPDecode.RLPItem memory itemBytes) internal pure returns(CirculationPerRight[] memory circulationOfRights){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            circulationOfRights = new CirculationPerRight[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      circulationOfRights[i].id  = it.next().toUint();
                    else if ( idx == 1 ) circulationOfRights[i].amount   = it.next().toUint();
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationOfChains(CirculationPerChain[] memory circulations) internal pure returns(bytes memory){
        bytes[] memory circulationOfChains = new bytes[](circulations.length);
        for (uint i = 0; i < circulations.length; i++) {
            bytes[] memory circulationOfChain = new bytes[](4);
            circulationOfChain[0] = RLPEncode.encodeBytes(abi.encodePacked(circulations[i].issuer));
            circulationOfChain[1] = RLPEncode.encodeUint(circulations[i].chainId);
            circulationOfChain[2] = RLPEncode.encodeUint(circulations[i].amountOfToken);
            circulationOfChain[3] = encodeCirculationOfRights(circulations[i].circulationOfRights);
            circulationOfChains[i] = RLPEncode.encodeList(circulationOfChain);
        }

        return RLPEncode.encodeList(circulationOfChains);
    }

    function decodeCirculationOfChains(RLPDecode.RLPItem memory itemBytes) internal pure returns(CirculationPerChain[] memory circulations){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) {
            circulations = new CirculationPerChain[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )     circulations[i].issuer = it.next().toAddress();
                    else if ( idx == 1 ) circulations[i].chainId  = it.next().toUint();
                    else if ( idx == 2 ) circulations[i].amountOfToken   = it.next().toUint();
                    else if ( idx == 3 ) circulations[i].circulationOfRights = decodeCirculationOfRights(it.next());
                    else it.next();
                    idx++;
                }
            }
        }
    }

    function encodeCirculationRangeOfChains(CirculationRangePerchain[] memory circulationRangeOfChains) internal pure returns(bytes memory){
        bytes[] memory circulations = new bytes[](circulationRangeOfChains.length);
        for (uint i = 0; i < circulationRangeOfChains.length; i++) {
            bytes[] memory circulation = new bytes[](5);
            circulation[0] = RLPEncode.encodeBytes(abi.encodePacked(circulationRangeOfChains[i].issuer));
            circulation[1] = encodeCirculationOfRights(circulationRangeOfChains[i].rangeOfRights);
            circulation[2] = RLPEncode.encodeUint(circulationRangeOfChains[i].baseIndexOfToken);
            circulation[3] = RLPEncode.encodeUint(circulationRangeOfChains[i].capOfToken);
            circulation[4] = RLPEncode.encodeUint(circulationRangeOfChains[i].chainId);
            circulations[i] = RLPEncode.encodeList(circulation);
        }

        return RLPEncode.encodeList(circulations);
    }

    function decodeCirculationRangeOfChains(RLPDecode.RLPItem memory itemBytes) internal pure returns(CirculationRangePerchain[] memory circulations){
        RLPDecode.RLPItem[] memory ls = itemBytes.toList();
        if (ls.length > 0) { 
            circulations = new CirculationRangePerchain[](ls.length);
            for (uint256 i = 0; i < ls.length; i++) {
                RLPDecode.Iterator memory it = ls[i].iterator();
                uint idx;
                while(it.hasNext()) {
                    if ( idx == 0 )      circulations[i].issuer  = it.next().toAddress();
                    else if ( idx == 1 )      circulations[i].rangeOfRights  = decodeCirculationOfRights(it.next());
                    else if ( idx == 2 ) circulations[i].baseIndexOfToken   = it.next().toUint();
                    else if ( idx == 3 ) circulations[i].capOfToken = it.next().toUint();
                    else if ( idx == 4 ) circulations[i].chainId = it.next().toUint();
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

    function decodeIssueInfo(bytes calldata issue) internal pure  returns(IssueInfo memory issueInfo) {
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
        bytes[] memory generalIssueInfo = new bytes[](6);
        generalIssueInfo[0] = RLPEncode.encodeBytes(abi.encodePacked(generalIssue.name));
        generalIssueInfo[1] = RLPEncode.encodeBytes(abi.encodePacked(generalIssue.symbol));
        generalIssueInfo[2] = RLPEncode.encodeUint(generalIssue.totalAmountOfToken);
        generalIssueInfo[3] = encodeIssuer(generalIssue.issuer);
        generalIssueInfo[4] = encodeIssueRights(generalIssue.rights);
        generalIssueInfo[5] = encodeCirculationRangeOfChains(generalIssue.issueRangeOfChains);
        return RLPEncode.encodeList(generalIssueInfo);
    }

    function decodeGeneralIssueInfo(bytes calldata generalIssue) internal pure returns (GeneralIssueInfo memory generalIssueInfo) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(generalIssue).iterator();
        uint idx;
        while(it.hasNext()) {
            if ( idx == 0 )      generalIssueInfo.name            = string(it.next().toBytes());
            else if ( idx == 1 ) generalIssueInfo.symbol          = string(it.next().toBytes());
            else if ( idx == 2 ) generalIssueInfo.totalAmountOfToken    = it.next().toUint();
            else if ( idx == 3 ) generalIssueInfo.issuer          = decodeIssuer(it.next());
            else if ( idx == 4 ) generalIssueInfo.rights          = decodeIssueRights(it.next());
            else if ( idx == 5 ) generalIssueInfo.issueRangeOfChains = decodeCirculationRangeOfChains(it.next());
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

    function decodeSubIssueInfo(bytes calldata subIssue) internal pure returns (SubIssueInfo memory subIssueInfo) {
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