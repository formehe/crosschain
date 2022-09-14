// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../factory/ITokenFactory.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";
import "../../common/AdminControlledUpgradeable.sol";

contract GeneralContractor is AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;

    event ContractorGroupBound(
        uint256  indexed chainId,
        uint256  indexed contractGroupId,
        address  indexed asset
    );

    event UsedProof(
        uint256 indexed chainId,
        bytes32 proofIndex
    );
    
    struct VerifiedEvent {
        uint256 chainId;
        uint256 contractGroupId;
        address asset;
    }

    struct VerifiedReceipt {
        bytes32 proofIndex;
        VerifiedEvent data;
    }

    struct SubContractorInfo {
        address subContractor;
        IProver prover;
    }

    struct AssetInfo {
        uint256 templateId;
        uint256 saltId;
        address asset;
    }

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_ISSUE = 1 << 0;
    uint constant PAUSED_EXPAND = 1 << 1;
    uint constant PAUSED_BOUND = 1 << 2;

    bytes32 constant BLACK_ISSUE_ROLE = 0x98f43c3febbd0625021d7f077378e120db2ef156f39714519f9299a5e2ec80d6;//keccak256("BLACK.ISSUE.ROLE")
    bytes32 constant BLACK_EXPAND_ROLE = 0x95cf58189926bed46d06a44661d498482dd2e90bb3956fe4676978b153148df0;//keccak256("BLACK.EXPAND.ROLE")
    bytes32 constant BLACK_BOUND_ROLE = 0x36e5b819d1fba241578d86de8ed2b9d95e03a919a6b305312c96a153c43fcdbe;//keccak256("BLACK.BIND.CONTRACT.GROUP.ROLE")

    // chainId --- chainid
    mapping(uint256 => SubContractorInfo) public subContractors;
    // groupid --- template id
    mapping(uint256 => AssetInfo) public localContractGroupAsset;
    //templateId --- template address
    mapping(uint256 => address) public templateCodes;

    uint256 public chainId;
    uint256 public saltId;
    uint256 public contractGroupId;
    address public proxy;
    mapping(uint256 => mapping(bytes32 => bool)) public usedProofs;

    event GeneralContractorIssue(
        uint256 indexed templateId,
        uint256 indexed contractGroupId,
        uint256 indexed saltId,
        bytes issue
    );

    event SubContractorBound(
        uint256 indexed chainId,
        address indexed subContractor,
        address indexed prover
    );

    event CodeTemplateBound(
        uint256 indexed templateId,
        address indexed template
    );

    function initialize(address localProxy_, uint256 chainId_, address owner_) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(Address.isContract(localProxy_), "invalid local proxy");

        proxy = localProxy_;
        chainId = chainId_;
        
        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        
        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        
        _setRoleAdmin(BLACK_ISSUE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_EXPAND_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_BOUND_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function bindSubContractor(uint256 chainId_, address subContractor_, IProver prover_) external onlyRole(ADMIN_ROLE){
        require(subContractors[chainId_].subContractor == address(0), "chain has been bound");
        require(subContractor_ != address(0), "invalid subcontractor address");
        subContractors[chainId_] = SubContractorInfo(subContractor_, prover_);
        emit SubContractorBound(chainId_, subContractor_, address(prover_));
    }

    function bindTemplate(uint256 templateId, address code) external onlyRole(ADMIN_ROLE){
        require(templateCodes[templateId] == address(0), "template has been bound");
        require(Address.isContract(code), "address is not contract");
        templateCodes[templateId] = code;
        emit CodeTemplateBound(templateId, code);
    }

    function bindContractGroup(bytes memory proof) external accessable_and_unpauseable(BLACK_BOUND_ROLE, PAUSED_BOUND) {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256)", receipt.data.asset, receipt.data.chainId, receipt.data.contractGroupId);
        (bool success,) = proxy.call(payload);
        require(success, "fail to bind contract group");
        _saveProof(receipt.data.chainId, receipt.proofIndex);

        emit ContractorGroupBound(receipt.data.chainId, receipt.data.contractGroupId, receipt.data.asset);
    }

    function issue(uint256 templateId, bytes memory issueInfo) external accessable_and_unpauseable(BLACK_ISSUE_ROLE, PAUSED_ISSUE){
        address code = templateCodes[templateId];
        require(code != address(0), "template is not exist");

        (bytes memory generalIssueInfo, uint256[] memory chainIds) = ITokenFactory(code).issue(issueInfo);
        uint256 saltId_ = applySaltId();
        uint256 contractGroupId_ = applyGroupId();
        _checkChains(chainIds);
        address asset = ITokenFactory(code).clone(chainId, generalIssueInfo, saltId_, proxy);
        bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256)", asset, chainId, contractGroupId_);
        (bool success, ) = proxy.call(payload);
        require(success, "fail to bind contract group");
        localContractGroupAsset[contractGroupId] = AssetInfo(templateId, saltId, asset);
        emit GeneralContractorIssue(templateId, contractGroupId_, saltId_, generalIssueInfo);
    }

    function expand(uint256 groupId, uint256 peerChainId, address issuer) external accessable_and_unpauseable(BLACK_EXPAND_ROLE, PAUSED_EXPAND){
        AssetInfo memory assetInfo = localContractGroupAsset[groupId];
        require(assetInfo.asset != address(0), "group id has not issued");
        require(subContractors[peerChainId].subContractor != address(0), "chain is not bound");

        // if group id is in issuing
        bytes memory  generalIssueInfo = ITokenFactory(templateCodes[assetInfo.templateId]).expand(assetInfo.asset, peerChainId, issuer);
        console.logBytes(generalIssueInfo);
        emit GeneralContractorIssue(assetInfo.templateId, groupId, assetInfo.saltId, generalIssueInfo);
    }

    function applySaltId() internal returns(uint256) {
        return ++saltId;
    }

    function applyGroupId() internal returns(uint256) {
        return ++contractGroupId;
    }

    function _checkChains(uint256[] memory chainIds_) internal view {
        for (uint256 i = 0; i < chainIds_.length; i++) {
            if (chainIds_[i] != chainId) {
                require(subContractors[chainIds_[i]].subContractor != address(0), "chain is not bound");
            }
        }
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 proofIndex_
    ) internal {
        require(!usedProofs[chainId_][proofIndex_], "event of proof cannot be reused");
        usedProofs[chainId_][proofIndex_] = true;
        emit UsedProof(chainId_, proofIndex_);
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal returns (VerifiedReceipt memory receipt_) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        bytes memory log = borshData.decode();
        // borshData.done();

        address contractAddress;
        (receipt_.data, contractAddress) = _parseLog(log);
        require(contractAddress != address(0), "Invalid Token lock address");
        require(subContractors[receipt_.data.chainId].subContractor == contractAddress, "proxy is not bound");
        // require(limiter.forbiddens(proofIndex) == false, "receipt id has already been forbidden");

        (bool success, bytes32 proofIndex, uint256 time) = (subContractors[receipt_.data.chainId].prover).verify(proofData);
        require(success, "Proof should be valid");
        receipt_.proofIndex = proofIndex;
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
}