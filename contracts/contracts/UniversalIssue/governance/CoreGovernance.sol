// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../prover/IProver.sol";
import "../../common/AdminControlledUpgradeable.sol";

contract CoreGovernance is AdminControlledUpgradeable{
    uint256 public chainId;

    struct EdgeGovernanceInfo {
        address edgeGovernance;
        IProver prover;
    }

    event EdgeGovernanceBound(
        uint256 indexed chainId,
        address indexed edgeGovernance,
        address indexed prover
    );

    event GovernanceProposal(
        bytes32 indexed namespace,
        uint256 indexed id,
        uint256[] chains,
        bytes   proposal
    );

    //keccak256("BLACK.GOVERNANCE.ROLE")
    bytes32 constant BLACK_GOVERNANCE_ROLE = 0x5815e0e9225333c89575398fc48947fa6c0b7306b87716d0fcefc6b814f0e647;
    //keccak256("GOVERNANCE.PROPOSER.ROLE")
    bytes32 constant GOVERNANCE_PROPOSER_ROLE = 0xd5a906cf3ac93205af230c14cfaf12c82bbb6d36751ef6c37d190b7d9d4f3b4a;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSE_GOVERNANCE_PROPOSAL = 1 << 0;

    // chainId --- chainInfo
    mapping(uint256 => EdgeGovernanceInfo) public edgeGovernances;

    function initialize(
        uint256 chainId_,
        address owner_
    ) external initializer {
        require(owner_ != address(0), "invalid owner");

        chainId = chainId_;
        
        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_GOVERNANCE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(GOVERNANCE_PROPOSER_ROLE, ADMIN_ROLE);

        _grantRole(GOVERNANCE_PROPOSER_ROLE, _msgSender());
        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
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

    function propose(
        bytes32 namespace,
        uint256 id,
        uint256[] calldata chains,
        bytes calldata proposal
    ) external onlyRole(GOVERNANCE_PROPOSER_ROLE){
        for (uint256 i = 0; i < chains.length; i++) {
            require(edgeGovernances[chains[i]].edgeGovernance != address(0), "chain is not bound");
        }

        emit GovernanceProposal(namespace, id, chains, proposal);
    }
}