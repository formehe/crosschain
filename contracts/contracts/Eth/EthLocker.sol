// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./prover/INearProver.sol";
import "../common/IRC20Locker.sol";
import "../common/ITokenLocker.sol";
import "./LockerProxy.sol";
import "./Locker.sol";

contract TokenLocker is ITokenLocker,LockerProxy,Locker{
    using SafeERC20 for IERC20;
    
    function _TokenLock_initialize(
        INearProver _prover,
        address _lockProxyHash,
        uint64 _minBlockAcceptanceHeight,
        uint256 _pausedFlags
    ) external initializer {   
        LockerProxy._lockerProxy_initialize(_pausedFlags);
        Locker._locker_initialize(_prover, _lockProxyHash,_minBlockAcceptanceHeight);
    }
    
    function lockToken(address fromAssetHash,uint256 amount, address receiver)
        public
        override
        payable
        lockToken_pausable
    {
        address toAssetHash = assetHashMap[fromAssetHash];
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        require(amount != 0, "amount cannot be zero");
        require(receiver != address(0), "receive address can not be zero");
        require(_transferToContract(fromAssetHash, amount));
        emit Locked(fromAssetHash, toAssetHash ,msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        override
        payable
        unLock_pausable
    {
        ProofDecoder.ExecutionStatus memory status = _parseAndConsumeProof(proofData, proofBlockHeight);
        BurnResult memory result = _decodeBurnResult(status.successValue);
        _transferFromContract(result.recipient, result.amount);

        emit Unlocked(result.amount, result.recipient);
    }

    function adminTransfer(address destination, uint256 amount)
        public
        onlyRole(ADMIN_ROLE)
    {
        payable(destination).transfer(amount);
    }
    
    //The unit of amount is gwei
    function _transferToContract(address fromAssetHash, uint256 amount) private returns (bool) {
        require(fromAssetHash == address(0), "from asset address must be zero");
        require(msg.value != 0, "transferred ether cannot be zero!");
        require(msg.value == amount, "transferred ether is not equal to amount!");
        return true;
    }

    function _transferFromContract(address toAddress, uint256 amount) private returns (bool) {
        require(toAddress != address(0), "to asset address must not be zero");
        payable(toAddress).transfer(amount);
        return true;
    }
}