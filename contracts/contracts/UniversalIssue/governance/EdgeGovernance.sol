// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";
import "./IGovernanceCapability.sol";

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

    event Governance(
        bytes32 indexed classId,
        bytes32 indexed subClass,
        uint256[] chains,
        bytes   action
    );

    struct VerifiedEvent {
        bytes32 classId;
        bytes32 subClass;
        uint256[] chains;
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
    //keccak256("GOVERNANCE.PROPOSER.ROLE")
    bytes32 constant GOVERNANCE_PROPOSER_ROLE = 0xd5a906cf3ac93205af230c14cfaf12c82bbb6d36751ef6c37d190b7d9d4f3b4a;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSE_GOVERNANCE_PROPOSAL = 1 << 0;

    mapping(bytes32 => bool) public usedProofs;
    address[] public governedContracts;

    function initialize(
        address coreGovernance_,
        uint256 chainId_,
        IProver prover_, 
        address owner_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(coreGovernance_ != address(0), "invalid general contractor");
        require(Address.isContract(address(prover_)), "invalid prover");

        coreGovernance = coreGovernance_;
        chainId = chainId_;
        prover = prover_;

        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_GOVERNANCE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(GOVERNANCE_PROPOSER_ROLE, ADMIN_ROLE);

        _grantRole(GOVERNANCE_PROPOSER_ROLE, _msgSender());
        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function bindGovernedContract(
        address governedContract
    ) external onlyRole(GOVERNANCE_PROPOSER_ROLE) {
        require(Address.isContract(governedContract), "invalid governed contract");
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

    function applyProposal(
        bytes memory proof
    ) external accessable_and_unpauseable(BLACK_GOVERNANCE_ROLE, PAUSE_GOVERNANCE_PROPOSAL) {
        VerifiedReceipt memory result= _verify(proof);
        bool exist;
        for (uint256 i = 0; i < result.data.chains.length; i++) {
            if (result.data.chains[i] == chainId) {
                exist = true;
                break;
            }
        }

        require(exist, "chain is not governed");
        
        applyGovernance(result.data.classId, result.data.subClass, result.data.action);
        emit Governance(result.data.classId, result.data.subClass, result.data.chains, result.data.action);
    }

    function applyGovernance(
        bytes32 classId,
        bytes32 subClass,
        bytes memory action
    ) internal {
        for (uint256 i = 0; i < governedContracts.length; i++) {
            address governanceContract = governedContracts[i];
            bool success = IGovernanceCapability(governanceContract).isSupportCapability(classId, subClass, action);
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
        require(contractAddress != address(0), "general contractor address is zero");
        require(contractAddress == coreGovernance, "general contractor address is error");

        (bool success, bytes32 blockHash, uint256 receiptIndex, ) = prover.verify(proofData);
        require(success, "proof is invalid");
        _receipt.blockHash = blockHash;
        _receipt.receiptIndex = receiptIndex;
    }

    function _parseLog(
        bytes memory log
    ) private pure returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 3, "wrong number of topic");

        //GeneralContractorIssue    
        require(logInfo.topics[0] == 0x67e32e88b1860f2e173290d5672ff7629724fc659cc66c34aa5e2abe38c1fa78, "invalid signature");
        (receipt_.chains, receipt_.action) = abi.decode(logInfo.data, (uint256[],bytes));
        receipt_.classId = abi.decode(abi.encodePacked(logInfo.topics[1]), (bytes32));
        receipt_.subClass = abi.decode(abi.encodePacked(logInfo.topics[2]), (bytes32));
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