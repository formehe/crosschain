// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";
import "../../common/IGovernanceCapability.sol";
import "hardhat/console.sol";

contract EdgeGovernance is AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;

    event UsedGeneralContractProof(
        bytes32 indexed blockHash,
        uint256 indexed receiptIndex,
        bytes32 proofIndex
    );

    event GovernedContractBound(
        address indexed governedContract
    );

    event GovernanceProposed(
        uint256 indexed proposalId,
        bytes   action
    );

    event GovernanceAccepted(
        uint256 indexed proposalId
    );

    struct VerifiedEvent {
        uint256 proposalId;
        bytes   action;
    }

    struct VerifiedReceipt {
        bytes32 blockHash;
        uint256 receiptIndex;
        VerifiedEvent data;
    }

    IProver public prover;
    address public coreGovernance;
    uint256 public chainId;

    //keccak256("BLACK.GOVERNANCE.ROLE")
    bytes32 constant BLACK_GOVERNANCE_ROLE = 0x5815e0e9225333c89575398fc48947fa6c0b7306b87716d0fcefc6b814f0e647;
    //keccak256("GOVERNANCE.ACCEPTOR.ROLE")
    bytes32 constant GOVERNANCE_ACCEPTOR_ROLE = 0xfc92b525942db851e26d6ddeefc837c5302abdf38e02f1f2ab96ce0cd4235c20;
    
    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSE_GOVERNANCE_PROPOSAL = 1 << 0;

    mapping(bytes32 => bool) public usedProofs;
    address[] public governedContracts;
    mapping(uint256 => bytes) public proposals;

    function initialize(
        address coreGovernance_,
        uint256 chainId_,
        IProver prover_, 
        address owner_,
        address acceptor_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(acceptor_ != address(0), "invalid acceptor");
        require(coreGovernance_ != address(0), "invalid core governance");
        require(Address.isContract(address(prover_)), "invalid prover");

        coreGovernance = coreGovernance_;
        chainId = chainId_;
        prover = prover_;

        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_GOVERNANCE_ROLE, ADMIN_ROLE);

        _grantRole(GOVERNANCE_ACCEPTOR_ROLE, acceptor_);
        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function bindGovernedContract(
        address governedContract
    ) external onlyRole(ADMIN_ROLE) {
        require(Address.isContract(governedContract), "invalid governed contract");
        require(address(this) != governedContract, "not myself");

        bool exist;
        for (uint256 i = 0; i < governedContracts.length; i++) {
            if (governedContracts[i] == governedContract) {
                exist = true;
                break;
            }
        }

        require(!exist, "contract is existed");
        governedContracts.push(governedContract);
        emit GovernedContractBound(governedContract);
    }

    function propose(
        bytes memory proof
    ) external accessable_and_unpauseable(BLACK_GOVERNANCE_ROLE, PAUSE_GOVERNANCE_PROPOSAL) {
        VerifiedReceipt memory result= _verify(proof);
        proposals[result.data.proposalId] = result.data.action;
        bytes4 actionId = bytes4(Utils.bytesToBytes32(result.data.action));
        abi.decode(abi.encodePacked(bytes28(0), result.data.action),(bytes32,bytes32,address));
        
        if (!((actionId == IAccessControl.grantRole.selector) || (actionId == IAccessControl.revokeRole.selector))) {
            require(false, "invalid method");
        }

        emit GovernanceProposed(result.data.proposalId, result.data.action);
    }

    function accept(
        uint256 proposalId_
    ) external onlyRole(GOVERNANCE_ACCEPTOR_ROLE){
        bytes memory proposal = proposals[proposalId_];
        require(proposal.length > 0, "proposal is not exist");
        _applyGovernance(proposal);
        delete proposals[proposalId_];
        emit GovernanceAccepted(proposalId_);
    }

    function _applyGovernance(
        bytes memory action
    ) internal {
        for (uint256 i = 0; i < governedContracts.length; i++) {
            address governanceContract = governedContracts[i];
            bool success = IGovernanceCapability(governanceContract).isSupportCapability(action);
            if (!success) {
                continue;
            }

            (success, ) = governanceContract.call(action);
            require(success, "fail to apply governance");
        }
    }

    /// verify
    function _verify(
        bytes memory proofData
    ) internal returns (VerifiedReceipt memory receipt_){
        receipt_ = _parseAndConsumeProof(proofData);
        _saveProof(receipt_.blockHash, receipt_.receiptIndex);
        return receipt_;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal view returns (VerifiedReceipt memory _receipt) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        bytes memory log = borshData.decode();

        address contractAddress;
        (_receipt.data, contractAddress) = _parseLog(log);
        require(contractAddress != address(0), "core governance is zero");
        require(contractAddress == coreGovernance, "core governance is error");

        (bool success, bytes32 blockHash, uint256 receiptIndex, ) = prover.verify(proofData);
        require(success, "proof is invalid");
        _receipt.blockHash = blockHash;
        _receipt.receiptIndex = receiptIndex;
    }

    function _parseLog(
        bytes memory log
    ) private pure returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 2, "wrong number of topic");

        //GeneralContractorIssue    
        require(logInfo.topics[0] == 0xcd48ab21af6d4471899ffa5008a1f97d143a82d51d9920f149b770ae4f7c8075, "invalid signature");
        (receipt_.action) = abi.decode(logInfo.data, (bytes));
        receipt_.proposalId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        contractAddress_ = logInfo.contractAddress;
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
}