// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/IssueCoder.sol";
import "../ITokenFactory.sol";
import "hardhat/console.sol";

contract NFRFactory is ITokenFactory{
    constructor(address code) ITokenFactory(code) {  
    }

    function initialize(uint256 chainId, address code, bytes memory rangeOfIssue, address minter) internal override initializer{
        IssueCoder.GeneralIssueInfo memory generalIssue = IssueCoder.decodeGeneralIssueInfo(rangeOfIssue);
        IssueCoder.CirculationRangePerchain memory circulationPerChain;
        for (uint256 i = 0; i < generalIssue.issueRangeOfChains.length; i++) {
            if (generalIssue.issueRangeOfChains[i].chainId != chainId) {
                continue;
            }

            circulationPerChain = generalIssue.issueRangeOfChains[i];
        }

        bytes memory payload = abi.encodeWithSignature("initialize(address,string,string,(uint256,(string,string,string))[],(string,string,string,string),(address,(uint256,uint256,uint256)[],uint256,uint256,uint256))", 
            minter, generalIssue.name, generalIssue.symbol, generalIssue.rights, generalIssue.issuer, circulationPerChain);
        (bool success, bytes memory returnData) = code.call(payload);
        require(success, "fail to initialize template code");
    }

    function issue(bytes memory issueInfo_) external view override returns(bytes memory, uint256[] memory) {
        IssueCoder.IssueInfo memory issueInfo = IssueCoder.decodeIssueInfo(issueInfo_);
        IssueCoder.GeneralIssueInfo memory issueWithRange;

        issueWithRange.name = issueInfo.name;
        issueWithRange.symbol = issueInfo.symbol;
        issueWithRange.issuer = issueInfo.issuer;
        issueWithRange.rights = issueInfo.rights;
        issueWithRange.issueRangeOfChains = new IssueCoder.CirculationRangePerchain[](issueInfo.issueOfChains.length);

        uint256   tokenIndex = 1;
        uint256[] memory rightIndexes = new uint256[](issueInfo.rights.length);
        uint256[] memory rightIds = new uint256[](issueInfo.rights.length);

        for (uint256 i = 0; i < issueInfo.rights.length; ++i) {
            rightIndexes[i] = 1;
            rightIds[i] = issueInfo.rights[i].id;
        }

        uint256[] memory chainIds =  new uint256[](issueInfo.issueOfChains.length);

        for (uint256 i = 0; i < issueInfo.issueOfChains.length; ++i){
            (issueWithRange.issueRangeOfChains[i], rightIndexes, tokenIndex) = _applyRightsAndToken(issueInfo.issueOfChains[i], rightIndexes, rightIds, tokenIndex);
            chainIds[i] = issueInfo.issueOfChains[i].chainId;
        }

        console.logBytes(IssueCoder.encodeGeneralIssueInfo(issueWithRange));
        return (IssueCoder.encodeGeneralIssueInfo(issueWithRange), chainIds);
    }


    function expand(address contractCode, uint256 peerChainId, address issuer) external view override returns(bytes memory) {
        IssueCoder.GeneralIssueInfo memory issueWithRange;
        bytes memory payload = abi.encodeWithSignature("rights()");
        (bool success, bytes memory returnData) = contractCode.staticcall(payload);
        require(success, "rights interface is not exist");
        (issueWithRange.rights) = abi.decode(returnData, (IssueCoder.RightDescWithId[]));

        payload = abi.encodeWithSignature("issuer()");
        (success, returnData) = contractCode.staticcall(payload);
        require(success, "issuer interface is not exist");
        (issueWithRange.issuer.name, issueWithRange.issuer.certification, issueWithRange.issuer.agreement, issueWithRange.issuer.uri) = abi.decode(returnData, (string,string,string,string));

        payload = abi.encodeWithSignature("name()");
        (success, returnData) = contractCode.staticcall(payload);
        require(success, "name interface is not exist");
        (issueWithRange.name) = abi.decode(returnData, (string));

        payload = abi.encodeWithSignature("symbol()");
        (success, returnData) = contractCode.staticcall(payload);
        require(success, "name interface is not exist");
        (issueWithRange.symbol) = abi.decode(returnData, (string));
        
        issueWithRange.issueRangeOfChains = new IssueCoder.CirculationRangePerchain[](1);
        issueWithRange.issueRangeOfChains[0].chainId = peerChainId;
        issueWithRange.issueRangeOfChains[0].issuer = issuer;
        
        return IssueCoder.encodeGeneralIssueInfo(issueWithRange);
    }

    function _applyRightsAndToken(
        IssueCoder.CirculationPerChain memory circulationPerChain, 
        uint256[] memory rightIndexes,
        uint256[] memory rightIds,
        uint256 tokenIndex
    ) internal view returns(IssueCoder.CirculationRangePerchain memory circulationRangePerChain, uint256[] memory, uint256) {
        circulationRangePerChain.baseIndexOfToken = tokenIndex;
        circulationRangePerChain.capOfToken = circulationPerChain.amountOfToken;
        circulationRangePerChain.chainId = circulationPerChain.chainId;
        circulationRangePerChain.issuer = circulationPerChain.issuer;
        tokenIndex += circulationRangePerChain.capOfToken;

        circulationRangePerChain.rangeOfRights = new IssueCoder.RightRange[](circulationPerChain.circulationOfRights.length);
        for (uint256 i = 0; i < circulationPerChain.circulationOfRights.length; ++i) {
            require(rightIds[i] == circulationPerChain.circulationOfRights[i].id, "right id is not exist");
            circulationRangePerChain.rangeOfRights[i].id    = circulationPerChain.circulationOfRights[i].id;
            circulationRangePerChain.rangeOfRights[i].baseIndex  = rightIndexes[i];
            circulationRangePerChain.rangeOfRights[i].cap        = circulationPerChain.circulationOfRights[i].amount;
            rightIndexes[i] += circulationRangePerChain.rangeOfRights[i].cap;
        }

        return (circulationRangePerChain, rightIndexes, tokenIndex);
    }
}