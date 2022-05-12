// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../common/ILocker.sol";
import "./prove/ITopProve.sol";
import "./Locker.sol";
import "../common/AdminControlled.sol";
// import "hardhat/console.sol";

contract TopERC20Lockproxy is ILocker, Locker, AdminControlled {
    using SafeERC20 for IERC20;
    uint64 private chainId;

    event Locked (
        address indexed fromToken,
        address indexed toToken,
        uint64  fromChainId,
        uint64  toChainId,
        address indexed sender,
        uint256 amount,
        address receiver
    );

    event Unlocked (
        bytes32 proofIndex,
        uint256 amount,
        address recipient
    );

    event BindAsset(
        address fromAssetHash,
        uint64 toChainId,
        address toAssetHash
    );

    mapping(address => mapping(uint64 => address)) private assetHashMap;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    function bindAssetHash(address fromAssetHash, uint64 toChainId, address toAssetHash) external onlyAdmin returns (bool) {
        require((fromAssetHash != address(0)) && (toAssetHash != address(0)), "both asset addresses are not to be 0");
        assetHashMap[fromAssetHash][toChainId] = toAssetHash;
        emit BindAsset(fromAssetHash, toChainId, toAssetHash);
        return true;
    }

    struct BurnResult {
        uint128 amount;
        address token;
        address recipient;
    }

    function initialize(
        ITopProve _prover,
        address _peerLockProxyHash,
        uint64 _minBlockAcceptanceHeight,
        address _admin,
        uint64  _chainId,
        uint _pausedFlags
    ) external initializer {
        chainId = _chainId;
        Locker._Locker_init(_prover, _peerLockProxyHash, _minBlockAcceptanceHeight);
        AdminControlled._AdminControlled_init(_admin, _pausedFlags);
    }

    function lockToken(address fromAssetHash, uint64 toChainId, uint256 amount, address receiver)
        public
        override
        pausable (PAUSED_LOCK)
    {
        require((fromAssetHash != address(0)) && (receiver != address(0)));
        require(amount != 0, "amount can not be 0");
        require(
            (IERC20(fromAssetHash).balanceOf(address(this)) + amount) <= ((uint256(1) << 128) - 1),
            "Maximum tokens locked exceeded (< 2^128 - 1)");
        address toAssetHash = assetHashMap[fromAssetHash][toChainId];
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        IERC20(fromAssetHash).safeTransferFrom(msg.sender, address(this), amount);

        emit Locked(fromAssetHash, toAssetHash, chainId, toChainId, msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        override
        pausable (PAUSED_UNLOCK)
    {
        LockData memory lockData = _parseAndConsumeProof(proofData, proofBlockHeight);
        address toAssetHash = assetHashMap[lockData.data.toToken][lockData.data.fromChainId];
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        require(toAssetHash == lockData.data.fromToken, "invalid token to token");
        _saveProof(lockData.proofIndex);
        IERC20(lockData.data.toToken).safeTransfer(lockData.data.recipient, lockData.data.amount);
        emit Unlocked(lockData.proofIndex, lockData.data.amount, lockData.data.recipient);
    }

    function getBalance(address fromAssetHash) public view returns (uint256) {
        require(fromAssetHash != address(0), "asset must not be zero");
        IERC20 erc20Token = IERC20(fromAssetHash);
        return erc20Token.balanceOf(address(this));
    }

    // tokenFallback implements the ContractReceiver interface from ERC223-token-standard.
    // This allows to support ERC223 tokens with no extra cost.
    // The function always passes: we don't need to make any decision and the contract always
    // accept token transfers transfer.
    // function tokenFallback(address _from, uint _value, bytes memory _data) public pure {}

    // function adminTransfer(IERC20 token, address destination, uint256 amount)
    //     public
    //     onlyAdmin
    // {
    //     token.safeTransfer(destination, amount);
    // }
}