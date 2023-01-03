// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract ImmutableVotes is IVotes {
    struct Checkpoint {
        uint256 fromBlock;
        uint256 votes;
    }

    bytes32 private constant _DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    mapping(address => uint256) private _checkpoints;
    Checkpoint private _totalSupplyCheckpoint;

    constructor(address[] memory voters) {
        require(voters.length >= 3, "number of voters must more than 3");
        for (uint256 i = 0; i < voters.length; i++) {
            require(voters[i] != address(0), "invalid voter");
            require(_checkpoints[voters[i]] == 0, "voter can not be repeated");
            _checkpoints[voters[i]] = 1;
        }

        _totalSupplyCheckpoint = Checkpoint(block.number, voters.length);
    }

    function getMaxPersonalVotes() external pure returns (uint256) {
        return 1;
    }

    function getVotes(address account) override external view returns (uint256) {
        return _checkpoints[account];
    }

    function getPastVotes(address account, uint256 blockNumber) override external view returns (uint256) {
        require(blockNumber < block.number, "block not yet mined");
        return _checkpoints[account];
    }

    function getPastTotalSupply(uint256 blockNumber) override external view returns (uint256) {
        require(blockNumber < block.number, "block not yet mined");
        return _totalSupplyCheckpoint.votes;
    }

    function delegates(address /*account*/) override external pure returns (address) {
        require(false, "not support");
    }

    function delegate(address /*delegatee*/) override external pure{
        require(false, "not support");
    }

    function delegateBySig(
        address /*delegatee*/,
        uint256 /*nonce*/,
        uint256 /*expiry*/,
        uint8 /*v*/,
        bytes32 /*r*/,
        bytes32 /*s*/
    ) override external pure {
        require(false, "not support");
    }
}