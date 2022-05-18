// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "../common/AdminControlledUpgradeable1.sol";
import "../common/Borsh.sol";
import "./prover/ProofDecoder.sol";
import "./Locker.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract LockerProxy is Locker,AdminControlledUpgradeable1{
    
    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;
    bool public isEth;
    bytes32 constant public BLACK_UN_LOCK_ROLE = keccak256("BLACK_UN_LOCK_ROLE");
    bytes32 constant public BLACK_LOCK_ROLE = keccak256("BLACK_LOCK_ROLE");

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
        address toAssetHash,
        address peerLockProxyHash
    );

    function _lockerProxy_initialize(
        INearProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        bool _isEth
    ) internal onlyInitializing{
        require(_owner != address(0));
        isEth = _isEth;
        AdminControlledUpgradeable1._AdminControlledUpgradeable_init(_owner,UNPAUSED_ALL ^ 0xff);
        Locker._locker_initialize(_prover,_minBlockAcceptanceHeight);

        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);

        _setRoleAdmin(BLACK_UN_LOCK_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_LOCK_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE,_owner);
        _grantRole(WITHDRAWAL_ROLE,_owner);

       
    } 

    function bindAssetHash(address _fromAssetHash, address _toAssetHash,address _peerLockProxyHash) external onlyRole(OWNER_ROLE) returns (bool) {
        if(isEth){
            require(_toAssetHash != address(0) && _peerLockProxyHash != address(0), "both asset addresses are not to be 0");
        }else{
            require(_fromAssetHash != address(0) && _toAssetHash != address(0) && _peerLockProxyHash != address(0), "both asset addresses are not to be 0");
        }
   
        assetHashMap[_fromAssetHash] = ToAddressHash({
            toAssetHash:_toAssetHash,
            peerLockProxyHash:_peerLockProxyHash
        });
        emit BindAsset(_fromAssetHash, _toAssetHash,_peerLockProxyHash);
        return true;
    }

    modifier lockToken_pauseable(){
        require(!hasRole(BLACK_LOCK_ROLE,_msgSender()) && ((paused & PAUSED_LOCK) == 0 || hasRole(CONTROLLED_ROLE,_msgSender())),"has been pause");
        _;
    }

    modifier unLock_pauseable(){
        require(!hasRole(BLACK_UN_LOCK_ROLE,_msgSender())&& ((paused & PAUSED_UNLOCK) == 0 || hasRole(CONTROLLED_ROLE,_msgSender())),"has been pause");
        _;
    }

}