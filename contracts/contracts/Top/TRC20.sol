// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../common/AdminControlledUpgradeable.sol";
import "./verify/VerifierUpgradeable.sol";
import "../common/TransferedQuotas.sol";

contract TRC20 is ERC20, VerifierUpgradeable, TransferedQuotas {
    address private assetHash;
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

    constructor (
        ITopProve _prover,
        address _peerProxyHash,
        address _peerAssetHash,
        uint64 _minBlockAcceptanceHeight,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        _TRC20_init(_prover, _peerProxyHash, _peerAssetHash, _minBlockAcceptanceHeight);
    }

    function _TRC20_init (
        ITopProve _prover,
        address _peerProxyHash,
        address _peerAssetHash,
        uint64 _minBlockAcceptanceHeight
    ) private initializer {
        require(_peerProxyHash != address(0), "peer proxy can not be zero");
        require(_peerAssetHash != address(0), "peer asset can not be zero");
        assetHash = _peerAssetHash;
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CONTROLLED_ROLE, OWNER_ROLE);

        _setRoleAdmin(BLACK_BURN_ROLE, OWNER_ROLE);
        _setRoleAdmin(BLACK_MINT_ROLE, OWNER_ROLE);

        _grantRole(OWNER_ROLE, msg.sender);

        VerifierUpgradeable._VerifierUpgradeable_init(_prover, _peerProxyHash, _minBlockAcceptanceHeight);
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(msg.sender, UNPAUSED_ALL ^ 0xff);
    }

    function mint(
        bytes memory proofData, 
        uint64 proofBlockHeight
    ) external pausable (PAUSED_MINT) {
        require(!hasRole(BLACK_MINT_ROLE, msg.sender));
        VerifiedReceipt memory _receipt = _parseAndConsumeProof(proofData, proofBlockHeight);
        require(assetHash == _receipt.data.fromToken, "asset address must has been bound");
        _saveProof(_receipt.proofIndex);

        _mint(_receipt.data.receiver, _receipt.data.amount);
        emit Minted(_receipt.proofIndex, _receipt.data.amount, _receipt.data.receiver);
    }
    
    function burn(
        uint256 amount, 
        address receiver
    ) external pausable (PAUSED_BURN) {
        require(!hasRole(BLACK_BURN_ROLE, msg.sender));
        require(receiver != address(0));
        require(amount != 0, "amount can not be 0");
        checkTransferedQuota(address(this), amount);
        _burn(msg.sender, amount);
        emit Burned(address(this), assetHash, msg.sender, amount, receiver);
    }
}