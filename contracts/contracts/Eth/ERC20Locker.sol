// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/IRC20Locker.sol";
import "./Locker.sol";

contract ERC20Locker is IRC20Locker,Locker{
    using SafeERC20 for IERC20;

    mapping(address => ConversionDecimals) public conversionDecimalsAssets;

    struct ConversionDecimals{
        uint8 fromDecimals;
        uint8 toDecimals;
    }

    function _ERC20Locker_initialize(
        ITopProver _prover,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        ILimit limit
    ) external initializer {
        Locker._Locker_initialize(_prover,_minBlockAcceptanceHeight,_owner,limit);
    }

    function bindAssetHash(address _fromAssetHash, address _toAssetHash, address _peerLockProxyHash) external onlyRole(OWNER_ROLE) {
        require(_fromAssetHash != address(0) && _toAssetHash != address(0) && _peerLockProxyHash != address(0), "both asset addresses are not to be 0");
        _bindAssetHash(_fromAssetHash,_toAssetHash,_peerLockProxyHash);
    }

    function setConversionDecimalsAssets(address _fromAssetHash,uint8 _toAssetHashDecimals) external onlyRole(OWNER_ROLE) {
        uint8 _fromAssetHashDecimals = IERC20Decimals(_fromAssetHash).decimals(); 
        require(_fromAssetHashDecimals > 0 && _toAssetHashDecimals > 0 &&  _fromAssetHashDecimals > _toAssetHashDecimals, "invalid the decimals");
        conversionDecimalsAssets[_fromAssetHash] = ConversionDecimals({
            fromDecimals:_fromAssetHashDecimals,
            toDecimals:_toAssetHashDecimals
        });

    }
    
    function lockToken(address fromAssetHash, uint256 amount, address receiver)
        external
        override
        lockToken_pauseable
    {
        require((fromAssetHash != address(0)) && (receiver != address(0)));

        uint256 transferAmount = amount;
        uint256 eventAmount = amount;
        if(conversionDecimalsAssets[fromAssetHash].toDecimals > 0){
            (transferAmount,eventAmount) = conversionFromAssetAmount(fromAssetHash, amount, true);
        }
        require(amount != 0 && eventAmount != 0, "amount can not be 0");
        address toAssetHash = assets[fromAssetHash].assetHash;
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        

        IERC20(fromAssetHash).safeTransferFrom(msg.sender, address(this), transferAmount);
        emit Locked(fromAssetHash, toAssetHash, msg.sender, eventAmount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        external
        override
        unLock_pauseable
    {   
        VerifiedReceipt memory result= _verify(proofData, proofBlockHeight);
        uint256 transferAmount = result.data.amount;
        if(conversionDecimalsAssets[result.data.toToken].toDecimals > 0){
            (transferAmount,) = conversionFromAssetAmount(result.data.toToken,transferAmount,false);
        }
        IERC20(result.data.toToken).safeTransfer(result.data.receiver, transferAmount);
        emit Unlocked(result.proofIndex,transferAmount, result.data.receiver);
    }

    function conversionFromAssetAmount(address _fromAssetHash,uint256 amount,bool isLock) internal view virtual returns(uint256 transferAmount,uint256 conversionAmount){
        uint8 fromAssetHashDecimals = conversionDecimalsAssets[_fromAssetHash].fromDecimals;
        uint8 toAssetHashDecimals = conversionDecimalsAssets[_fromAssetHash].toDecimals;
        if(fromAssetHashDecimals > toAssetHashDecimals){
            uint8 differenceDecimals = fromAssetHashDecimals - toAssetHashDecimals;
            if(isLock){
                conversionAmount =  amount / (10**differenceDecimals);
                transferAmount = conversionAmount * (10**differenceDecimals);
            }else{
                transferAmount =  amount * (10**differenceDecimals);
                conversionAmount = amount;
            }
        
        }
        return (transferAmount,conversionAmount);
    }

    function adminTransfer(IERC20 token, address destination, uint256 amount)
        external
        onlyRole(WITHDRAWAL_ROLE)
    {
        token.safeTransfer(destination, amount);
    }
}