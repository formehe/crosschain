// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../common/ILimit.sol";
import "./IProxy.sol";
import "../factory/ITokenFactory.sol";
import "../../common/IGovernanceCapability.sol";

contract EdgeProxy is IProxy, IGovernanceCapability{
    struct ProxiedAsset{
        address asset;
        address templateCode;
    }

    event ContractGroupBound(
        uint256 indexed contractGroupId,
        address indexed asset
    );

    mapping(uint256 => ProxiedAsset) public assets;
    address public subContractor;
    uint256 public chainId;
    ILimit public limit;
    mapping(bytes32 => bool) public usedProofs;

    function initialize(
        address prover_,
        address subContractor_,
        address peerProxy_,
        uint256 peerChainId_,
        uint256 chainId_,
        address owner_,
        ILimit limit_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(Address.isContract(subContractor_), "invalid sub contractor");
        require(Address.isContract(prover_), "invalid prover");
        require(peerProxy_ != address(0), "invalid peer proxy");
        require(Address.isContract(address(limit_)), "invalid limit contract");

        _bindPeerChain(peerChainId_, prover_, peerProxy_);
        subContractor = subContractor_;
        chainId = chainId_;
        limit = limit_;
        
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

    function bindAssetGroup(
        address asset,
        uint256 contractGroupId,
        address templateCode
    ) external {
        require(msg.sender == subContractor, "just subcontractor can bind");
        require(Address.isContract(asset), "from proxy address are not to be contract address");
        require(contractGroupId != 0, "contract group id can not be 0");

        require(assets[contractGroupId].asset == address(0), "can not modify the bind asset");
        assets[contractGroupId] = ProxiedAsset(asset, templateCode);
        emit ContractGroupBound(contractGroupId, asset);
    }

    function mint(
        bytes memory proof
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_MINT) {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        _saveProof(receipt.data.fromChain, receipt.blockHash, receipt.receiptIndex, receipt.proofIndex);
        require(receipt.data.proxied, "receipt must from core");
        ProxiedAsset memory proxyAsset = assets[receipt.data.contractGroupId];
        require((proxyAsset.asset != address(0)) && (proxyAsset.asset == receipt.data.asset), "chain is not permit");
        require(receipt.data.toChain == chainId, "not to mine");
        require(limit.forbiddens(receipt.proofIndex) == false, "receipt id has already been forbidden");
        require(limit.checkFrozen(proxyAsset.templateCode, receipt.time),'tx is frozen');
        
        // call contract
        bytes memory codes = ITokenFactory(proxyAsset.templateCode).constructMint(receipt.data.burnInfo);
        (bool success,) = (receipt.data.asset).call(codes);
        require(success, "fail to mint");
        emit CrossTokenMinted(receipt.data.contractGroupId, receipt.data.fromChain, receipt.data.toChain, receipt.data.asset, receipt.data.tokenId, receipt.data.burnInfo);
    }

    function burnTo(
        uint256 toChainId,
        uint256 contractGroupId,
        address receiver,
        uint256 tokenId
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_BURN) {
        require(receiver != address(0), "invalid receiver");
        require(contractGroupId != 0, "invalid contract group id");
        require(toChainId != chainId, "only support cross chain tx");

        ProxiedAsset memory proxyAsset = assets[contractGroupId];
        require(proxyAsset.asset != address(0), "asset is not bound");

        bytes memory codes = abi.encodeWithSignature("burn(uint256)", tokenId);
        (bool success, bytes memory result) = (proxyAsset.asset).call(codes);
        require(success, "fail to burn");

        bytes memory value = ITokenFactory(proxyAsset.templateCode).constructBurn(result, receiver, tokenId);
        emit CrossTokenBurned(contractGroupId, chainId, toChainId, proxyAsset.asset, false, tokenId, value);
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 blockHash_,
        uint256 receiptIndex_,
        bytes32 proofIndex_
    ) internal {
        require(!usedProofs[proofIndex_], "The burn event proof cannot be reused");
        usedProofs[proofIndex_] = true;
        emit UsedProof(chainId_, blockHash_, receiptIndex_, proofIndex_);
    }

    function isSupportCapability(
        bytes memory action
    ) external pure override returns (bool) {
        bytes4 actionId = bytes4(Utils.bytesToBytes32(action));
        (, bytes32 role,) = abi.decode(abi.encodePacked(bytes28(0), action), (bytes32,bytes32,address));

        if (!((role == ADMIN_ROLE)  || (role == CONTROLLED_ROLE) || (role == BLACK_ROLE))) {
            return false;
        }

        if (!((actionId == IAccessControl.grantRole.selector) || (actionId == IAccessControl.revokeRole.selector))) {
            return false;
        }

        return true;
    }
}