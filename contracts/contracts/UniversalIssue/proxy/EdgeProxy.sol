// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IProxy.sol";

contract EdgeProxy is IProxy,Initializable{
    struct ProxiedAsset{
        uint256 groupId;
    }

    event ContractGroupBound(
        address asset,
        uint256 contractGroupId
    );

    event CrossTokenBurned(
        uint256 indexed fromChain,
        uint256 indexed toChain,
        uint256 indexed contractGroupId,
        address asset,
        bytes   burnInfo
    );

    mapping(address => ProxiedAsset) public assets;
    address public subContractor;
    uint256 public chainId;
    mapping(bytes32 => bool) public usedProofs;

    constructor(){
    }

    function initialize(address prover_, address subContractor_, address peerProxy_, uint256 peerChainId_, uint256 chainId_) external initializer {
        _bindPeerChain(peerChainId_, prover_, peerProxy_);
        subContractor = subContractor_;
        chainId = chainId_;
    }

    function bindAssetGroup(
        address asset,
        uint256 contractGroupId
    ) external {
        require(msg.sender == subContractor, "just subcontractor can bind");
        require(Address.isContract(asset), "from proxy address are not to be contract address");
        require(assets[asset].groupId == 0, "can not modify the bind asset");
        require(contractGroupId != 0, "contract group id can not be 0");
        assets[asset] = ProxiedAsset(contractGroupId);
        emit ContractGroupBound(asset, contractGroupId);
    }

    function mint(bytes memory proof) external {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        uint256 groupId = assets[receipt.data.asset].groupId;
        require((groupId != 0) && (groupId == receipt.data.contractGroupId), "chain is not permit");
        require(receipt.data.toChain == chainId, "not to mine");
        
        // call contract
        (address receiver, uint256 tokenId, uint256[] memory rightKinds, uint256[] memory rightIds) = 
            abi.decode(receipt.data.burnInfo, (address, uint256,uint256[],uint256[]));
        bytes memory codes = abi.encodeWithSignature("mint(uint256,uint256[],uint256[],address)", tokenId, rightKinds, rightIds, receiver);
        (bool success,) = (receipt.data.asset).call(codes);
        require(success, "fail to mint");
        _saveProof(receipt.data.fromChain, receipt.proofIndex);
    }

    function burnTo(uint256 toChainId, address asset, address receiver, uint256 tokenId) external {
        uint256 groupId = assets[asset].groupId;
        require(groupId != 0, "asset is not bind");

        bytes memory codes = abi.encodeWithSignature("burn(address,uint256)", msg.sender, tokenId);
        (bool success, bytes memory result) = asset.call(codes);
        require(success, "fail to burn");
        (uint256[] memory rightKinds, uint256[] memory rightIds) = abi.decode(result, (uint256[],uint256[]));
        bytes memory value = abi.encode(tokenId, rightKinds, rightIds);
        emit CrossTokenBurned(chainId, toChainId, groupId, asset, value);
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 proofIndex_
    ) internal {
        require(!usedProofs[proofIndex_], "The burn event proof cannot be reused");
        usedProofs[proofIndex_] = true;
    }
}