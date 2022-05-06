// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/ILocker.sol";
import "./prove/ITopProve.sol";
import "./Locker.sol";
import "../common/Borsh.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "./codec/EthProofDecoder.sol";
import "../common/Utils.sol";
// import "hardhat/console.sol";

contract ERC20Locker is ILocker, Locker, AdminControlled {
    using SafeERC20 for IERC20;
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;
    uint64 public selfChainId;

    event Locked (
        address indexed fromToken,
        address indexed toToken,
        uint64  fromChainId,
        uint64  toChainId,
        address indexed sender,
        uint256 amount,
        address receiver
    );

    struct LockEventData {
        address fromToken;
        address toToken;
        uint64  fromChainId;
        uint64  toChainId;
        address sender;
        uint256 amount;
        address recipient;
    }

    event Unlocked (
        uint128 amount,
        address recipient
    );

    event BindAsset(
        address fromAssetHash,
        uint64 toChainId,
        bytes toAssetHash
    );

    mapping(address => mapping(uint64 => bytes)) private assetHashMap;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    function bindAssetHash(address fromAssetHash, uint64 toChainId, bytes memory toAssetHash) external onlyAdmin returns (bool) {
        require((fromAssetHash != address(0)) && (Utils.toAddress(toAssetHash) != address(0)), "both asset addresses are not to be 0");
        assetHashMap[fromAssetHash][toChainId] = toAssetHash;
        emit BindAsset(fromAssetHash, toChainId, toAssetHash);
        return true;
    }

    function bindPeerContract(bytes memory _peerLockContract) public onlyAdmin returns (bool) {
        require(_bindLockContract(_peerLockContract), "Fail to bind lock contract");
        return true;
    }

    struct BurnResult {
        uint128 amount;
        address token;
        address recipient;
    }

    constructor(ITopProve _prover,
                uint64 _minBlockAcceptanceHeight,
                address _admin,
                uint64  _chainID,
                uint _pausedFlags)
        AdminControlled(_admin, _pausedFlags)
        Locker(_prover, _minBlockAcceptanceHeight)
    {
        selfChainId = _chainID;
    }

    function lockToken(address fromAssetHash, uint64 toChainId, uint256 amount, address receiver)
        public
        override
        pausable (PAUSED_LOCK)
    {
        require((fromAssetHash != address(0)) && (receiver != address(0)));
        require(amount != 0, "amount can not be 0");
        require(
            (IERC20(fromAssetHash).balanceOf(address(this)) + amount) <= ((uint256(1) << 128) - 1),
            "Maximum tokens locked exceeded (< 2^128 - 1)");
        bytes memory toAssetHash = assetHashMap[fromAssetHash][toChainId];
        require(toAssetHash.length != 0, "empty illegal toAssetHash");
        IERC20(fromAssetHash).safeTransferFrom(msg.sender, address(this), amount);

        emit Locked(fromAssetHash, Utils.toAddress(toAssetHash), selfChainId, toChainId, msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        override
        pausable (PAUSED_UNLOCK)
    {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        (LockEventData memory lockEvent, address contractAddress)  = parseLog(proof.logEntryData);
        bytes memory toAssetHash = assetHashMap[lockEvent.toToken][lockEvent.fromChainId];
        require(toAssetHash.length != 0, "empty illegal toAssetHash");
        require(Utils.toAddress(toAssetHash) == lockEvent.fromToken, "invalid token to token");

        require(_parseAndConsumeProof(proof, contractAddress, proofBlockHeight), "proof is invalid");
        IERC20(lockEvent.toToken).safeTransfer(lockEvent.recipient, lockEvent.amount);
        emit Unlocked(uint128(lockEvent.amount), lockEvent.recipient);
    }

    function getBalance(address fromAssetHash) public view returns (uint256) {
        require(fromAssetHash != address(0), "asset must not be zero");
        IERC20 erc20Token = IERC20(fromAssetHash);
        return erc20Token.balanceOf(address(this));
    }

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

    function parseLog(bytes memory log)
        private
        view
        returns (LockEventData memory lockEvent, address contractAddress)
    {
        EthereumDecoder.Log memory logInfo = EthereumDecoder.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        (lockEvent.fromChainId, lockEvent.toChainId, lockEvent.amount, lockEvent.recipient) = abi.decode(logInfo.data, (uint64, uint64, uint256, address));

        lockEvent.fromToken = abi.decode(abi.encodePacked(logInfo.topics[1]), (address));
        lockEvent.toToken = abi.decode(abi.encodePacked(logInfo.topics[2]), (address));
        lockEvent.sender = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        contractAddress = logInfo.contractAddress;
    }
}