// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../Eth/EthLocker.sol";

contract EthLockerTest is EthLocker {

    function unlockTokenRuleOutTransferFromContract(bytes memory proofData, uint64 proofBlockHeight)
        public
        unLock_pauseable
    {   
        VerifiedReceipt memory result = _verify(proofData, proofBlockHeight);
        //_transferFromContract(result.data.receiver, result.data.amount);
        emit Unlocked(result.proofIndex,result.data.amount,result.data.receiver);
     
    }
  
    function transferFromContract(address toAddress, uint256 amount)
        public
        unLock_pauseable
    {   
       _transferFromContract(toAddress,amount);
     
    }

    function ethBalance(address owner) public view returns(uint256){
        return owner.balance;
    }       
}