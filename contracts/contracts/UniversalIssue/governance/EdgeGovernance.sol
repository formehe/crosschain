// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";

contract EdgeGovernance is AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;

    event UsedGeneralContractProof(
        bytes32 indexed blockHash,
        uint256 indexed receiptIndex,
        bytes32 proofIndex
    );

    event Governance(
        bytes32 indexed namespace,
        uint256 indexed id,
        uint256[] chains,
        bytes   proposal
    );

    struct VerifiedEvent {
        bytes32 namespace;
        uint256 id;
        uint256[] chains;
        bytes   proposal;
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

    function applyProposal(
        bytes memory proof
    ) external onlyRole(GOVERNANCE_PROPOSER_ROLE){
        VerifiedReceipt memory result= _verify(proof);
        bool exist;
        for (uint256 i = 0; i < result.data.chains.length; i++) {
            if (result.data.chains[i] == chainId) {
                exist = true;
                break;
            }
        }

        require(exist, "chain is not governed");
        emit Governance(result.data.namespace, result.data.id, result.data.chains, result.data.proposal);
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
        require(logInfo.topics[0] == 0x1a78f035c36345a8ac9abbd6de1cc8fb9c125d95e5b8590a593e7c0612ca301c, "invalid signature");
        (receipt_.chains, receipt_.proposal) = abi.decode(logInfo.data, (uint256[],bytes));
        receipt_.namespace = abi.decode(abi.encodePacked(logInfo.topics[1]), (bytes32));
        receipt_.id = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
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