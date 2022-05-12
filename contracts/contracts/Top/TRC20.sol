// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../common/AdminControlled.sol";
import "./verify/Verifier.sol";

contract TRC20 is ERC20, Verifier, AdminControlled {
    address assetHash;
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

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_BURN = 1 << 0;
    uint constant PAUSED_MINT = 1 << 1;

    constructor (
        ITopProve _prover,
        address _peerProxyHash,
        address _peerAssetHash,
        uint64 _minBlockAcceptanceHeight,
        address _admin,
        uint _pausedFlags,
        string memory _name, 
        string memory _symbol
    ) ERC20(_name, _symbol)
      AdminControlled(_admin, _pausedFlags)
      Verifier(_prover, _peerProxyHash, _minBlockAcceptanceHeight)
    {
        assetHash = _peerAssetHash;
    }

    function mint(bytes memory proofData, uint64 proofBlockHeight)
        external
        pausable (PAUSED_MINT)
    {
        VerifiedReceipt memory _receipt = _parseAndConsumeProof(proofData, proofBlockHeight);
        require(assetHash == _receipt.data.fromToken, "invalid token to token");
        _saveProof(_receipt.proofIndex);

        _mint(_receipt.data.receiver, _receipt.data.amount);
        emit Minted(_receipt.proofIndex, _receipt.data.amount, _receipt.data.receiver);
    }    
    
    function burn(uint256 amount, address receiver)
        external
        pausable (PAUSED_BURN)
    {
        _burn(msg.sender, amount);
        emit Burned(address(this), assetHash, msg.sender, amount, receiver);
    }
}