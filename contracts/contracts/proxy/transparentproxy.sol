// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "@openzeppelin/contracts/utils/Address.sol";
// import "hardhat/console.sol";

contract TransparentProxy is ERC1967Proxy {
    constructor(address logic_, address admin_, address owner_) ERC1967Proxy(logic_, bytes("")) {
        require(Address.isContract(admin_), "invalid admin");
        require(owner_ != address(0), "invalid owner");
        assert(_ADMIN_SLOT == bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1));
        _changeAdmin(admin_);
        _setOwner(owner_);
    }

    /**
     * @dev Modifier used internally that will delegate the call to the implementation unless the sender is the admin.
     */
    modifier ifOwner() {
        require(msg.sender == _getOwner(), "not owner");
        _;
    }

    /**
     * @dev Modifier used internally that will delegate the call to the implementation unless the sender is the admin.
     */
    modifier ifAdmin() {
        if (msg.sender == _getAdmin()) {
            _;
        } else {
            _fallback();
        }
    }

    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.owner" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 internal constant _OWNER_SLOT = 0xa7b53796fd2d99cb1f5ae019b54f9e024446c3d12b483f733ccc62ed04eb126a;

    /**
     * @dev Emitted when the admin account has changed.
     */
    event OwnerChanged(address previousOwner, address newOwner);

    /**
     * @dev Returns the current admin.
     */
    function _getOwner() internal view returns (address) {
        return StorageSlot.getAddressSlot(_OWNER_SLOT).value;
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function _setOwner(address owner) internal {
        require(owner != address(0), "ERC1967: new admin is the zero address");
        StorageSlot.getAddressSlot(_OWNER_SLOT).value = owner;
    }

    /**
     * @dev Returns the current admin.
     */
    function getOwner() external view returns (address) {
        return _getOwner();
    }

    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.admin.pause" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 internal constant _ADMIN_PAUSE_SLOT = 0x362a3cad534268740301ef822ed103c9eb8db48228f42281b84608b1ef60eb1d;

    /**
     * @dev Emitted when the admin account has changed.
     */
    event PauseOfAdminChanged(bool previous, bool newA);

    /**
     * @dev Returns the current admin.
     */
    function _getAdminPause() internal view returns (bool) {
        return StorageSlot.getBooleanSlot(_ADMIN_PAUSE_SLOT).value;
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function _setAdminPause(bool pause) private {
        StorageSlot.getBooleanSlot(_ADMIN_PAUSE_SLOT).value = pause;
    }

    function getAdminPause() external view returns(bool){
        return _getAdminPause();
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function setAdminPause(bool pause) external ifOwner{
        bool oldPause = _getAdminPause();
        require(oldPause != pause, "pause is not modified");
        _setAdminPause(pause);
        emit PauseOfAdminChanged(oldPause, pause);
    }

    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.implement.pause" subtracted by 1, and is
     * validated in the constructor.
     */
    bytes32 internal constant _IMPLEMENT_PAUSE_SLOT = 0x46e60c8b89892c869391049bf13920b1253f1f7c92523fdcb204febbf9dcebda;

    /**
     * @dev Emitted when the admin account has changed.
     */
    event PauseOfImplementChanged(bool previous, bool newA);

    /**
     * @dev Returns the current admin.
     */
    function _getImplementPause() internal view returns (bool) {
        return StorageSlot.getBooleanSlot(_IMPLEMENT_PAUSE_SLOT).value;
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function _setImplementPause(bool pause) internal {
        StorageSlot.getBooleanSlot(_IMPLEMENT_PAUSE_SLOT).value = pause;
    }

        /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function getImplementPause() external view returns(bool){
        return _getImplementPause();
    }

    /**
     * @dev Stores a new address in the EIP1967 admin slot.
     */
    function setImplementPause(bool pause) external ifOwner{
        bool oldPause = _getImplementPause();
        require(oldPause != pause, "pause is not modified");
        _setImplementPause(pause);
        emit PauseOfImplementChanged(oldPause, pause);
    }
    
    function changeAdmin(address newAdmin) external ifAdmin {
        require(_getAdminPause(), "change admin is pause");
        require(Address.isContract(newAdmin), "admin is valid");
        _changeAdmin(newAdmin);
        _setAdminPause(false);
        emit PauseOfAdminChanged(true, false);
    }

    /**
     * @dev Upgrade the implementation of the proxy.
     *
     * NOTE: Only the admin can call this function. See {ProxyAdmin-upgrade}.
     */
    function upgradeTo(address newImplementation) external ifAdmin {
        require(_getImplementPause(), "upgrade to is pause");
        _upgradeToAndCall(newImplementation, bytes(""), false);
        _setImplementPause(false);
        emit PauseOfImplementChanged(true, false);
    }

    // /**
    //  * @dev Upgrade the implementation of the proxy, and then call a function from the new implementation as specified
    //  * by `data`, which should be an encoded function call. This is useful to initialize new storage variables in the
    //  * proxied contract.
    //  *
    //  * NOTE: Only the admin can call this function. See {ProxyAdmin-upgradeAndCall}.
    //  */
    // function upgradeToAndCall(address newImplementation, bytes calldata data) external payable ifAdmin {
    //     require(_getImplementPause(), "upgrade to is pause");
    //     _upgradeToAndCall(newImplementation, data, true);
    //     _setImplementPause(false);
    //     emit PauseOfImplementChanged(true, false);
    // }

    /**
     * @dev Returns the current admin.
     *
     * NOTE: Only the admin can call this function. See {ProxyAdmin-getProxyAdmin}.
     *
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by EIP1967) using the
     * https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
     */
    function admin() external view returns (address admin_) {
        admin_ = _getAdmin();
    }

    /**
     * @dev Returns the current implementation.
     *
     * NOTE: Only the admin can call this function. See {ProxyAdmin-getProxyImplementation}.
     *
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by EIP1967) using the
     * https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
     */
    function implementation() view external returns (address implementation_) {
        implementation_ = _implementation();
    }

    /**
     * @dev Returns the current admin.
     */
    function _admin() internal view returns (address) {
        return _getAdmin();
    }

    /**
     * @dev Makes sure the admin cannot access the fallback function. See {Proxy-_beforeFallback}.
     */
    function _beforeFallback() internal override {
        require(msg.sender != _getAdmin(), "TransparentUpgradeableProxy: admin cannot fallback to proxy target");
        super._beforeFallback();
    }
}