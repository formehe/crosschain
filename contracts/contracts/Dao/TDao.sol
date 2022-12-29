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

    constructor(IVotes token_, uint256 voteDelay_, uint256 votePeriod_, uint256 quorumNumerator_, TimelockController timelock_, address owner_)
        Governor("TDao")
        GovernorVotes(token_)
        GovernorSettings(voteDelay_, votePeriod_, 0)
        GovernorVotesQuorumFraction(quorumNumerator_)
        GovernorTimelockControl(timelock_)
    {
        require(Address.isContract(address(token_)), "voter token must be existed");
        require(voteDelay_ != 0, " vote delay can not be 0");
        require(votePeriod_ != 0, " vote period can not be 0");
        require(quorumNumerator_ != 0, " quorum numerator can not be 0");
        require(Address.isContract(address(timelock_)), "time clock controller must be existed");
        
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function initialize() 
        external initializer 
    {
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
        bytes memory  payload = abi.encodeWithSignature("getMaxPersonalVotes()");
        (bool success, bytes memory result) = address(token).staticcall(payload);
        require(success, "fail to call getMaxPersonalVotes");
        uint256 threshold = abi.decode(result,(uint256));
        require(newProposalThreshold <= threshold, "threshold is overflow");
        GovernorSettings.setProposalThreshold(newProposalThreshold);
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
        return GovernorCompatibilityBravo.propose(targets, values, calldatas, description);
    }

    function propose(address[] memory targets, uint256[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) 
        public 
        override accessable_and_unpauseable(BLACK_ROLE, PAUSED_PROPOSE)
        returns (uint256)
    {
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