// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "./IGovernanceCapability.sol";
import "hardhat/console.sol";

contract CoreGovernance is AdminControlledUpgradeable{
    uint256 public chainId;

    event GovernedContractBound(
        address indexed governedContract
    );

    event EdgeGovernanceBound(
        uint256 indexed chainId,
        address indexed edgeGovernance,
        address indexed prover
    );

    event GovernanceProposed(
        uint256 indexed proposalId,
        bytes   action
    );

    event GovernanceAccepted(
        uint256 indexed proposalId
    );

    struct EdgeGovernanceInfo {
        address edgeGovernance;
        IProver prover;
    }

    //keccak256("BLACK.GOVERNANCE.ROLE")
    //bytes32 constant BLACK_GOVERNANCE_ROLE = 0x5815e0e9225333c89575398fc48947fa6c0b7306b87716d0fcefc6b814f0e647;
    //keccak256("GOVERNANCE.PROPOSER.ROLE")
    bytes32 constant GOVERNANCE_PROPOSER_ROLE = 0xd5a906cf3ac93205af230c14cfaf12c82bbb6d36751ef6c37d190b7d9d4f3b4a;
    //keccak256("GOVERNANCE.ACCEPTOR.ROLE")
    bytes32 constant GOVERNANCE_ACCEPTOR_ROLE = 0xfc92b525942db851e26d6ddeefc837c5302abdf38e02f1f2ab96ce0cd4235c20;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSE_GOVERNANCE_PROPOSAL = 1 << 0;

    // chainId --- chainInfo
    mapping(uint256 => EdgeGovernanceInfo) public edgeGovernances;
    address[] public governedContracts;
    uint256 proposalId;
    mapping(uint256 => bytes) public proposals;

    function initialize(
        uint256 chainId_,
        address owner_,
        address proposer_,
        address acceptor_,
        uint256 maxHistoricalProposalId_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");

        chainId = chainId_;
        
        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        // _setRoleAdmin(GOVERNANCE_PROPOSER_ROLE, ADMIN_ROLE);

        _grantRole(GOVERNANCE_PROPOSER_ROLE, proposer_);
        _grantRole(GOVERNANCE_ACCEPTOR_ROLE, acceptor_);
        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
        proposalId = maxHistoricalProposalId_;
    }

    function bindEdgeGovernance(
        uint256 chainId_,
        address edgeGovernance_,
        IProver prover_
    ) external onlyRole(ADMIN_ROLE){
        require(edgeGovernances[chainId_].edgeGovernance == address(0), "chain has been bound");
        require(edgeGovernance_ != address(0), "invalid subcontractor address");
        require(Address.isContract(address(prover_)), "invalid prover address");
        edgeGovernances[chainId_] = EdgeGovernanceInfo(edgeGovernance_, prover_);
        emit EdgeGovernanceBound(chainId_, edgeGovernance_, address(prover_));
    }

    function bindGovernedContract(
        address governedContract
    ) external onlyRole(ADMIN_ROLE) {
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

    function propose(
        bytes calldata action //method abi
    ) external onlyRole(GOVERNANCE_PROPOSER_ROLE){
        bytes4 actionId = bytes4(Utils.bytesToBytes32(action));
        abi.decode(abi.encodePacked(bytes28(0), action),(bytes32,bytes32,address));
        
        if (!((actionId == IAccessControl.grantRole.selector) || (actionId == IAccessControl.revokeRole.selector))) {
            require(false, "invalid method");
        }
        proposalId++;
        proposals[proposalId] = action;
        emit GovernanceProposed(proposalId, action);
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
        bytes memory action //method abi
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
}