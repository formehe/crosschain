// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "../common/ILimit.sol";
import "../common/ERC20Mint.sol";
import "./verify/VerifierUpgradeable.sol";
//import "hardhat/console.sol";

contract ERC20MintProxy is VerifierUpgradeable {
    event Burned (
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 amount,
        address receiver,
        uint8   decimals
    );

    event Minted (
        bytes32 proofIndex,
        uint256 amount,
        address recipient
    );

    event AssetBound(
        address fromAssetHash,
        address toAssetHash
    );

    struct ProxiedAsset{
        address assetHash;
        bool    existed;
    }

    struct WithdrawHistory{
        uint time;
        uint256 accumulativeAmount;
    }

    mapping(address => uint256) public withdrawQuotas;
    mapping(address => WithdrawHistory) public withdrawHistories;

    mapping(address => ProxiedAsset) public assets;

    function bindAssetHash(
        address localAssetHash, 
        address peerAssetHash
    ) external onlyRole(ADMIN_ROLE) returns (bool) {
        require(Address.isContract(localAssetHash), "from proxy address are not to be contract address");
        require(assets[localAssetHash].existed == false, "can not modify the bind asset");
        assets[localAssetHash].assetHash = peerAssetHash;
        assets[localAssetHash].existed = true;
        emit AssetBound(localAssetHash, peerAssetHash);
        return true;
    }

    function initialize(
        IEthProver _prover,
        address _peerProxyHash,
        uint64 _minBlockAcceptanceHeight,
        address _owner,
        ILimit _limiter
    ) external initializer {
        require(_peerProxyHash != address(0), "peer proxy can not be zero");
        VerifierUpgradeable._VerifierUpgradeable_init(_prover, _peerProxyHash, _minBlockAcceptanceHeight, _limiter);
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(msg.sender, UNPAUSED_ALL ^ 0xff);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);

        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_BURN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BLACK_MINT_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, _owner);
        _grantRole(ADMIN_ROLE, msg.sender);
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
    
    function bindWithdrawQuota(address _asset, uint256 _withdrawQuota) external onlyRole(ADMIN_ROLE) {
        require(_withdrawQuota != 0, "withdraw quota can not be 0");
        uint256 quota = withdrawQuotas[_asset];
        require((quota == 0) || (_withdrawQuota < quota), "withdraw quota must be smaller");
        withdrawQuotas[_asset] = _withdrawQuota;
    }

    function _checkAndRefreshWithdrawTime(address _asset, uint256 amount) internal {
        uint256 quota = withdrawQuotas[_asset];
        require(quota != 0, "withdraw quota is not bound");
        require(amount <= quota, "withdraw quota is not enough");

        uint time = block.timestamp;
        WithdrawHistory memory history = withdrawHistories[_asset];
        require(time > history.time, "block time is too old");

        if ((history.time == 0) || (time - history.time >= 1 days)) {
            withdrawHistories[_asset].time = time;
            withdrawHistories[_asset].accumulativeAmount = amount;
        } else {
            require (quota - history.accumulativeAmount >= amount, "today's quota is used up");
            withdrawHistories[_asset].accumulativeAmount = history.accumulativeAmount + amount;
        }
    }

    function mint(
        bytes memory proofData, 
        uint64 proofBlockHeight
    ) external mint_pauseable {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proofData, proofBlockHeight);

        ProxiedAsset memory asset = assets[receipt.data.toToken];
        require(asset.existed, "asset address must has been bound");
        require(asset.assetHash == receipt.data.fromToken, "invalid token to token");

        uint8 decimal = IERC20Decimals(receipt.data.toToken).decimals();
        uint256 transferAmount = conversionFromAssetAmount(receipt.data.decimals, decimal, receipt.data.amount);
        _checkAndRefreshWithdrawTime(receipt.data.toToken, transferAmount);
        _saveProof(receipt.proofIndex);
        ERC20Mint(receipt.data.toToken).mint(receipt.data.receiver, transferAmount);
        emit Minted(receipt.proofIndex, transferAmount, receipt.data.receiver);
    }

    function burn(
        address localAssetHash, 
        uint256 amount, 
        address receiver
    ) external burn_pauseable {
        require((Address.isContract(localAssetHash)) && (receiver != address(0)));
        
        uint256 transferAmount = amount;
        require(transferAmount != 0, "amount can not be 0");
        require(limiter.checkTransferedQuota(localAssetHash, transferAmount),"not in the amount range");
        ProxiedAsset memory peerAsset = assets[localAssetHash];
        require(peerAsset.existed, "asset address must has been bound");
        ERC20Mint(localAssetHash).burnFrom(msg.sender, transferAmount);
        
        uint8 decimal = IERC20Decimals(localAssetHash).decimals();
        emit Burned(localAssetHash, peerAsset.assetHash, msg.sender, transferAmount, receiver, decimal);
    }
}