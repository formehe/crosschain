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

    Epoch[] public epochs;

    mapping(bytes32 => bool) public blockHashes;
    mapping(uint64 => bytes32) public blockMerkleRoots;
    mapping(uint64 => bool) public blockHeights;
    mapping(address => uint256) public balanceOf;

    struct Epoch {
        uint64 epochId;
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

        initEpochs();

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
        setBlockProducers(topBlock.next_bps.blockProducers,topBlock.next_bps.epochId);
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

    function bridgeState() public view returns (BridgeState[] memory ) {
        uint cnt = epochs.length;
        BridgeState[] memory res = new BridgeState[](cnt);
        for (uint i = 0; i < cnt; i++) {
            BridgeState memory state = BridgeState({
                currentHeight: maxMainHeight,
                nextTimestamp:block.timestamp,
                numBlockProducers: epochs[i].numBPs
            });
            res[i] = state;
        }
        return res;
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
        //  require(balanceOf[msg.sender] >= lockEthAmount, "Balance is not enough");
        TopDecoder.LightClientBlock memory topBlock = TopDecoder.decodeLightClientBlock(data);
        require(topBlock.inner_lite.height >= (maxMainHeight + 1),"height error");

        Epoch memory thisEpoch = getValidationEpoch(topBlock.inner_lite.epoch_id);

        uint votedFor = 0;
        uint256 approvalsLength = topBlock.approvals_after_next.length;
        for ((uint i, uint cnt) = (0, thisEpoch.numBPs); i < cnt; i++) {
            for (uint j = 0; j < approvalsLength; j++) {
                 TopDecoder.OptionalSignature memory approval = topBlock.approvals_after_next[j];
                 bool success = _checkValidatorSignature(topBlock.block_hash, approval.signature, thisEpoch.keys[i]);
                 if(success){
                    votedFor++;
                 }

            }
        }

        require(votedFor >= thisEpoch.stakeThreshold, "Too few approvals");

        if (topBlock.next_bps.some) {
            setBlockProducers(topBlock.next_bps.blockProducers, topBlock.next_bps.epochId);
        }

        blockHashes[topBlock.block_hash] = true;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = true;

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
    //         epoch.stakeThreshold = (totalStake * 2 + 3 -1) / 3;

    //     }
    //     addEpochs(epoch);
    // }

    function setBlockProducers(TopDecoder.BlockProducer[] memory src,uint64 epochId) internal {
        Epoch memory epoch;
        uint cnt = src.length;
        require(cnt <= MAX_BLOCK_PRODUCERS, "It is not expected having that many block producers for the provided block");
        epoch.epochId = epochId;
        epoch.numBPs = cnt;
        unchecked {
            for (uint i = 0; i < cnt; i++) {
                epoch.keys[i] = src[i].publicKey;
            }
            epoch.stakeThreshold = (cnt * 2 + 3 -1) / 3;
        }

        addEpochs(epoch);
    }
    
    /// @dev init Epochs 
    function initEpochs() private{
        epochs.push();
        epochs.push();
    }

    /// @dev add Epochs 
    function addEpochs(Epoch memory epoch) private{
        epochs[0] = epochs[1];

        epochs.pop();
        epochs.push();

        Epoch storage epoch1 = epochs[1];
        epoch1.numBPs = epoch.numBPs;
        epoch1.packedStakes = epoch.packedStakes;
        epoch1.stakeThreshold = epoch.stakeThreshold;
        epoch1.epochId = epoch.epochId;
  
        delete epoch1.keys;
        uint cnt = epoch.keys.length;
        for (uint i = 0; i < cnt; i++) {
            epoch1.keys[i] = epoch.keys[i];
        }
    }
    
    /// @dev Gets the validated election block
    function getValidationEpoch(uint64 epochId) private view returns(Epoch memory epoch){
        uint cnt = epochs.length;
        for (uint i = 0; i < cnt; i++) {
            if(epochs[i].epochId == epochId){
                epoch = epochs[i];
                break;
            }
        }
        return epoch;
    }

    modifier addLightClientBlock_able(){
        require(( isPause(PAUSED_ADD_BLOCK)|| hasRole(ADDBLOCK_ROLE,_msgSender())),"without permission");
        _;
    }
}
