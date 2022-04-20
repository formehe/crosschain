// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../common/IMiner.sol";
import "./prove/ITopProve.sol";
import "../common/event/LockEvent.sol";
import "../common/Borsh.sol";
import "./codec/EthProofDecoder.sol";
import "../../lib/lib/EthereumDecoder.sol";
import "../common/Utils.sol";

contract TopMiner is IMiner, AdminControlled {
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;
    //using SafeERC20 for IERC20;
    struct Account {
        uint256 amount;
        mapping(address => uint256) grantAccount;
    }

    mapping(bytes32=>bool) public usedProofs;
    mapping(address=>Account) public accounts;
    address public peerLockContract;
    ITopProve public prover;

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_LOCK = 1 << 0;
    uint constant PAUSED_UNLOCK = 1 << 1;

    constructor (
        address _peerLockContract, 
        ITopProve _prover,
        uint _pausedFlags) AdminControlled(msg.sender, _pausedFlags) {
        peerLockContract = _peerLockContract;
        prover = _prover;
    }

    function mine(bytes memory proofData, uint64 proofBlockHeight) 
        external 
        payable 
        override
        pausable (PAUSED_LOCK) returns (bool) {
        (bool success, ) = prover.verify(proofData);
        require(success, "Proof should be valid");

        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        EthereumDecoder.TransactionReceiptTrie memory reciptData = EthereumDecoder.toReceipt(proof.reciptData);
        address contractAddress = reciptData.logs[proof.logIndex].contractAddress;
        require(
            keccak256(Utils.toBytes(peerLockContract)) == keccak256(Utils.toBytes(contractAddress)),
            "Can only unlock tokens from the linked proof producer on Top blockchain");

        bytes32 proofIndex = keccak256(proofData);
        require(!usedProofs[proofIndex], "The lock event proof cannot be reused");
        usedProofs[proofIndex] = true;

        LockEvent.LockEventData memory eventData = LockEvent.parse(reciptData.logs[proof.logIndex].data);
        require(eventData.amount != 0, "amount can not be 0");
        accounts[eventData.recipient].amount += eventData.amount;
        return true;
    }

    function burn(uint256 amount) 
        external 
        payable 
        override
        pausable (PAUSED_UNLOCK) returns (bool) {

        require(amount != 0, "amount can not be 0");
        require(msg.value != 0, "gas can not be zero");

        if (0 == accounts[msg.sender].amount) {
            return false;
        }
        Account storage account = accounts[msg.sender];
        require(account.amount >= amount, "not enough balance");
        account.amount -= amount;
        return true;
    }

    function incAllowance(address newOwner, uint256 amount) public payable returns (bool) {
        require(amount != 0, "amount can not be 0");
        require(msg.value != 0, "gas can not be 0");

        require(msg.sender != newOwner, "Can not equal");

        if (0 == accounts[msg.sender].amount) {
            return false;
        }
        Account storage account = accounts[msg.sender];
        account.grantAccount[newOwner] += amount;

        return true;
    }

    function decAllowance(address newOwner,uint256 amount) public payable returns (bool) {
        require(amount != 0, "amount can not be 0");
        require(msg.value != 0, "gas can not be zero");

        require(msg.sender != newOwner, "Can not equal");

        if (0 == accounts[msg.sender].amount) {
            return false;
        }
        Account storage account = accounts[msg.sender];
        if (0 == account.grantAccount[newOwner]) {
            return false;
        }

        if (account.grantAccount[newOwner] > amount) {
            account.grantAccount[newOwner] -= amount;
        } else {
            delete account.grantAccount[newOwner];
        }
        return true;
    }

    function transfer_from(address owner, address newOwner,uint256 amount) public payable returns (bool) {
        require(amount != 0, "amount can not be 0");
        require(msg.value != 0, "gas can not be zero");
        require(owner != newOwner, "gas can not be zero");

        // Retrieving the account from the state.
        if (0 == accounts[owner].amount) {
            return false;
        }

        Account storage account = accounts[owner];
        require(account.amount >= amount, "not enough");
        account.amount -= amount;
        if (msg.sender != owner) {
            if (0 == account.grantAccount[msg.sender]) {
                delete account.grantAccount[msg.sender];
            }
            require(account.grantAccount[msg.sender] >= amount, "not enough");

            if (account.grantAccount[msg.sender] > amount) {
                account.grantAccount[msg.sender] -= amount;
            } else {
                delete account.grantAccount[msg.sender];
            }
        }

        accounts[newOwner].amount += amount;
        return true;
    }

    function transfer(address newOwner,uint256 amount) public payable returns (bool) {
        require(amount != 0, "amount can not be 0");
        require(msg.value != 0, "gas can not be zero");
        return transfer_from(msg.sender, newOwner, amount);
    }
}