// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.3;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../common/AdminControlledUpgradeable.sol";
import "../common/Borsh.sol";
import "./Bridge.sol";
//import "hardhat/console.sol";

contract TEtherLockProxy is Initializable, Bridge, AdminControlledUpgradeable {
    using Borsh for Borsh.Data;
    using SafeERC20 for IERC20;

    event Locked (
        address indexed fromToken,
        address indexed toToken,
        uint64  fromChainId,
        uint64  toChainId,
        address indexed sender,
        uint256 amount,
        address receiver
    );

    event Unlocked (
        bytes32 indexed proofIndex,
        uint256 amount,
        address indexed receiver
    );

    event BindAsset(
        address fromAssetHash,
        uint64  toChainId,
        address toAssetHash
    );

    struct BridgeResult {
        uint128 amount;
        address recipient;
    }

    mapping(address => mapping(uint64 => address)) private assetHashMap;
    uint64 private chainId;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    function bindAssetHash(
        address fromAssetHash, 
        uint64 toChainId, 
        address toAssetHash
    ) public onlyAdmin returns (bool) {
        require(fromAssetHash == address(0), "from asset address must be zero");
        require(toAssetHash != address(0), "to asset address must not be zero");

        assetHashMap[fromAssetHash][toChainId] = toAssetHash;
        emit BindAsset(fromAssetHash, toChainId, toAssetHash);
        return true;
    }

    function initialize(
        INearProver _prover,
        address _peerLockProxyHash,
        uint64 _minBlockAcceptanceHeight,
        address _admin,
        uint64  _chainId,
        uint _pausedFlags
    ) external initializer {
        chainId = _chainId;
        Bridge._Bridge_init(_prover, _peerLockProxyHash, _minBlockAcceptanceHeight);
        AdminControlledUpgradeable._AdminControlledUpgradeable_init(_admin, _pausedFlags);
    }

    function lockToken(address fromAssetHash, uint64 toChainId, uint256 amount, address receiver)
        public
        payable
        pausable (PAUSED_LOCK)
    {
        address toAssetHash = assetHashMap[fromAssetHash][toChainId];
        require(toAssetHash != address(0), "empty illegal toAssetHash");
        require(amount != 0, "amount cannot be zero");
        require(receiver != address(0), "receive address can not be zero");
        require(_transferToContract(fromAssetHash, amount));
        emit Locked(fromAssetHash, toAssetHash, chainId, toChainId, msg.sender, amount, receiver);
    }

    function unlockToken(bytes memory proofData, uint64 proofBlockHeight)
        public
        pausable (PAUSED_UNLOCK)
    {
        ProofDecoder.ExecutionStatus memory status = _parseAndConsumeProof(proofData, proofBlockHeight);
        BridgeResult memory result = _decodeBridgeResult(status.successValue);

        // (LockEventData memory lockEvent, address contractAddress)  = parseLog(proof.logEntryData);
        // address memory toAssetHash = assetHashMap[lockEvent.toToken][lockEvent.fromChainId];
        // require(toAssetHash != address(0), "empty illegal toAssetHash");
        // require(toAssetHash == lockEvent.fromToken, "invalid token to token");、
        // (bool success, bytes32 proofIndex) = _parseAndConsumeProof(proof, contractAddress, proofBlockHeight);
        // require(success, "proof is invalid");
        // require(_transferFromContract(lockEvent.toToken, result.recipient, result.amount));
        // emit Unlocked(result.amount, result.recipient);
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

    function getBalance(address fromAssetHash) public view returns (uint256) {
        require((fromAssetHash == address(0)), "from asset address must be zero");
        address selfAddr = address(this);
        return selfAddr.balance;
    }

    //The unit of amount is gwei
    function _transferToContract(address fromAssetHash, uint256 amount) private returns (bool) {
        require(fromAssetHash == address(0), "from asset address must be zero");
        require(msg.value != 0, "transferred ether cannot be zero!");
        require(msg.value == amount, "transferred ether is not equal to amount!");
        
        return true;
    }

    function _transferFromContract(address toAssetHash, address toAddress, uint256 amount) private returns (bool) {
        require(toAssetHash == address(0), "to asset address must be zero");
        require(toAddress != address(0), "to asset address must not be zero");
        payable(toAddress).transfer(amount);
        return true;
    }

    function _decodeBridgeResult(bytes memory data) internal pure returns(BridgeResult memory result) {
        Borsh.Data memory borshData = Borsh.from(data);
        uint8 flag = borshData.decodeU8();
        require(flag == 0, "ERR_NOT_WITHDRAW_RESULT");
        result.amount = borshData.decodeU128();
        bytes20 recipient = borshData.decodeBytes20();
        result.recipient = address(uint160(recipient));
        borshData.done();
    }
}
