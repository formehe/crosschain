// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/IRC20Locker.sol";
import "./Locker.sol";

contract ERC20Locker is IRC20Locker,Locker{
    using SafeERC20 for IERC20;
    address public peerProxyHash;

    function _ERC20Locker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        ILimit _limit,
        address _peerProxyHash,
        address[]  memory _localAssetHashes,
        address[]  memory _peerAssetHashes
    ) external initializer {
        Locker._Locker_initialize(_prover, _minBlockAcceptanceHeight, _owner, _limit);
        require(_localAssetHashes.length == _peerAssetHashes.length, "from assets is not equal to to assets");
        require(_localAssetHashes.length != 0, "from assets can not be 0");
        require(_peerProxyHash != address(0), "peer proxy hash can not be 0");
        peerProxyHash = _peerProxyHash;
        for (uint256 i = 0; i < _localAssetHashes.length; i++){
            require(_localAssetHashes[i] != address(0), "from asset can not be 0");
            require(_peerAssetHashes[i] != address(0), "from asset can not be 0");
            _bindAssetHash(_localAssetHashes[i], _peerAssetHashes[i], _peerProxyHash);
        }
    }

    function bindAssetHash(address _fromAssetHash, address _toAssetHash) external onlyRole(DAO_ADMIN_ROLE) {
        require(_fromAssetHash != address(0) && _toAssetHash != address(0), "both asset addresses are not to be 0");
        _bindAssetHash(_fromAssetHash, _toAssetHash, peerProxyHash);
    }
    
    function lockToken(address fromAssetHash, uint256 amount, address receiver)
        external
        override
        lockToken_pauseable
    {
        require((fromAssetHash != address(0)) && (receiver != address(0)));
        uint256 transferAmount = amount;
        require(transferAmount != 0, "amount can not be 0");
        address toAssetHash = assets[fromAssetHash].assetHash;
        require(toAssetHash != address(0), "empty illegal toAssetHash");

        uint8 decimal = IERC20Decimals(fromAssetHash).decimals();
        IERC20(fromAssetHash).safeTransferFrom(msg.sender, address(this), transferAmount);
        emit Locked(fromAssetHash, toAssetHash, msg.sender, transferAmount, receiver, decimal);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        external
        override
        unLock_pauseable
    {   
        VerifiedReceipt memory result= _verify(proofData, proofBlockHeight);
        
        uint8 decimal = IERC20Decimals(result.data.toToken).decimals();
        uint256 transferAmount = conversionFromAssetAmount(result.data.decimals, decimal, result.data.amount);
        _checkAndRefreshWithdrawTime(result.data.toToken, transferAmount);

        IERC20(result.data.toToken).safeTransfer(result.data.receiver, transferAmount);
        emit Unlocked(result.proofIndex,transferAmount, result.data.receiver);
    }

    function conversionFromAssetAmount(uint8 fromDecimal, uint8 toDecimal, uint256 amount) internal pure returns(uint256 transferAmount){
        transferAmount = amount;
        if(fromDecimal > toDecimal){
            uint8 differenceDecimals = fromDecimal - toDecimal;
            transferAmount =  amount / (10**differenceDecimals);
        }
        else if (fromDecimal < toDecimal) {
            uint8 differenceDecimals = toDecimal - fromDecimal;
            transferAmount =  amount * (10**differenceDecimals);
        }
    }
}