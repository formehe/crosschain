// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IProxy.sol";
import "../common/IMultiLimit.sol";
import "../factory/ITokenFactory.sol";

contract CoreProxy is IProxy{
    event ContractGroupProxyBound(
        uint256 indexed contractGroupId,
        uint256 indexed chainId,
        address indexed asset
    );

    struct ProxiedAsset{
        uint256 groupId;
        address templateCode;
    }
    
    // groupId --- chainId --- asset
    mapping(uint256 => mapping(uint256 => address)) contractGroupMember;
    mapping(address => ProxiedAsset) public assets;
    address public generalContractor;
    mapping(uint256 => mapping(bytes32 => bool)) public usedProofs;
    uint256 chainId;
    IMultiLimit public limiter;

    function initialize(
        address generalContractor_,
        uint256 chainId_,
        address owner_,
        IMultiLimit limit_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(Address.isContract(generalContractor_), "invalid general contractor");
        require(Address.isContract(address(limit_)), "invalid limit contractor");

        generalContractor = generalContractor_;
        chainId = chainId_;
        limiter = limit_;
        
        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        
        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        
        _setRoleAdmin(BLACK_MINT_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_BURN_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function bindPeerChain(
        uint256 chainId_,
        address prover_,
        address peerProxy_
    ) external onlyRole(ADMIN_ROLE) {
        _bindPeerChain(chainId_, prover_, peerProxy_);
    }

    function bindAssetProxyGroup(
        address asset_, 
        uint256 chainId_,
        uint256 contractGroupId_,
        address templateCode
    ) external {
        require(msg.sender == generalContractor, "only for general contractor");
        require(asset_ != address(0), "from proxy address are not to be contract address");
        require(contractGroupId_ != 0, "contract group id can not be 0");
        require(contractGroupMember[contractGroupId_][chainId_] == address(0), "asset has been bound");
        contractGroupMember[contractGroupId_][chainId_] = asset_;
        if (chainId_ == chainId) {
            assets[asset_] = ProxiedAsset(contractGroupId_, templateCode);
        }
        emit ContractGroupProxyBound(contractGroupId_, chainId_, asset_);
    }

    function mint(
        bytes memory proof
    ) external accessable_and_unpauseable(BLACK_MINT_ROLE, PAUSED_MINT){
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        address asset = contractGroupMember[receipt.data.contractGroupId][receipt.data.fromChain];
        require(asset != address(0) && asset == receipt.data.asset, "from chain is not permit");
        
        asset = contractGroupMember[receipt.data.contractGroupId][receipt.data.toChain];
        require(asset != address(0), "to chain is not permit");
        
        _saveProof(receipt.data.fromChain, receipt.blockHash, receipt.receiptIndex, receipt.proofIndex);
        if (receipt.data.toChain != chainId){
            emit CrossTokenBurned(chainId, receipt.data.toChain, receipt.data.contractGroupId, asset, true, receipt.data.burnInfo);
        } else {
            require(limiter.forbiddens(receipt.data.fromChain, receipt.proofIndex) == false, "receipt id has already been forbidden");
            ProxiedAsset memory proxyAsset = assets[asset];
            require(proxyAsset.templateCode != address(0), "template is not exist");
            bytes memory codes = ITokenFactory(proxyAsset.templateCode).constrcutMint(receipt.data.burnInfo);
            (bool success,) = (asset).call(codes);
            require(success, "fail to mint");
            emit CrossTokenMinted(receipt.data.contractGroupId, receipt.data.fromChain, receipt.data.toChain, asset, receipt.data.burnInfo);
        }
    }

    function burnTo(
        uint256 toChainId,
        address asset,
        address receiver,
        uint256 tokenId
    ) external accessable_and_unpauseable(BLACK_BURN_ROLE, PAUSED_BURN){
        require(receiver != address(0), "invalid parameter");
        require(toChainId != chainId, "only support cross chain tx");
        ProxiedAsset memory proxyAsset = assets[asset];
        require(proxyAsset.groupId != 0, "asset is not bound");
        address toAsset = contractGroupMember[proxyAsset.groupId][toChainId];
        require(toAsset != address(0), "to asset can not be 0");

        // call contract
        bytes memory codes = abi.encodeWithSignature("burn(uint256)", tokenId);
        (bool success, bytes memory result) = asset.call(codes);
        require(success, "fail to burn");

        bytes memory value = ITokenFactory(proxyAsset.templateCode).constrcutBurn(result, receiver, tokenId);
        emit CrossTokenBurned(proxyAsset.groupId, chainId, toChainId, toAsset, false, value);
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 blockHash_,
        uint256 receiptIndex_,
        bytes32 proofIndex_
    ) internal {
        require(!usedProofs[chainId_][proofIndex_], "The burn event proof cannot be reused");
        usedProofs[chainId_][proofIndex_] = true;
        emit UsedProof(chainId_, blockHash_, receiptIndex_, proofIndex_);
    }
}