// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./prover/INearProver.sol";
import "../common/IRC20Locker.sol";
import "../common/ITokenLocker.sol";
import "./LockerProxy.sol";
import "./Locker.sol";

contract EthLocker is ITokenLocker,LockerProxy{
    using SafeERC20 for IERC20;
    
    function _EthLocker_initialize(
        INearProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner
    ) external initializer {   
        LockerProxy._lockerProxy_initialize(_prover,_minBlockAcceptanceHeight,_owner,true);
    }
    
    function lockToken(address fromAssetHash,uint256 amount, address receiver)
        public
        override
        payable
        lockToken_pauseable
    {
        require(fromAssetHash == address(0), "from asset address must be zero");
        address toAssetHash = assetHashMap[fromAssetHash].toAssetHash;
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        require(amount != 0, "amount cannot be zero");
        checkTransferedQuota(fromAssetHash,amount);  
        require(receiver != address(0), "receive address can not be zero");
        require(_transferToContract(amount));
        emit Locked(fromAssetHash, toAssetHash ,msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        override
        payable
        unLock_pauseable
    {
        BurnResult memory result = _parseAndConsumeProof(proofData, proofBlockHeight);
        _transferFromContract(result.recipient, result.amount);

        emit Unlocked(result.amount, result.recipient);
    }

    //The unit of amount is gwei
    function _transferToContract(uint256 amount) private returns (bool) {
        require(msg.value != 0, "transferred ether cannot be zero!");
        require(msg.value == amount, "transferred ether is not equal to amount!");
        return true;
    }

    function _transferFromContract(address toAddress, uint256 amount) private returns (bool) {
        require(toAddress != address(0), "to asset address must not be zero");
        payable(toAddress).transfer(amount);
        return true;
    }

    function adminTransfer(address payable destination, uint amount)
        public
        onlyRole(WITHDRAWAL_ROLE)
    {
        destination.transfer(amount);
    }
}