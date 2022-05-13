// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "../common/AdminControlledUpgradeable1.sol";
import "../common/Borsh.sol";
import "./prover/ProofDecoder.sol";
import "./Locker.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract LockerProxy is AdminControlledUpgradeable1{
    
    mapping(address => address) internal assetHashMap;
    
    Locker internal locker;
    address internal lockProxyHash;
    uint64 internal minBlockAcceptanceHeight;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    bytes32 constant public OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 constant public ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bytes32 constant public BLACK_UN_LOCK_ADMIN_ROLE = keccak256("BLACK_UN_LOCK_ROLE");
    bytes32 constant public BLACK_LOCK_ADMIN_ROLE = keccak256("BLACK_LOCK_ROLE");

    event Locked (
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 amount,
        address receiver
    );

    event Unlocked (
        uint256 amount,
        address recipient
    );

    event BindAsset(
        address fromAssetHash,
        address toAssetHash
    );

    function _lockerProxy_initialize(
        uint256 _pausedFlags
    ) internal initializer {
        AdminControlledUpgradeable1._AdminControlledUpgradeable_init(_pausedFlags);

        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ADMIN_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_UN_LOCK_ADMIN_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_LOCK_ADMIN_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, _msgSender());
    } 

    function bindAssetHash(address fromAssetHash, address toAssetHash) external onlyRole(ADMIN_ROLE) returns (bool) {
        require((fromAssetHash != address(0)) && (toAssetHash != address(0)), "both asset addresses are not to be 0");
        assetHashMap[fromAssetHash] = toAssetHash;
        emit BindAsset(fromAssetHash, toAssetHash);
        return true;
    }

    modifier lockToken_pausable(){
        require(!hasRole(BLACK_LOCK_ADMIN_ROLE,_msgSender()) && (paused & PAUSED_UNLOCK) == 0 || hasRole(ADMIN_ROLE,_msgSender()));
        _;
    }

    modifier unLock_pausable(){
        require(!hasRole(BLACK_UN_LOCK_ADMIN_ROLE,_msgSender())&& (paused & PAUSED_UNLOCK) == 0 || hasRole(ADMIN_ROLE,_msgSender()));
        _;
    }

}