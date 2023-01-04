// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../common/Deserialize.sol";
import "../prover/IProver.sol";
import "../factory/ITokenFactory.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "../../common/IGovernanceCapability.sol";

contract SubContractor is AdminControlledUpgradeable, IGovernanceCapability{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;
    
    struct VerifiedEvent {
        uint256 contractGroupId;
        uint256 saltId;
        bytes   data;
    }

    struct VerifiedReceipt {
        bytes32 blockHash;
        uint256 receiptIndex;
        VerifiedEvent data;
    }

    event HistorySubContractorGroupBound(
        uint256  indexed chainId,
        uint256  indexed contractGroupId,
        address  indexed asset
    );

    event SubContractorIssue(
        uint256  indexed chainId,
        uint256  indexed contractGroupId,
        address  indexed asset
    );

    event UsedGeneralContractProof(
        bytes32 indexed blockHash,
        uint256 indexed receiptIndex,
        bytes32 proofIndex
    );

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_SUBISSUE = 1 << 0;
    uint constant PAUSED_HISTORY_CONTRACT_GROUP_BOUND = 1 << 1;

    // bytes32 constant BLACK_ISSUE_ROLE = 0x98f43c3febbd0625021d7f077378e120db2ef156f39714519f9299a5e2ec80d6;//keccak256("BLACK.ISSUE.ROLE")

    // groupid --- templateid
    mapping(uint256 => address) public localContractGroupAsset;
    uint256 public chainId;
    address public proxy;
    address public generalContractor;
    IProver public prover;
    uint256 public minContractGroupId;
    address public minterProxy;
    ITokenFactory public tokenFactory;
    
    mapping(bytes32 => bool) public usedProofs;

    function initialize(
        address generalContractor_, 
        uint256 chainId_, 
        address localProxy_, 
        IProver prover_, 
        address owner_,
        uint256 maxHistoryContractGroupId_,
        address minterProxy_,
        ITokenFactory tokenFactory_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(generalContractor_ != address(0), "invalid general contractor");
        require(Address.isContract(localProxy_), "invalid local proxy");
        require(Address.isContract(address(prover_)), "invalid prover");
        require(Address.isContract(minterProxy_), "invalid minter proxy");
        require(Address.isContract(address(tokenFactory_)), "invalid token factory address");

        tokenFactory = tokenFactory_;
        generalContractor = generalContractor_;
        chainId = chainId_;
        proxy = localProxy_;
        prover = prover_;

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

    function bindHistoryContractGroup(
         bytes memory proof
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_HISTORY_CONTRACT_GROUP_BOUND) {
        VerifiedReceipt memory result= _verify(0xba9e79d09071599cc29ca033a03ce206531bcd76b66290555809f44ff4fd5299, proof);
        require(result.data.contractGroupId != 0, "contract group id can not be 0");
        require(result.data.contractGroupId <= minContractGroupId, "contract group id is bigger");
        require(localContractGroupAsset[result.data.contractGroupId] == address(0), "asset has been bound");

        (uint256[] memory chains, address[] memory assets) = abi.decode(result.data.data, (uint256[],address[]));
        require(chains.length == assets.length, "invalid chains info");
        
        for (uint256 i = 0; i < chains.length; i++) {
            if (chains[i] == chainId) {
                require(Address.isContract(assets[i]), "invalid asset address");
                bytes memory payload = abi.encodeWithSignature("bindAssetGroup(address,uint256,address)", assets[i], result.data.contractGroupId, address(tokenFactory));
                (bool success, ) = proxy.call(payload);
                require(success, "fail to bind contract group");
                localContractGroupAsset[result.data.contractGroupId] = assets[i];
                emit HistorySubContractorGroupBound(chainId, result.data.contractGroupId, assets[i]);
                break;
            }
        }
    }

    function subIssue(
        bytes memory proof
    ) external accessable_and_unpauseable(BLACK_ROLE, PAUSED_SUBISSUE){
        VerifiedReceipt memory result= _verify(0xf71e72e69608003da7cffbcbd14897fc930cfcbd0847c576ea242e21de04eaa5, proof);
        (bytes memory generalIssueInfo) = abi.decode(result.data.data, (bytes));
        address asset = tokenFactory.clone(chainId, generalIssueInfo, result.data.saltId, minterProxy);
        bytes memory payload = abi.encodeWithSignature("bindAssetGroup(address,uint256,address)", asset, result.data.contractGroupId, address(tokenFactory));
        (bool success,) = proxy.call(payload);
        require(success, "fail to bind contract group");
        localContractGroupAsset[result.data.contractGroupId] = asset;
        emit SubContractorIssue(chainId, result.data.contractGroupId, asset);
    }

    function _saveProof(
        bytes32 blockHash,
        uint256 receiptIndex
    ) internal {
        bytes32 proofIndex = keccak256(abi.encode(blockHash, receiptIndex));
        require(!usedProofs[proofIndex], "proof is reused");
        usedProofs[proofIndex] = true;
        emit UsedGeneralContractProof(blockHash, receiptIndex, proofIndex);
    }

    /// verify
    function _verify(
        bytes32 eventSignature,
        bytes memory proofData
    ) internal returns (VerifiedReceipt memory receipt_){
        receipt_ = _parseAndConsumeProof(eventSignature, proofData);
        _saveProof(receipt_.blockHash, receipt_.receiptIndex);
        return receipt_;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes32 eventSignature,
        bytes memory proofData
    ) internal view returns (VerifiedReceipt memory _receipt) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        bytes memory log = borshData.decode();
        // borshData.done();

        address contractAddress;
        (_receipt.data, contractAddress) = _parseLog(eventSignature, log);
        require(contractAddress != address(0), "general contractor address is zero");
        require(contractAddress == generalContractor, "general contractor address is error");

        (bool success, bytes32 blockHash, uint256 receiptIndex, ) = prover.verify(proofData);
        require(success, "proof is invalid");
        _receipt.blockHash = blockHash;
        _receipt.receiptIndex = receiptIndex;
    }

    function _parseLog(
        bytes32 eventSignature,
        bytes memory log
    ) private pure returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 3, "wrong number of topics");

        //GeneralContractorIssue
        require(logInfo.topics[0] == eventSignature, "invalid signature");
        receipt_.data = logInfo.data;
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.saltId = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        contractAddress_ = logInfo.contractAddress;
    }

    function isSupportCapability(
        bytes memory action
    ) external override pure returns (bool) {
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