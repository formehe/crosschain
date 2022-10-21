// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;


import "../../common/AdminControlledUpgradeable.sol";
import "./ITopBridgeEx.sol";
import "../../../lib/external_lib/RLPDecode.sol";
import "../../../lib/external_lib/RLPEncode.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../../common/Deserialize.sol";
import "../governance/IGovernanceCapability.sol";

contract TopBridgeEx is  ITopBridgeEx, AdminControlledUpgradeable, IGovernanceCapability {
    using RLPDecode for bytes;
    using RLPDecode for uint;
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;

    event BlockBridgeInitial(
        uint256 indexed height,
        bytes32 indexed blockHash,
        address  indexed submitter
    );

    event BlockAdded(
        uint256  indexed height,
        bytes32  indexed blockHash,
        address  indexed submitter
    );

    // Assumed to be even and to not exceed 256.
    uint constant private MAX_BLOCK_PRODUCERS = 100;
    uint constant private UNPAUSE_ALL = 0;
    uint constant private PAUSED_ADD_BLOCK = 1;

    // Whether the contract was initialized.
    bool public initialized;
    uint64 public maxMainHeight;
    address public lastSubmitter;

    Epoch[2] internal epochs;
    uint private currentEpochIdex;

    uint64[] heights;
    mapping(uint64 => bytes32) public blockHashes;
    mapping(uint64 => bytes32) public blockMerkleRoots;
    mapping(uint64 => uint256) public blockHeights;

    struct Epoch {
        uint64 epochId;
        uint numBPs;
        Deserialize.SECP256K1PublicKey[MAX_BLOCK_PRODUCERS] keys;
        bytes32[MAX_BLOCK_PRODUCERS / 2] packedStakes;
        uint256 stakeThreshold;
        uint64 ownerHeight;
    }
    
    bytes32 constant private ADDBLOCK_ROLE = 0xf36087c19d4404e16d698f98ed7d63f18bd7e07261603a15ab119b9c73979a86;
    
    function initialize(
        address _owner
    ) external initializer {
        require(_owner != address(0));
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(msg.sender, UNPAUSE_ALL ^ 0xff);

        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        // _setRoleAdmin(ADDBLOCK_ROLE, ADMIN_ROLE);
        // _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ADDBLOCK_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);
        _grantRole(OWNER_ROLE,_owner);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function initWithBlock(bytes memory data) public override onlyRole(ADMIN_ROLE) {
        require(!initialized, "Wrong initialization stage");
        initialized = true;

        Deserialize.LightClientBlock memory topBlock = Deserialize.decodeLightClientBlock(data);

        require(topBlock.inner_lite.next_bps.some, "Initialization block must contain next_bps");
        setBlockProducers(topBlock.inner_lite.next_bps.blockProducers,topBlock.inner_lite.next_bps.epochId, topBlock.inner_lite.height);
        blockHashes[topBlock.inner_lite.height] = topBlock.block_hash;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = block.timestamp;
        heights.push(topBlock.inner_lite.height);
        maxMainHeight = topBlock.inner_lite.height;
        emit BlockBridgeInitial(topBlock.inner_lite.height, topBlock.block_hash, msg.sender);
    }

    // function fork(bytes memory epoch0, bytes memory epoch1, bytes memory forkpoint) public onlyRole(ADMIN_ROLE) {
    //     Deserialize.LightClientBlock memory topForkpoint = Deserialize.decodeLightClientBlock(forkpoint);
    //     for (uint256 i = 0; i < heights.length; i++) {
    //         uint64 height = heights[i];
    //         if (height >= topForkpoint.inner_lite.height) {
    //             delete blockHashes[height];
    //             delete blockMerkleRoots[height];
    //             delete blockHeights[height];
    //         }
    //     }

    //     currentEpochIdex = 0;
    //     delete heights;

    //     Deserialize.LightClientBlock memory topEpoch0 = Deserialize.decodeLightClientBlock(epoch0);
    //     require(topEpoch0.inner_lite.next_bps.some, "Initialization block must contain next_bps");
    //     setBlockProducers(topEpoch0.inner_lite.next_bps.blockProducers,topEpoch0.inner_lite.next_bps.epochId, topEpoch0.inner_lite.height);
    //     blockHashes[topEpoch0.inner_lite.height] = topEpoch0.block_hash;
    //     blockMerkleRoots[topEpoch0.inner_lite.height] = topEpoch0.inner_lite.block_merkle_root;
    //     blockHeights[topEpoch0.inner_lite.height] = block.timestamp;
    //     maxMainHeight = topEpoch0.inner_lite.height;

    //     bytes32 epoch1Hash = keccak256(epoch1);
    //     if (epoch1Hash != keccak256(epoch0)) {
    //         addLightClientBlock(epoch1);
    //     }
        
    //     if (epoch1Hash != keccak256(forkpoint)) {
    //         addLightClientBlock(forkpoint);
    //     }
    // }

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
        Deserialize.Signature memory signature,
        Deserialize.SECP256K1PublicKey memory publicKey
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

    function addLightClientBlock(bytes memory data) internal {
        Deserialize.LightClientBlock memory topBlock = Deserialize.decodeLightClientBlock(data);
        if(uint(topBlock.inner_lite.receipts_root_hash) != 0){
            return;
        }

        require(topBlock.inner_lite.height > (epochs[currentEpochIdex].ownerHeight), "height must higher than epoch block height");

        require(blockHeights[topBlock.inner_lite.height] == 0, "block is exsisted");

        Epoch memory thisEpoch = getValidationEpoch(topBlock.approvals.epochId);

        uint votedFor = 0;
        for (uint i = 0; i < thisEpoch.numBPs; i++) {
            Deserialize.OptionalSignature memory approval = topBlock.approvals.approvals_after_next[i];
            if (!approval.some) {
                continue;
            }

            bool success = _checkValidatorSignature(topBlock.signature_hash, approval.signature, thisEpoch.keys[i]);
            if(success){
                votedFor++;
            }
        }

        require(votedFor >= thisEpoch.stakeThreshold, "Too few approvals");

        if (topBlock.inner_lite.next_bps.some) {
            require(topBlock.inner_lite.next_bps.epochId == epochs[currentEpochIdex].epochId + 1 ,"Failure of the epochId");
            setBlockProducers(topBlock.inner_lite.next_bps.blockProducers, topBlock.inner_lite.next_bps.epochId, topBlock.inner_lite.height);
        }

        heights.push(topBlock.inner_lite.height);
        blockHashes[topBlock.inner_lite.height] = topBlock.block_hash;
        blockMerkleRoots[topBlock.inner_lite.height] = topBlock.inner_lite.block_merkle_root;
        blockHeights[topBlock.inner_lite.height] = block.timestamp;

        lastSubmitter = msg.sender;
        maxMainHeight = topBlock.inner_lite.height;
        emit BlockAdded(topBlock.inner_lite.height, topBlock.block_hash, msg.sender);
    }

    function setBlockProducers(Deserialize.BlockProducer[] memory src, uint64 epochId, uint64 blockHeight) internal {
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

        epochs[currentEpochIdex].stakeThreshold = (cnt << 1) / 3 + 1;
        epochs[currentEpochIdex].ownerHeight = blockHeight;

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

    function checkBlock(uint64 blockHeight, bytes32 blockHash) public view returns(bool) {
        require(uint256(blockHash) != 0, "blockHash can not be 0");
        if (blockHashes[blockHeight] == blockHash) {
            return true;
        }

        return false;
    }

    modifier addLightClientBlock_able(){
        require((isPause(PAUSED_ADD_BLOCK) && hasRole(ADDBLOCK_ROLE,_msgSender())),"without permission");
        _;
    }

    function isSupportCapability(
        bytes32 /*classId*/,
        bytes32 subClass,
        bytes memory action
    ) external pure override returns (bool) {
        bytes4 actionId = bytes4(Utils.bytesToBytes32(action));
        
        if (!((subClass == ADMIN_ROLE)  || (subClass == CONTROLLED_ROLE) || 
             (subClass == ADDBLOCK_ROLE))) {
            return false;
        }

        if (!((actionId == IAccessControl.grantRole.selector) || (actionId == IAccessControl.revokeRole.selector))) {
            return false;
        }

        return true;
    }
}
