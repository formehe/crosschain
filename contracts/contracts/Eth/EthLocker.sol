// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../common/IRC20Locker.sol";
import "../common/ITokenLocker.sol";
import "./Locker.sol";

contract EthLocker is ITokenLocker,Locker{
    using SafeERC20 for IERC20;
    
    function _EthLocker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        ILimit limit,
        address _toAssetHash,
        address _peerLockProxyHash
    ) external initializer {   
        Locker._Locker_initialize(_prover, _minBlockAcceptanceHeight, _owner, limit);
        require(_toAssetHash != address(0) && _peerLockProxyHash != address(0) ,"both asset addresses are not to be 0");
        _bindAssetHash(address(0), _toAssetHash, _peerLockProxyHash);
    }
    
    function lockToken(address fromAssetHash,uint256 amount, address receiver)
        public
        override
        payable
        lockToken_pauseable
    {
        require(fromAssetHash == address(0), "from asset address must be zero");
        address toAssetHash = assets[fromAssetHash].assetHash;
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        require(amount != 0, "amount cannot be zero");
        require(receiver != address(0), "receive address can not be zero");
        require(_transferToContract(amount));
        emit Locked(fromAssetHash, toAssetHash ,msg.sender, amount, receiver, 18);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        override
        payable
        unLock_pauseable
    {
        VerifiedReceipt memory result = _verify(proofData, proofBlockHeight);
        _checkAndRefreshWithdrawTime(result.data.toToken, result.data.amount);
        _transferFromContract(result.data.receiver, result.data.amount);
        emit Unlocked(result.proofIndex,result.data.amount,result.data.receiver);
    }

    //The unit of amount is gwei
    function _transferToContract(uint256 amount) private returns (bool) {
        require(msg.value == amount, "transferred ether is not equal to amount!");
        return true;
    }

    function _transferFromContract(address toAddress, uint256 amount) internal returns (bool) {
        require(toAddress != address(0), "to asset address must not be zero");
        payable(toAddress).transfer(amount);
        return true;
    }
}