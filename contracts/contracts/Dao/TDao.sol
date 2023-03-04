// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../common/AdminControlledUpgradeable.sol";

contract TDao is GovernorCompatibilityBravo, GovernorVotes, GovernorVotesQuorumFraction, GovernorSettings, GovernorTimelockControl, AdminControlledUpgradeable {
    uint256 constant UNPAUSED_ALL = 0;
    uint256 constant PAUSED_PROPOSE = 1 << 0;
    uint256 constant PAUSED_QUEUE = 1 << 1;
    uint256 constant PAUSED_EXECUTE = 1 << 2;
    uint256 constant PAUSED_CANCEL = 1 << 3;
    uint256 constant PAUSED_VOTE = 1 << 4;

    uint256 constant public proposalMaxOperations = 10; // 10 actions
    uint public constant MIN_VOTING_DELAY = 1;
    uint public constant MIN_VOTING_PERIOD = 1;

    constructor(IVotes vote_, uint256 voteDelay_, uint256 votePeriod_, uint256 quorumNumerator_, TimelockController timelock_, address owner_)
        Governor("TDao")
        GovernorVotes(vote_)
        GovernorSettings(voteDelay_, votePeriod_, 1)
        GovernorVotesQuorumFraction(quorumNumerator_)
        GovernorTimelockControl(timelock_)
        initializer
    {
        require(Address.isContract(address(vote_)), "voter token must be existed");
        require(voteDelay_ >= MIN_VOTING_DELAY, "vote delay can not less than MIN_VOTING_DELAY");
        // require(votePeriod_ >= MIN_VOTING_PERIOD, "vote period can not not less than MIN_VOTING_PERIOD");
        require(quorumNumerator_ != 0, " quorum numerator can not be 0");
        require(Address.isContract(address(timelock_)), "time clock controller must be existed");
        
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());

        _AdminControlledUpgradeable_init(_msgSender(), 0);
    }

    function proposalThreshold() 
        public 
        view 
        override(Governor, GovernorSettings)
        returns (uint256) 
    {
        return GovernorSettings.proposalThreshold();
    }

    function setProposalThreshold(uint256 newProposalThreshold) 
        public 
        override onlyGovernance 
    {
        require(newProposalThreshold >= 1, "proposalThreshold can not less than 1");
        bytes memory  payload = abi.encodeWithSignature("getMaxPersonalVotes()");
        (bool success, bytes memory result) = address(token).staticcall(payload);
        require(success, "fail to call getMaxPersonalVotes");
        uint256 threshold = abi.decode(result,(uint256));
        require(newProposalThreshold <= threshold, "threshold is overflow");
        GovernorSettings.setProposalThreshold(newProposalThreshold);
    }

    function setVotingDelay(uint256 newVotingDelay) 
        public 
        override onlyGovernance 
    {
        require(newVotingDelay >= MIN_VOTING_DELAY, " vote delay can not less than MIN_VOTING_DELAY");
        _setVotingDelay(newVotingDelay);
    }

    /**
     * @dev Update the voting period. This operation can only be performed through a governance proposal.
     *
     * Emits a {VotingPeriodSet} event.
     */
    function setVotingPeriod(uint256 newVotingPeriod) 
        public 
        override onlyGovernance 
    {
        // require(newVotingPeriod >= MIN_VOTING_PERIOD, " vote period can not not less than MIN_VOTING_PERIOD");
        _setVotingPeriod(newVotingPeriod);
    }

    function updateQuorumNumerator(uint256 newQuorumNumerator) 
        external
        override onlyGovernance 
    {
        require(newQuorumNumerator != 0, "quorumNumerator can not be 0");
        _updateQuorumNumerator(newQuorumNumerator);
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return (token.getPastTotalSupply(blockNumber) * quorumNumerator() + quorumDenominator() - 1) / quorumDenominator();
    }

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotes)
        returns (uint256)
    {
        return GovernorVotes.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, IGovernor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return GovernorTimelockControl.state(proposalId);
    }

    function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
        public
        override(Governor, GovernorCompatibilityBravo, IGovernor) accessable_and_unpauseable(BLACK_ROLE, PAUSED_PROPOSE)
        returns (uint256)
    {
        require(targets.length <=  proposalMaxOperations, "too many actions");
        for (uint256 i = 0; i < targets.length; i++) {
            require(Address.isContract(targets[i]), "invalid contract");
        }
        return GovernorCompatibilityBravo.propose(targets, values, calldatas, description);
    }

    function propose(address[] memory targets, uint256[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) 
        public 
        override accessable_and_unpauseable(BLACK_ROLE, PAUSED_PROPOSE)
        returns (uint256)
    {
        require(targets.length <=  proposalMaxOperations, "too many actions");
        for (uint256 i = 0; i < targets.length; i++) {
            require(Address.isContract(targets[i]), "invalid contract");
        }
        return GovernorCompatibilityBravo.propose(targets, values, signatures, calldatas, description);
    }

    function queue(uint256 proposalId) 
        public
        override accessable_and_unpauseable(BLACK_ROLE, PAUSED_QUEUE)
    {
        GovernorCompatibilityBravo.queue(proposalId);
    }

    function queue(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) 
        public
        override(GovernorTimelockControl, IGovernorTimelock) accessable_and_unpauseable(BLACK_ROLE, PAUSED_QUEUE)
        returns (uint256)
    {
        return GovernorTimelockControl.queue(targets, values, calldatas, descriptionHash);
    }

    function execute(uint256 proposalId) 
        public
        payable
        override accessable_and_unpauseable(BLACK_ROLE, PAUSED_EXECUTE)
    {
        GovernorCompatibilityBravo.execute(proposalId);
    }

    function cancel(uint256 proposalId) 
        public
        override accessable_and_unpauseable(BLACK_ROLE, PAUSED_CANCEL)
    {
        GovernorCompatibilityBravo.cancel(proposalId);
    }

    function castVote(uint256 proposalId, uint8 support) 
        public 
        override(Governor, IGovernor) accessable_and_unpauseable(BLACK_ROLE, PAUSED_VOTE)
        returns (uint256) 
    {
        return Governor.castVote(proposalId, support);
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
    {
        GovernorTimelockControl._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return GovernorTimelockControl._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return GovernorTimelockControl._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, IERC165, GovernorTimelockControl, AccessControl)
        returns (bool)
    {
        return GovernorTimelockControl.supportsInterface(interfaceId) || 
               Governor.supportsInterface(interfaceId) || 
               AccessControl.supportsInterface(interfaceId);
    }
}