// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/IssueCoder.sol";
import "../ITokenFactory.sol";

contract NFTFactory is ITokenFactory{
    constructor(address code_, address contractor_) ITokenFactory(code_, contractor_) {
    }

    function initialize(
        uint256 chainId,
        address code,
        bytes calldata rangeOfIssue,
        address minter
    ) internal override {
        IssueCoder.GeneralIssueInfo memory generalIssue = IssueCoder.decodeGeneralIssueInfo(rangeOfIssue);
        IssueCoder.CirculationRangePerchain memory circulationPerChain;
        bool exist;
        for (uint256 i = 0; i < generalIssue.issueRangeOfChains.length; i++) {
            if (generalIssue.issueRangeOfChains[i].chainId != chainId) {
                continue;
            }

            circulationPerChain = generalIssue.issueRangeOfChains[i];
            exist = true;
        }

        require(exist, "not issue on this chain");
        bytes memory payload = abi.encodeWithSignature("initialize(address,string,string,uint256,(string,string,string,string),(address,(uint256,uint256,uint256)[],uint256,uint256,uint256))",
            minter, generalIssue.name, generalIssue.symbol, generalIssue.totalAmountOfToken, generalIssue.issuer, circulationPerChain);
        (bool success, ) = code.call(payload);
        require(success, "fail to initialize template code");
    }

    function issue(
        bytes calldata issueInfo_
    ) external pure override returns(bytes memory, uint256[] memory) {
        IssueCoder.IssueInfo memory issueInfo = IssueCoder.decodeIssueInfo(issueInfo_);
        IssueCoder.GeneralIssueInfo memory issueWithRange;

        issueWithRange.name = issueInfo.name;
        issueWithRange.symbol = issueInfo.symbol;
        issueWithRange.issuer = issueInfo.issuer;
        issueWithRange.issueRangeOfChains = new IssueCoder.CirculationRangePerchain[](issueInfo.issueOfChains.length);

        uint256   tokenIndex = 1;
        uint256[] memory chainIds =  new uint256[](issueInfo.issueOfChains.length);

        for (uint256 i = 0; i < issueInfo.issueOfChains.length; ++i){
            (issueWithRange.issueRangeOfChains[i], tokenIndex) = _applyRightsAndToken(issueInfo.issueOfChains[i], tokenIndex);
            chainIds[i] = issueInfo.issueOfChains[i].chainId;
            require(!_exist(chainIds, i, chainIds[i]), "chains id is repeated");
        }

        require(tokenIndex > 1, "none token issue");
        issueWithRange.totalAmountOfToken = tokenIndex - 1;
        return (IssueCoder.encodeGeneralIssueInfo(issueWithRange), chainIds);
    }


    function expand(
        address contractCode,
        uint256 peerChainId,
        address issuer
    ) external view override returns(bytes memory) {
        IssueCoder.GeneralIssueInfo memory issueWithRange;

        bytes memory payload = abi.encodeWithSignature("issuer()");
        (bool success, bytes memory returnData) = contractCode.staticcall(payload);
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

        payload = abi.encodeWithSignature("totalSupply()");
        (success, returnData) = contractCode.staticcall(payload);
        require(success, "name interface is not exist");
        (issueWithRange.totalAmountOfToken) = abi.decode(returnData, (uint256));
        
        issueWithRange.issueRangeOfChains = new IssueCoder.CirculationRangePerchain[](1);
        issueWithRange.issueRangeOfChains[0].chainId = peerChainId;
        issueWithRange.issueRangeOfChains[0].issuer = issuer;
        
        return IssueCoder.encodeGeneralIssueInfo(issueWithRange);
    }

    function _applyRightsAndToken(
        IssueCoder.CirculationPerChain memory circulationPerChain, 
        uint256 tokenIndex
    ) internal pure returns(IssueCoder.CirculationRangePerchain memory circulationRangePerChain, uint256) {
        circulationRangePerChain.baseIndexOfToken = tokenIndex;
        require(circulationPerChain.amountOfToken < (1 << 128), "token amount is overflow");
        circulationRangePerChain.capOfToken = circulationPerChain.amountOfToken;
        circulationRangePerChain.chainId = circulationPerChain.chainId;
        circulationRangePerChain.issuer = circulationPerChain.issuer;
        tokenIndex += circulationRangePerChain.capOfToken;

        return (circulationRangePerChain, tokenIndex);
    }

    function constructMint(
        bytes calldata info
    ) external pure override returns(bytes memory) {
        (address receiver, uint256 tokenId) = abi.decode(info, (address, uint256));
        bytes memory codes = abi.encodeWithSignature("mint(uint256,address)", tokenId, receiver);
        return codes;
    }

    function constructBurn(
        bytes calldata, 
        address to, 
        uint256 asset
    ) external pure override returns(bytes memory) {
        bytes memory value = abi.encode(to, asset);
        return value;
    }
}