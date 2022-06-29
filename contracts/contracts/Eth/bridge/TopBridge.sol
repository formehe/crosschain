// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;


import "../../common/AdminControlledUpgradeable.sol";
import "./ITopBridge.sol";
import "./TopDecoder.sol";
import "hardhat/console.sol";
import "../../../lib/external_lib/RLPDecode.sol";
import "../../../lib/external_lib/RLPEncode.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

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

    Epoch[2] internal epochs;
    uint private currentEpochIdex;

    mapping(bytes32 => bool) public blockHashes;
    mapping(uint64 => bytes32) public blockMerkleRoots;
    mapping(uint64 => uint256) public blockHeights;
    mapping(address => uint256) public balanceOf;

    struct Epoch {
        uint64 epochId;
        uint numBPs;
        TopDecoder.SECP256K1PublicKey[MAX_BLOCK_PRODUCERS] keys;
        bytes32[MAX_BLOCK_PRODUCERS / 2] packedStakes;
        uint256 stakeThreshold;
        uint64 ownerHeight;
    }
    
    bytes32 constant public ADDBLOCK_ROLE = 0xf36087c19d4404e16d698f98ed7d63f18bd7e07261603a15ab119b9c73979a86;
    
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

        require(topBlock.next_bps.some, "Initialization block must contain next_bps");
        setBlockProducers(topBlock.next_bps.blockProducers,topBlock.next_bps.epochId, topBlock.inner_lite.height);
        blockHashes[topBlock.block_hash] = true;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = block.timestamp;
        maxMainHeight = topBlock.inner_lite.height;
    }

    struct BridgeState {
        uint currentHeight; // Height of the current confirmed block
        // If there is currently no unconfirmed block, the last three fields are zero.
        //uint currentEpochHeight;
        uint nextTimestamp; // Timestamp of the current unconfirmed block
        uint numBlockProducers; // Number of block producers for the current unconfirmed block
    }

    function bridgeState() public view returns (BridgeState memory state) {
        state = BridgeState(epochs[currentEpochIdex].ownerHeight,
                block.timestamp,
                epochs[currentEpochIdex].numBPs);
    }

    function _checkValidatorSignature(
        bytes32 block_hash,
        TopDecoder.Signature memory signature,
        TopDecoder.SECP256K1PublicKey memory publicKey
    ) internal pure returns(bool) {
        uint8  _v = signature.v + (signature.v < 27 ? 27 : 0);
        bytes memory signatureBytes = abi.encodePacked(signature.r,signature.s,_v);
        (address _address,) = ECDSA.tryRecover(block_hash,signatureBytes);
        return _address == publicKey.signer;

    }

    /// @dev Batch synchronous  
    function addLightClientBlocks(bytes memory data) public override addLightClientBlock_able{
        require(initialized, "Contract is not initialized");
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(data).iterator();
        while (it.hasNext()) {
            bytes memory _bytes = it.next().toBytes();
            addLightClientBlock(_bytes);
        }
    }

    // function addLightClientBlock(bytes memory data) internal {
    //     //  require(balanceOf[msg.sender] >= lockEthAmount, "Balance is not enough");
    //     TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);
    //     require(topBlock.inner_lite.height >= (maxMainHeight + 1),"height error");

    //     Epoch memory thisEpoch = getValidationEpoch(topBlock.inner_lite.epoch_id);
    //     require(topBlock.approvals_after_next.length >= thisEpoch.numBPs, "Approval list is too short");

    //     uint256 votedFor = 0;
    //     for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i != cnt; ++i) {
    //         bytes32 stakes = thisEpoch.packedStakes[i >> 1];
    //         if (topBlock.approvals_after_next[i].some) {
    //             votedFor += uint128(bytes16(stakes));
    //         }

    //         if (++i == cnt) {
    //             break;
    //         }
    //         if (topBlock.approvals_after_next[i].some) {
    //             votedFor += uint128(uint256(stakes));
    //         }
    //     }

    //     require(topBlock.approvals_after_next.length > thisEpoch.stakeThreshold, "Too few approvals");
        
    //     for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i < cnt; i++) {
    //         TopDecoder.OptionalSignature memory approval = topBlock.approvals_after_next[i];
    //         if (approval.some) {
    //            bool success = _checkValidatorSignature(topBlock.block_hash, approval.signature, thisEpoch.keys[i]);
    //            require(success);
    //         }
    //     }

    //     if (topBlock.next_bps.some) {
    //         setBlockProducers(topBlock.next_bps.blockProducers, topBlock.next_bps.epochId);
    //     }

    //     blockHashes[topBlock.block_hash] = true;
    //     blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
    //     blockHeights[topBlock.inner_lite.height] = true;

    //     lastSubmitter = msg.sender;
    //     maxMainHeight = topBlock.inner_lite.height;
    // }


    function addLightClientBlock(bytes memory data) internal {
        //require(balanceOf[msg.sender] >= lockEthAmount, "Balance is not enough");
        TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);
        //require(topBlock.inner_lite.height > (epochs[currentEpochIdex].ownerHeight), "height must higher than epoch block height");
        require(topBlock.inner_lite.height == (maxMainHeight + 1), "height must higher than epoch block height");
        require(blockHeights[topBlock.inner_lite.height] == 0, "block is exsisted");

        Epoch memory thisEpoch = getValidationEpoch(topBlock.inner_lite.epoch_id);
        console.log("need epoch_id, epoch id:", topBlock.inner_lite.epoch_id, thisEpoch.epochId);
        uint votedFor = 0;
        for (uint i = 0; i < thisEpoch.numBPs; i++) {
            TopDecoder.OptionalSignature memory approval = topBlock.approvals_after_next[i];
            if (!approval.some) {
                continue;
            }

            bool success = _checkValidatorSignature(topBlock.block_hash, approval.signature, thisEpoch.keys[i]);
            if(success){
                votedFor++;
            }
        }

        console.log("vote, num bps:", votedFor, thisEpoch.stakeThreshold);
        require(votedFor >= thisEpoch.stakeThreshold, "Too few approvals");

        if (topBlock.next_bps.some) {
            require(topBlock.next_bps.epochId == epochs[currentEpochIdex].epochId + 1 ,"Failure of the epochId");
            setBlockProducers(topBlock.next_bps.blockProducers, topBlock.next_bps.epochId, topBlock.inner_lite.height);
        }

        blockHashes[topBlock.block_hash] = true;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = block.timestamp;

        lastSubmitter = msg.sender;
        maxMainHeight = topBlock.inner_lite.height;
    }

    // function setBlockProducers(TopDecoder.BlockProducer[] memory src,uint64 epochId) internal {
    //     Epoch memory epoch;
    //     uint cnt = src.length;
    //     require(cnt <= MAX_BLOCK_PRODUCERS, "It is not expected having that many block producers for the provided block");
    //     epoch.epochId = epochId;
    //     epoch.numBPs = cnt;
    //     unchecked {
    //         for (uint i = 0; i < cnt; i++) {
    //             epoch.keys[i] = src[i].publicKey;
    //         }
    //         uint256 totalStake = 0; // Sum of uint128, can't be too big.
    //         for (uint i = 0; i != cnt; ++i) {
    //             uint128 stake1 = src[i].stake;
    //             totalStake += stake1;
    //             if (++i == cnt) {
    //                 epoch.packedStakes[i >> 1] = bytes32(bytes16(stake1));
    //                 break;
    //             }
    //             uint128 stake2 = src[i].stake;
    //             totalStake += stake2;
    //             epoch.packedStakes[i >> 1] = bytes32(uint256(bytes32(bytes16(stake1))) + stake2);
    //         }
    //         epoch.stakeThreshold = (totalStake * 2 + 2) / 3;

    //     }
    //     addEpochs(epoch);
    // }

    function setBlockProducers(TopDecoder.BlockProducer[] memory src,uint64 epochId, uint64 blockHeight) internal {
        uint cnt = src.length;        
        require(cnt <= MAX_BLOCK_PRODUCERS, "It is not expected having that many block producers for the provided block");
        if (currentEpochIdex == (epochs.length - 1)) {
            currentEpochIdex = 0;
        } else {
            currentEpochIdex++;
        }

        unchecked {
            for (uint i = 0; i < cnt; i++) {
                epochs[currentEpochIdex].keys[i] = src[i].publicKey;
            }
        }

        epochs[currentEpochIdex].stakeThreshold = ((cnt << 1) + 2) / 3;
        epochs[currentEpochIdex].ownerHeight = blockHeight;

        console.log("ownerHeight:", epochs[currentEpochIdex].ownerHeight);
        epochs[currentEpochIdex].epochId = epochId;
        epochs[currentEpochIdex].numBPs = cnt;
    }
 
    /// @dev Gets the validated election block
    function getValidationEpoch(uint64 epochId) private view returns(Epoch memory epoch){
        uint cnt = epochs.length;
        for ((uint i, uint num) = (currentEpochIdex, 0); num < cnt; num++) {
            if(epochs[i].epochId == epochId){
                epoch = epochs[i];
                break;
            }

            if (i == (cnt - 1)) {
                i = 0;
            } else {
                i++;
            }
        }

        require(epoch.numBPs > 0 ,"without numBPs");
        return epoch;
    }

    modifier addLightClientBlock_able(){
        require(( isPause(PAUSED_ADD_BLOCK) && hasRole(ADDBLOCK_ROLE,_msgSender())),"without permission");
        _;
    }
}
