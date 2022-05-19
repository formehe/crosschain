// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "../common/AdminControlledUpgradeable.sol";
import "../common/ERC20Mint.sol";
import "./prove/ITopProve.sol";
import "./verify/VerifierUpgradeable.sol";
import "hardhat/console.sol";

contract ERC20MintProxy is VerifierUpgradeable, AdminControlledUpgradeable {
    event Burned (
        address indexed fromToken,
        address indexed toToken,
        address indexed sender,
        uint256 amount,
        address receiver
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

    mapping(address => ProxiedAsset) private assets;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_BURN = 1 << 0;
    uint constant PAUSED_MINT = 1 << 1;

    function bindAssetHash(address localAssetHash, address peerAssetHash) external onlyRole(OWNER_ROLE) returns (bool) {
        // peerAssetHash may be address(0), address(0) means the native token of source chain
        require(Address.isContract(localAssetHash), "from proxy address are not to be contract address");
        assets[localAssetHash].assetHash = peerAssetHash;
        assets[localAssetHash].existed = true;
        emit AssetBound(localAssetHash, peerAssetHash);
        return true;
    }

    function initialize(
        ITopProve _prover,
        address _peerProxyHash,
        uint64 _minBlockAcceptanceHeight
    ) external initializer {
        require(_peerProxyHash != address(0), "peer proxy can not be zero");
        VerifierUpgradeable._VerifierUpgradeable_init(_prover, _peerProxyHash, _minBlockAcceptanceHeight);
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(msg.sender, UNPAUSED_ALL ^ 0xff);
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);

        _setRoleAdmin(BLACK_BURN_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_MINT_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE,msg.sender);
    }

    function mint(bytes memory proofData, uint64 proofBlockHeight)
        public
        pausable (PAUSED_MINT,CONTROLLED_ROLE)
    {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proofData, proofBlockHeight);
        ProxiedAsset memory asset = assets[receipt.data.toToken];
        require(asset.existed, "asset address must has been bound");
        require(asset.assetHash == receipt.data.fromToken, "invalid token to token");

        _saveProof(receipt.proofIndex);
        ERC20Mint(receipt.data.toToken).mint(receipt.data.receiver, receipt.data.amount);
        emit Minted(receipt.proofIndex, receipt.data.amount, receipt.data.receiver);
    }

    function burn(address localAssetHash, uint256 amount, address receiver)
        public
        pausable (PAUSED_BURN,CONTROLLED_ROLE)
    {
        require((Address.isContract(localAssetHash)) && (receiver != address(0)));
        require(amount != 0, "amount can not be 0");
        ProxiedAsset memory peerAsset = assets[localAssetHash];
        require(peerAsset.existed, "asset address must has been bound");
        ERC20Mint(localAssetHash).burnFrom(msg.sender, amount);

        emit Burned(localAssetHash, peerAsset.assetHash, msg.sender, amount, receiver);
    }

    // function getBalance(address localAssetHash) external view returns (uint256) {
    //     require(localAssetHash != address(0), "asset must not be zero");
    //     IERC20 erc20Token = IERC20(fromAssetHash);
    //     return erc20Token.balanceOf(address(this));
    // }

    // tokenFallback implements the ContractReceiver interface from ERC223-token-standard.
    // This allows to support ERC223 tokens with no extra cost.
    // The function always passes: we don't need to make any decision and the contract always
    // accept token transfers transfer.
    // function tokenFallback(address _from, uint _value, bytes memory _data) public pure {}

    // function adminTransfer(IERC20 token, address destination, uint256 amount)
    //     public
    //     onlyAdmin
    // {
    //     token.safeTransfer(destination, amount);
    // }
}