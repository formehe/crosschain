// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./prover/INearProver.sol";
import "../common/IRC20Locker.sol";
import "./LockerProxy.sol";
import "./Locker.sol";

contract ERC20Locker is IRC20Locker,LockerProxy,Locker{

    using SafeERC20 for IERC20;

    function _ERC20Lock_initialize(
        INearProver _prover,
        address _lockProxyHash,
        uint64 _minBlockAcceptanceHeight,
        uint256 _pausedFlags,
        uint64  _chainId
    ) external initializer {
        Locker._locker_initialize(_prover, _lockProxyHash,_minBlockAcceptanceHeight);
        LockerProxy._lockerProxy_initialize(_pausedFlags,_chainId);
    }
    
    function lockToken(address fromAssetHash, uint64 toChainId, uint256 amount, address receiver)
        public
        override
        pausable1 (PAUSED_UNLOCK,LOCK_ADMIN_ROLE)
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
        pausable1 (PAUSED_UNLOCK,LOCK_ADMIN_ROLE)
    {
        ProofDecoder.ExecutionStatus memory status = _parseAndConsumeProof(proofData, proofBlockHeight);
        BurnResult memory result = _decodeBurnResult(status.successValue);
        IERC20(result.token).safeTransfer(result.recipient, result.amount);

        emit Unlocked(result.amount, result.recipient);
     
    }

    function adminTransfer(IERC20 token, address destination, uint256 amount)
        public
        onlyAdmin
    {
        token.safeTransfer(destination, amount);
    }

}