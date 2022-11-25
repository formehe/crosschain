// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../factory/ITokenFactory.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "../governance/IGovernanceCapability.sol";

contract GeneralContractor is AdminControlledUpgradeable, IGovernanceCapability{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;

    event ContractorGroupBound(
        uint256  indexed chainId,
        uint256  indexed contractGroupId,
        address  indexed asset
    );

    event UsedProof(
        uint256 indexed chainId,
        bytes32 indexed blockHash,
        uint256 indexed receiptIndex,
        bytes32 proofIndex
    );

    event HistoryContractorGroupBound(
        uint256  indexed contractGroupId,
        uint256  indexed saltId,
        uint256[] chains,
        address[] assets
    );
    
    struct VerifiedEvent {
        uint256 chainId;
        uint256 contractGroupId;
        address asset;
    }

    struct VerifiedReceipt {
        bytes32 blockHash;
        uint256 receiptIndex;
        VerifiedEvent data;
    }

    struct SubContractorInfo {
        address subContractor;
        IProver prover;
    }

    struct AssetInfo {
        uint256 saltId;
        address asset;
    }

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_ISSUE = 1 << 0;
    uint constant PAUSED_EXPAND = 1 << 1;
    uint constant PAUSED_BOUND = 1 << 2;

    // chainId --- chainInfo
    mapping(uint256 => SubContractorInfo) public subContractors;
    // groupid --- templateId
    mapping(uint256 => AssetInfo) public localContractGroupAsset;

    uint256 public chainId;
    uint256 public saltId;
    uint256 public minSaltId;
    uint256 public minContractGroupId;
    uint256 public contractGroupId;
    address public proxy;
    address public minterProxy;
    ITokenFactory public tokenFactory;

    mapping(uint256 => mapping(bytes32 => bool)) public usedProofs;

    event GeneralContractorIssue(
        uint256 indexed contractGroupId,
        uint256 indexed saltId,
        bytes issue
    );

    event SubContractorBound(
        uint256 indexed chainId,
        address indexed subContractor,
        address indexed prover
    );

    function initialize(
        address localProxy_,
        uint256 chainId_,
        address owner_,
        uint256 maxHistorySaltId_,
        uint256 maxHistoryContractGroupId_,
        address minterProxy_,
        ITokenFactory tokenFactory_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(Address.isContract(localProxy_), "invalid local proxy");
        require(Address.isContract(minterProxy_), "invalid minter proxy");
        require(Address.isContract(address(tokenFactory_)), "invalid token factory address");

        tokenFactory = tokenFactory_;

        proxy = localProxy_;
        chainId = chainId_;

        saltId = maxHistorySaltId_;
        contractGroupId = maxHistoryContractGroupId_;

        minSaltId = maxHistorySaltId_;
        minContractGroupId = maxHistoryContractGroupId_;
        minterProxy = minterProxy_;
        
        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        
        // _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        // _setRoleAdmin(BLACK_ISSUE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function bindSubContractor(
        uint256 chainId_,
        address subContractor_,
        IProver prover_
    ) external onlyRole(ADMIN_ROLE){
        require(subContractors[chainId_].subContractor == address(0), "chain has been bound");
        require(subContractor_ != address(0), "invalid subcontractor address");
        require(Address.isContract(address(prover_)), "invalid prover address");
        subContractors[chainId_] = SubContractorInfo(subContractor_, prover_);
        emit SubContractorBound(chainId_, subContractor_, address(prover_));
    }

    function bindContractGroup(
        bytes calldata proof
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_BOUND) {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        _saveProof(receipt.data.chainId, receipt.blockHash, receipt.receiptIndex);
        AssetInfo memory asset = localContractGroupAsset[receipt.data.contractGroupId];
        require(asset.asset != address(0), "contract group is not exist");
        bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256,address)", receipt.data.asset, receipt.data.chainId, receipt.data.contractGroupId, address(tokenFactory));
        (bool success,) = proxy.call(payload);
        require(success, "fail to bind contract group");
        emit ContractorGroupBound(receipt.data.chainId, receipt.data.contractGroupId, receipt.data.asset);
    }

    // support for load in data
    function bindHistoryContractGroup(
        uint256 contractGroupId_,
        uint256 saltId_,
        uint256[] calldata chains_,
        address[] calldata assets_
    ) external onlyRole(ADMIN_ROLE) {
        require(contractGroupId_ != 0, "contract group id can not be 0");
        require(contractGroupId_ <= minContractGroupId , "contract group id is overflow");
        require(saltId_ != 0, "contract group id can not be 0");
        require(saltId_ <= minSaltId, "salt id is overflow");
        require(chains_.length == assets_.length, "invalid chains info");

        require(localContractGroupAsset[contractGroupId_].saltId == 0, "asset generate info has been bound");
        _checkChains(chains_);

        address localAsset;
        for (uint256 i = 0; i < chains_.length; i++) {
            require(assets_[i] != address(0), "invalid asset address");
            bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256,address)", assets_[i], chains_[i], contractGroupId_, address(tokenFactory));
            (bool success, ) = proxy.call(payload);
            require(success, "fail to bind contract group");
            if (chains_[i] == chainId) {
                localAsset = assets_[i];
            }
        }

        require(Address.isContract(localAsset), "local asset is not exist");

        localContractGroupAsset[contractGroupId_] = AssetInfo(saltId_, localAsset);
        emit HistoryContractorGroupBound(contractGroupId_, saltId_, chains_, assets_);
    }

    function issue(
        bytes calldata issueInfo
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_ISSUE){
        (bytes memory generalIssueInfo, uint256[] memory chainIds) = tokenFactory.issue(issueInfo);
        uint256 saltId_ = applySaltId();
        uint256 contractGroupId_ = applyGroupId();
        _checkChains(chainIds);
        address asset = tokenFactory.clone(chainId, generalIssueInfo, saltId_, minterProxy);
        bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256,address)", asset, chainId, contractGroupId_, address(tokenFactory));
        (bool success, ) = proxy.call(payload);
        require(success, "fail to bind contract group");
        localContractGroupAsset[contractGroupId] = AssetInfo(saltId, asset);

        emit GeneralContractorIssue(contractGroupId_, saltId_, generalIssueInfo);
    }

    function expand(
        uint256 groupId,
        uint256 peerChainId,
        address issuer
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_EXPAND){
        AssetInfo memory assetInfo = localContractGroupAsset[groupId];
        require(assetInfo.asset != address(0), "group id has not issued");
        require(subContractors[peerChainId].subContractor != address(0), "chain is not bound");
        require(peerChainId != chainId, "expand chain id can not be main chain");
        bytes memory  generalIssueInfo = tokenFactory.expand(assetInfo.asset, peerChainId, issuer);
        emit GeneralContractorIssue(groupId, assetInfo.saltId, generalIssueInfo);
    }

    function applySaltId() internal returns(uint256) {
        return ++saltId;
    }

    function applyGroupId() internal returns(uint256) {
        return ++contractGroupId;
    }

    function _checkChains(
        uint256[] memory chainIds_
    ) internal view {
        bool exist;
        for (uint256 i = 0; i < chainIds_.length; i++) {
            if (chainIds_[i] != chainId) {
                require(subContractors[chainIds_[i]].subContractor != address(0), "chain is not bound");
            } else {
                exist = true;
            }
        }

        require(exist, "must issue on main chain");
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 blockHash_,
        uint256 receiptIndex_
    ) internal {
        bytes32 proofIndex_ = keccak256(abi.encode(blockHash_, receiptIndex_));
        require(!usedProofs[chainId_][proofIndex_], "event of proof cannot be reused");
        usedProofs[chainId_][proofIndex_] = true;
        emit UsedProof(chainId_, blockHash_, receiptIndex_, proofIndex_);
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal view returns (VerifiedReceipt memory receipt_) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        bytes memory log = borshData.decode();
        // borshData.done();

        address contractAddress;
        (receipt_.data, contractAddress) = _parseLog(log);
        require(contractAddress != address(0), "Invalid Token lock address");
        require(subContractors[receipt_.data.chainId].subContractor == contractAddress, "proxy is not bound");

        (bool success, bytes32 blockHash, uint256 receiptIndex, ) = (subContractors[receipt_.data.chainId].prover).verify(proofData);
        require(success, "Proof should be valid");
        receipt_.blockHash = blockHash;
        receipt_.receiptIndex = receiptIndex;
    }

    function _parseLog(
        bytes memory log
    ) internal virtual view returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        
        //SubContractorIssue
        require(logInfo.topics[0] == 0x60e046922dfd2b185e920419aac28e54bd4b5f0260376067224500f93e02459c, "invalid the function of topics");
        receipt_.chainId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        receipt_.asset = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        contractAddress_ = logInfo.contractAddress;
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