// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../Eth/ERC20Locker.sol";
import "hardhat/console.sol";

contract Erc20LockerTest is ERC20Locker {
    using SafeERC20 for IERC20;

    function unlockTokenRuleOutSafeTransfer(bytes memory proofData, uint64 proofBlockHeight)
        public
        unLock_pauseable
    {   
        VerifiedReceipt memory result= _verify(proofData, proofBlockHeight);
        console.logUint(result.data.amount);
        _checkAndRefreshWithdrawTime(result.data.toToken, result.data.amount);
        //IERC20(result.data.toToken).safeTransfer(result.data.receiver, result.data.amount);
        emit Unlocked(result.proofIndex,result.data.amount, result.data.receiver);
    }
  
    function safeTransfer(address toToken,address receiver,uint256 amount)
        public
        unLock_pauseable
    {   
        IERC20(toToken).safeTransfer(receiver,amount);
    }
}