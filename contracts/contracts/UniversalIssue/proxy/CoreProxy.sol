// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IProxy.sol";

contract CoreProxy is IProxy,Initializable{
    event ContractGroupProxyBound(
        address asset,
        uint256 contractGroupId,
        uint256 chainId
    );

    event CrossTokenBurned(
        uint256 indexed fromChain,
        uint256 indexed toChain,
        uint256 indexed contractGroupId,
        address asset,
        bytes   burnInfo
    );

    struct ProxiedAsset{
        uint256 groupId;
    }
    
    // groupId --- chainId --- asset
    mapping(uint256 => mapping(uint256 => address)) contractGroupMember;
    mapping(address => ProxiedAsset) public assets;
    address public generalContractor;
    mapping(uint256 => mapping(bytes32 => bool)) public usedProofs;
    uint256 chainId;

    constructor(){
    }

    function initialize(address generalContractor_, uint256 chainId_) external initializer {
        generalContractor = generalContractor_;
        chainId = chainId_;
    }

    function bindPeerChain(uint256 chainId_, address prover_, address peerProxy_) external {
        _bindPeerChain(chainId_, prover_, peerProxy_);
    }

    function bindAssetProxyGroup(
        address asset_, 
        uint256 chainId_,
        uint256 contractGroupId_
    ) external {
        require(msg.sender == generalContractor, "only for general contractor");
        require(asset_ != address(0), "from proxy address are not to be contract address");
        require(contractGroupId_ != 0, "contract group id can not be 0");

        require(contractGroupMember[contractGroupId_][chainId_] == address(0), "asset has been bound");
        contractGroupMember[contractGroupId_][chainId_] = asset_;
        if (chainId_ == chainId) {
            assets[asset_] = ProxiedAsset(contractGroupId_);
        }
        emit ContractGroupProxyBound(asset_, contractGroupId_, chainId_);
    }

    function mint(bytes memory proof) external {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        address asset = contractGroupMember[receipt.data.contractGroupId][receipt.data.fromChain];
        require(asset != address(0) && asset == receipt.data.asset, "chain is not permit");
        
        require(asset != address(0));
        if (receipt.data.toChain != chainId){
            asset = contractGroupMember[receipt.data.contractGroupId][receipt.data.toChain];
            emit CrossTokenBurned(chainId, receipt.data.toChain, receipt.data.contractGroupId, asset, receipt.data.burnInfo);
        } else {
            asset = contractGroupMember[receipt.data.contractGroupId][chainId];
            // call contract
            (address receiver, uint256 tokenId, uint256[] memory rightKinds, uint256[] memory rightIds, bytes memory additional) = 
                abi.decode(receipt.data.burnInfo, (address, uint256,uint256[],uint256[], bytes));
            bytes memory codes = abi.encodeWithSignature("mint(uint256,uint256[],uint256[],bytes,address)", tokenId, rightKinds, rightIds, additional, receiver);
            (bool success,) = (receipt.data.asset).call(codes);
            require(success, "fail to mint");
        }

        _saveProof(receipt.data.fromChain, receipt.proofIndex);
    }

    function burnTo(uint256 toChainId, address asset, address receiver, uint256 tokenId) external{
        require(receiver != address(0), "invalid parameter");
        require(toChainId != chainId, "only support cross chain tx");
        uint256 groupId = assets[asset].groupId;
        require(groupId != 0, "asset is not bound");
        address toAsset = contractGroupMember[groupId][toChainId];
        require(toAsset != address(0), "to asset can not be 0");
        // call contract
        bytes memory codes = abi.encodeWithSignature("burn(uint256)", tokenId);
        (bool success, bytes memory result) = asset.call(codes);
        require(success, "fail to burn");
        (uint256[] memory rightKinds, uint256[] memory rightIds, bytes memory additional) = abi.decode(result, (uint256[],uint256[],bytes));
        bytes memory value = abi.encode(receiver, tokenId, rightKinds, rightIds, additional);

        emit CrossTokenBurned(chainId, toChainId, groupId, toAsset, value);
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 proofIndex_
    ) internal {
        require(!usedProofs[chainId_][proofIndex_], "The burn event proof cannot be reused");
        usedProofs[chainId_][proofIndex_] = true;
    }
}