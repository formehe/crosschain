// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "./INearBridge.sol";
import "./NearDecoder.sol";
import "../../common/Ed25519.sol";

contract NearBridge is Initializable, INearBridge, AdminControlledUpgradeable {
    using Borsh for Borsh.Data;
    using NearDecoder for Borsh.Data;

    // Assumed to be even and to not exceed 256.
    uint constant MAX_BLOCK_PRODUCERS = 100;

    struct Epoch {
        bytes32 epochId;
        uint numBPs;
        bytes32[MAX_BLOCK_PRODUCERS] keys;
        bytes32[MAX_BLOCK_PRODUCERS / 2] packedStakes;
        uint256 stakeThreshold;
    }

    // Whether the contract was initialized.
    bool public initialized;
    uint256 public lockEthAmount;
    Ed25519 private edwards;
    Epoch thisEpoch;
    address lastSubmitter;
    
    mapping(uint64 => bytes32) blockHashes_;
    mapping(uint64 => bytes32) blockMerkleRoots_;
    mapping(bytes32 => uint64) blockHeights;
    mapping(address => uint256) public override balanceOf;

    uint64 maxMainHeight;
    
    function initialize(
        Ed25519 ed,
        uint256 _lockEthAmount,
        address _admin,
        uint256 _pausedFlags
    ) external initializer {
        edwards = ed;
        lockEthAmount = _lockEthAmount;
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(_admin, _pausedFlags);
    }

    uint constant UNPAUSE_ALL = 0;
    uint constant PAUSED_DEPOSIT = 1;
    uint constant PAUSED_WITHDRAW = 2;
    uint constant PAUSED_ADD_BLOCK = 4;
    uint constant PAUSED_CHALLENGE = 8;
    uint constant PAUSED_VERIFY = 16;

    function deposit() public payable override pausable(PAUSED_DEPOSIT) {
        require(msg.value == lockEthAmount && balanceOf[msg.sender] == 0);
        balanceOf[msg.sender] = msg.value;
    }

    function withdraw() public override pausable(PAUSED_WITHDRAW) {
        require(msg.sender != lastSubmitter);
        uint amount = balanceOf[msg.sender];
        require(amount != 0);
        balanceOf[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function initWithBlock(bytes memory data) public override onlyAdmin {
        require(!initialized, "Wrong initialization stage");
        initialized = true;

        Borsh.Data memory borsh = Borsh.from(data);
        NearDecoder.LightClientBlock memory topBlock = borsh.decodeLightClientBlock();
        borsh.done();

        require(topBlock.next_bps.some, "Initialization block must contain next_bps");
        setBlockProducers(topBlock.next_bps.blockProducers, thisEpoch);
        blockHashes_[topBlock.inner_lite.height] = topBlock.hash;
        blockMerkleRoots_[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.hash] = topBlock.inner_lite.height;
        maxMainHeight = topBlock.inner_lite.height;
    }

    struct BridgeState {
        uint currentHeight; // Height of the current confirmed block
        // If there is currently no unconfirmed block, the last three fields are zero.
        uint nextTimestamp; // Timestamp of the current unconfirmed block
        uint numBlockProducers; // Number of block producers for the current unconfirmed block
    }

    function bridgeState() public view returns (BridgeState memory res) {
        res.currentHeight = maxMainHeight;
        res.numBlockProducers = thisEpoch.numBPs;
    }

    function addLightClientBlock(bytes memory data) public override pausable(PAUSED_ADD_BLOCK) {
        require(initialized, "Contract is not initialized");
        require(balanceOf[msg.sender] >= lockEthAmount, "Balance is not enough");

        Borsh.Data memory borsh = Borsh.from(data);
        NearDecoder.LightClientBlock memory topBlock = borsh.decodeLightClientBlock();
        borsh.done();

        require(topBlock.inner_lite.height == (maxMainHeight + 1));

        require(topBlock.approvals_after_next.length >= thisEpoch.numBPs, "Approval list is too short");
        uint256 votedFor = 0;
        for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i != cnt; ++i) {
            bytes32 stakes = thisEpoch.packedStakes[i >> 1];
            if (topBlock.approvals_after_next[i].some) {
                votedFor += uint128(bytes16(stakes));
            }

            if (++i == cnt) {
                break;
            }
            if (topBlock.approvals_after_next[i].some) {
                votedFor += uint128(uint256(stakes));
            }
        }
        require(votedFor > thisEpoch.stakeThreshold, "Too few approvals");
        
        for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i < cnt; i++) {
            NearDecoder.OptionalSignature memory approval = topBlock.approvals_after_next[i];
            if (approval.some) {
                bytes memory message = abi.encodePacked(
                    uint8(0),
                    topBlock.hash,
                    Utils.swapBytes8(topBlock.inner_lite.height),
                    bytes23(0)
                );
                (bytes32 arg1, bytes9 arg2) = abi.decode(message, (bytes32, bytes9));
                NearDecoder.Signature memory signature = approval.signature;
                bool success = edwards.check(thisEpoch.keys[i], signature.r, signature.s, arg1, arg2);
                require(success);
            }
        }

        if (topBlock.next_bps.some) {
            setBlockProducers(topBlock.next_bps.blockProducers, thisEpoch);
        }

        blockHashes_[topBlock.inner_lite.height] = topBlock.hash;
        blockMerkleRoots_[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.hash] = topBlock.inner_lite.height;

        lastSubmitter = msg.sender;
        maxMainHeight = topBlock.inner_lite.height;
    }

    function setBlockProducers(NearDecoder.BlockProducer[] memory src, Epoch storage epoch) internal {
        uint cnt = src.length;
        require(cnt <= MAX_BLOCK_PRODUCERS, "It is not expected having that many block producers for the provided block");
        epoch.numBPs = cnt;
        unchecked {
            for (uint i = 0; i < cnt; i++) {
                epoch.keys[i] = src[i].publicKey.k;
            }
            uint256 totalStake = 0; // Sum of uint128, can't be too big.
            for (uint i = 0; i != cnt; ++i) {
                uint128 stake1 = src[i].stake;
                totalStake += stake1;
                if (++i == cnt) {
                    epoch.packedStakes[i >> 1] = bytes32(bytes16(stake1));
                    break;
                }
                uint128 stake2 = src[i].stake;
                totalStake += stake2;
                epoch.packedStakes[i >> 1] = bytes32(uint256(bytes32(bytes16(stake1))) + stake2);
            }
            epoch.stakeThreshold = (totalStake * 2) / 3;
        }
    }

    function blockHashes(uint64 height) public view override pausable(PAUSED_VERIFY) returns (bytes32 res) {
        res = blockHashes_[height];
    }

    function blockMerkleRoots(uint64 height) public view override pausable(PAUSED_VERIFY) returns (bytes32 res) {
        res = blockMerkleRoots_[height];
    }

    function getMaxHeight() public view override pausable(PAUSED_VERIFY) returns (uint64 height) {
        height = maxMainHeight;
    }

    function getHeightByHash(bytes32 hashCode) public view override pausable(PAUSED_VERIFY) returns (uint64 height) {
        height = blockHeights[hashCode];
    }
}
