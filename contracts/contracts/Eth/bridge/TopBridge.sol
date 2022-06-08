// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;


import "../../common/AdminControlledUpgradeable.sol";
import "./ITopBridge.sol";
import "./TopDecoder.sol";
import "hardhat/console.sol";
import "../../../lib/external_lib/RLPDecode.sol";
import "../../../lib/external_lib/RLPEncode.sol";

contract TopBridge is  ITopBridge, AdminControlledUpgradeable {
    using RLPDecode for bytes;
    using RLPDecode for uint;
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;

    // Assumed to be even and to not exceed 256.
    uint constant MAX_BLOCK_PRODUCERS = 100;
    uint constant UNPAUSE_ALL = 0;
    uint constant PAUSED_DEPOSIT = 1;
    uint constant PAUSED_WITHDRAW = 2;
    uint constant PAUSED_ADD_BLOCK = 4;
    uint constant PAUSED_CHALLENGE = 8;
    uint constant PAUSED_VERIFY = 16;

    // Whether the contract was initialized.
    bool public initialized;
    uint64 public maxMainHeight;
    address public lastSubmitter;
    uint256 public lockEthAmount;

    Epoch thisEpoch;
    mapping(bytes32 => bool) public blockHashes;
    mapping(uint64 => bytes32) public blockMerkleRoots;
    mapping(uint64 => bool) public blockHeights;
    mapping(address => uint256) public balanceOf;

    struct Epoch {
        bytes32 epochId;
        uint numBPs;
        TopDecoder.SECP256K1PublicKey[MAX_BLOCK_PRODUCERS] keys;
        bytes32[MAX_BLOCK_PRODUCERS / 2] packedStakes;
        uint256 stakeThreshold;
    }
    
    bytes32 constant public ADDBLOCK_ROLE = keccak256("ADDBLOCK_ROLE");
    
    function initialize(
        uint256 _lockEthAmount,
        address _owner
    ) external initializer {
        require(_owner != address(0));
        lockEthAmount = _lockEthAmount;
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(_owner,UNPAUSE_ALL ^ 0xff);

        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _setRoleAdmin(ADDBLOCK_ROLE, OWNER_ROLE);
        _grantRole(OWNER_ROLE,_owner);
        _grantRole(ADDBLOCK_ROLE,_owner);

    }

    // function deposit() public payable override pausable(PAUSED_DEPOSIT) {
    //     require(msg.value == lockEthAmount && balanceOf[msg.sender] == 0);
    //     balanceOf[msg.sender] = msg.value;
    // }

    // function withdraw() public override pausable(PAUSED_WITHDRAW) {
    //     require(msg.sender != lastSubmitter);
    //     uint amount = balanceOf[msg.sender];
    //     require(amount != 0);
    //     balanceOf[msg.sender] = 0;
    //     payable(msg.sender).transfer(amount);
    // }

    function initWithBlock(bytes memory data) public override onlyRole(OWNER_ROLE) {
        require(!initialized, "Wrong initialization stage");
        initialized = true;

        TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);

        // require(topBlock.next_bps.some, "Initialization block must contain next_bps");
        // setBlockProducers(topBlock.next_bps.blockProducers, thisEpoch);
        blockHashes[topBlock.block_hash] = true;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = true;
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

    function _checkValidatorSignature(
        bytes32 block_hash,
        TopDecoder.Signature memory signature,
        TopDecoder.SECP256K1PublicKey storage publicKey
    ) internal view returns(bool) {
        return ecrecover(
            block_hash,
            signature.v + (signature.v < 27 ? 27 : 0),
            signature.r,
            signature.s
            ) == address(uint160(uint256(keccak256(abi.encodePacked(publicKey.x, publicKey.y)))));
    }

    /// @dev Batch synchronous  
    function addLightClientBlocks(bytes memory data) public override addLightClientBlock_able{
        require(initialized, "Contract is not initialized");
        RLPDecode.Iterator memory it = data.toRlpItem().iterator();
        while (it.hasNext()) {
            bytes memory _bytes = it.next().toBytes();
            addLightClientBlock(_bytes);
        }
    }

    function addLightClientBlock(bytes memory data) private {
        
        //  require(balanceOf[msg.sender] >= lockEthAmount, "Balance is not enough");

        TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);

        require(topBlock.inner_lite.height >= (maxMainHeight + 1),"height error");

        // require(topBlock.approvals_after_next.length >= thisEpoch.numBPs, "Approval list is too short");
        // uint256 votedFor = 0;
        // for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i != cnt; ++i) {
        //     bytes32 stakes = thisEpoch.packedStakes[i >> 1];
        //     if (topBlock.approvals_after_next[i].some) {
        //         votedFor += uint128(bytes16(stakes));
        //     }

        //     if (++i == cnt) {
        //         break;
        //     }
        //     if (topBlock.approvals_after_next[i].some) {
        //         votedFor += uint128(uint256(stakes));
        //     }
        // }
        // require(votedFor > thisEpoch.stakeThreshold, "Too few approvals");
        
        // for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i < cnt; i++) {
        //     TopDecoder.OptionalSignature memory approval = topBlock.approvals_after_next[i];
        //     if (approval.some) {
        //        bool success = _checkValidatorSignature(topBlock.block_hash, approval.signature, thisEpoch.keys[i]);
        //        require(success);
        //     }
        // }

        // if (topBlock.next_bps.some) {
        //     setBlockProducers(topBlock.next_bps.blockProducers, thisEpoch);
        // }

        blockHashes[topBlock.block_hash] = true;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = true;

        lastSubmitter = msg.sender;
        maxMainHeight = topBlock.inner_lite.height;
    }

    
    function setBlockProducers(TopDecoder.BlockProducer[] memory src, Epoch storage epoch) internal {
        uint cnt = src.length;
        require(cnt <= MAX_BLOCK_PRODUCERS, "It is not expected having that many block producers for the provided block");
        epoch.numBPs = cnt;
        unchecked {
            for (uint i = 0; i < cnt; i++) {
                epoch.keys[i] = src[i].publicKey;
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

    modifier addLightClientBlock_able(){
        require(( isPause(PAUSED_ADD_BLOCK)|| hasRole(ADDBLOCK_ROLE,_msgSender())),"without permission");
        _;
    }
}
