// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/AdminControlled.sol";
import "./prove/ITopProve.sol";
import "./Locker.sol";
import "../common/Borsh.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "./codec/EthProofDecoder.sol";
import "../common/Utils.sol";
import "hardhat/console.sol";

contract NativeLocker is Locker, AdminControlled {
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

    function bindAssetHash(address fromAssetHash, uint64 toChainId, bytes memory toAssetHash) public onlyAdmin returns (bool) {
        require((fromAssetHash == address(0)) || (Utils.toAddress(toAssetHash) == address(0)), "from or to asset contract must be zero");
        require(!((fromAssetHash == address(0)) && (Utils.toAddress(toAssetHash) == address(0))), "from and to asset contract must be all be zero");

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
        payable
        pausable (PAUSED_LOCK)
    {
        bytes memory toAssetHash = assetHashMap[fromAssetHash][toChainId];
        require(toAssetHash.length != 0, "empty illegal toAssetHash");
        require(amount != 0, "amount cannot be zero");
        require(receiver != address(0), "receive address can not be zero");
        require(_transferToContract(fromAssetHash, amount));
        emit Locked(fromAssetHash, Utils.toAddress(toAssetHash), selfChainId, toChainId, msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
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
        require(_transferFromContract(lockEvent.toToken, lockEvent.recipient, lockEvent.amount));
        emit Unlocked(uint128(lockEvent.amount), lockEvent.recipient);
    }

    // tokenFallback implements the ContractReceiver interface from ERC223-token-standard.
    // This allows to support ERC223 tokens with no extra cost.
    // The function always passes: we don't need to make any decision and the contract always
    // accept token transfers transfer.
    // function tokenFallback(address _from, uint _value, bytes memory _data) public pure {}

    function adminTransfer(IERC20 token, address destination, uint256 amount)
        public
        onlyAdmin
    {
        token.safeTransfer(destination, amount);
    }

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

    function getBalance(address fromAssetHash) public view returns (uint256) {
        if (fromAssetHash == address(0)) {
            // return address(this).balance; // this expression would result in error: Failed to decode output: Error: insufficient data for uint256 type
            address selfAddr = address(this);
            return selfAddr.balance;
        } else {
            IERC20 erc20Token = IERC20(fromAssetHash);
            return erc20Token.balanceOf(address(this));
        }
    }

    //The unit of amount is gwei
    function _transferToContract(address fromAssetHash, uint256 amount) private returns (bool) {
        if (fromAssetHash == address(0)) {
            // fromAssetHash === address(0) denotes user choose to lock ether
            // passively check if the received msg.value equals amount
            require(msg.value != 0, "transferred ether cannot be zero!");
            require(msg.value == amount, "transferred ether is not equal to amount!");
        } else {
            // make sure lockproxy contract will decline any received ether
            require(msg.value == 0, "there should be no ether transfer!");
            // actively transfer amount of asset from msg.sender to lock_proxy contract
            IERC20 erc20Token = IERC20(fromAssetHash);
            require(
            (erc20Token.balanceOf(address(this)) + amount) <= ((uint256(1) << 128) - 1),
            "Maximum tokens locked exceeded (< 2^128 - 1)");
            erc20Token.safeTransferFrom(address(this), msg.sender, amount);
        }
        return true;
    }

    function _transferFromContract(address toAssetHash, address toAddress, uint256 amount) private returns (bool) {
        if (toAssetHash == address(0)) {
            // toAssetHash === address(0) denotes contract needs to unlock ether to toAddress
            // convert toAddress from 'address' type to 'address payable' type, then actively transfer ether
            payable(toAddress).transfer(amount);
        } else {
            // actively transfer amount of asset from msg.sender to lock_proxy contract
            IERC20 erc20Token = IERC20(toAssetHash);
            erc20Token.safeTransfer(toAddress, amount);
        }
        return true;
    }
}
