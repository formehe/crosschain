// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IProxy.sol";
import "../common/IMultiLimit.sol";
import "../factory/ITokenFactory.sol";
import "../governance/IGovernanceCapability.sol";

contract CoreProxy is IProxy, IGovernanceCapability{
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
    mapping(uint256 => address) public assets;
    address public generalContractor;
    mapping(uint256 => mapping(bytes32 => bool)) public usedProofs;
    uint256 public chainId;
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
        // _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        // _setRoleAdmin(BLACK_MINT_ROLE, ADMIN_ROLE);
        // _setRoleAdmin(BLACK_BURN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_ROLE, OWNER_ROLE);

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
            assets[contractGroupId_] = templateCode;
        }
        emit ContractGroupProxyBound(contractGroupId_, chainId_, asset_);
    }

    function mint(
        bytes memory proof
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_MINT){
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        _saveProof(receipt.data.fromChain, receipt.blockHash, receipt.receiptIndex, receipt.proofIndex);
        require(!receipt.data.proxied, "receipt must from edge");
        address fromAsset = contractGroupMember[receipt.data.contractGroupId][receipt.data.fromChain];
        require(fromAsset != address(0) && fromAsset == receipt.data.asset, "from chain is not permit");
               
        address toAsset = contractGroupMember[receipt.data.contractGroupId][receipt.data.toChain];
        require(toAsset != address(0), "to chain is not permit");
        require(limiter.forbiddens(receipt.data.fromChain, receipt.proofIndex) == false, "receipt id has already been forbidden");
        if (receipt.data.toChain != chainId){
            emit CrossTokenBurned(chainId, receipt.data.toChain, receipt.data.contractGroupId, toAsset, true, receipt.data.tokenId, receipt.data.burnInfo);
        } else {
            address templateCode = assets[receipt.data.contractGroupId];
            require(templateCode != address(0), "template is not exist");
            bytes memory codes = ITokenFactory(templateCode).constructMint(receipt.data.burnInfo);
            (bool success,) = (toAsset).call(codes);
            require(success, "fail to mint");
            emit CrossTokenMinted(receipt.data.contractGroupId, receipt.data.fromChain, receipt.data.toChain, toAsset, receipt.data.tokenId, receipt.data.burnInfo);
        }
    }

    function burnTo(
        uint256 toChainId,
        uint256 contractGroupId,
        address receiver,
        uint256 tokenId
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_BURN){
        require(receiver != address(0), "invalid parameter");
        require(contractGroupId != 0, "invalid contract group id");
        require(toChainId != chainId, "only support cross chain tx");
        
        address fromAsset = contractGroupMember[contractGroupId][chainId];
        require(fromAsset != address(0), "from asset can not be 0");

        address toAsset = contractGroupMember[contractGroupId][toChainId];
        require(toAsset != address(0), "to asset can not be 0");

        // call contract
        bytes memory codes = abi.encodeWithSignature("burn(uint256)", tokenId);
        (bool success, bytes memory result) = fromAsset.call(codes);
        require(success, "fail to burn");

        address templateCode = assets[contractGroupId];
        require(templateCode != address(0), "template is not exist");

        bytes memory value = ITokenFactory(templateCode).constructBurn(result, receiver, tokenId);
        emit CrossTokenBurned(contractGroupId, chainId, toChainId, toAsset, true, tokenId, value);
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

    function isSupportCapability(
        bytes memory action
    ) external pure override returns (bool) {
        bytes4 actionId = bytes4(Utils.bytesToBytes32(action));
        (, bytes32 role,) = abi.decode(abi.encodePacked(bytes28(0), action),(bytes32,bytes32,address));
        
        if (!((role == ADMIN_ROLE)  || (role == CONTROLLED_ROLE) || (role == BLACK_ROLE))) {
            return false;
        }

        if (!((actionId == IAccessControl.grantRole.selector) || (actionId == IAccessControl.revokeRole.selector))) {
            return false;
        }

        return true;
    }
}