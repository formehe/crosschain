// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../common/prover/IProver.sol";
import "../common/IRC20Locker.sol";

import "./LockerProxy.sol";

contract ERC20Locker is IRC20Locker,LockerProxy{
    using SafeERC20 for IERC20;

    function _ERC20Locker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner
    ) external initializer {
        LockerProxy._lockerProxy_initialize(_prover,_minBlockAcceptanceHeight,_owner,false);
    }
    
    function lockToken(address fromAssetHash, uint256 amount, address receiver)
        public
        override
        lockToken_pauseable
    {
        require((fromAssetHash != address(0)) && (receiver != address(0)));
        require(amount != 0, "amount can not be 0");
        require(
            (IERC20(fromAssetHash).balanceOf(address(this)) + amount) <= ((uint256(1) << 128) - 1),
            "Maximum tokens locked exceeded (< 2^128 - 1)");
        checkTransferedQuota(fromAssetHash,amount);    
        address toAssetHash = assetHashMap[fromAssetHash].toAssetHash;
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        IERC20(fromAssetHash).safeTransferFrom(msg.sender, address(this), amount);

        emit Locked(fromAssetHash, toAssetHash, msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        override
        unLock_pauseable
    {   
        VerifiedReceipt memory result= _verify(proofData, proofBlockHeight);
        IERC20(result.data.toToken).safeTransfer(result.data.receiver, result.data.amount);
        emit Unlocked(result.data.amount, result.data.receiver);
     
    }

    function adminTransfer(IERC20 token, address destination, uint256 amount)
        public
        onlyRole(WITHDRAWAL_ROLE)
    {
        token.safeTransfer(destination, amount);
    }

}