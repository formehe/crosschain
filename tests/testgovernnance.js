const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const borsh = require("borsh")

const buffer = require('safe-buffer').Buffer;
const rpc = require('isomorphic-rpc')
const { RobustWeb3, JSONreplacer } = require('rainbow-bridge-utils')

const { GetAndVerify, GetProof, VerifyProof } = require('eth-proof')
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')
const { Account, Header, Log, Proof, Receipt, Transaction } = require("eth-object")
const Web3EthAbi = require('web3-eth-abi')

const toWei = ethers.utils.parseEther

class ReceiptRLP {
    constructor(status, cumulativeGasUsed, logsBloom, logs) {
        this.status = rc.status
        if (rc.hasOwnProperty("root")) {
            this.root = rc.root
        }
        this.cumulativeGasUsed = new BN(rc.cumulativeGasUsed.toNumber())
        this.logsBloom = rc.logsBloom
        this.logs = new Array()
        for (var key in rc.logs) {
            if(rc.logs.hasOwnProperty(key)) {
                this.logs.push(rc.logs[key])
            }
        }
    }
}

class LOGRLP {
    constructor(log) {
        this.address = log.address
        this.data = log.data
        this.topics = new Array()
        for (var key in log.topics) {
            if(log.topics.hasOwnProperty(key)) {
                this.topics.push(log.topics[key])
            }
        }
    }
}

class TxProof {
    constructor(logIndex, logEntryData, reciptIndex, reciptData, headerData, proof) {
       this.logIndex = logIndex
       this.logEntryData = logEntryData
       this.reciptIndex = reciptIndex
       this.reciptData = new Uint8Array(1 + reciptData.length);
       this.reciptData[0] = 2;
       for (var i = 0; i < reciptData.length; i++) {
           this.reciptData[i + 1] = reciptData[i];
       }
       this.headerData = headerData
       
       this.proof = []

       for (const node of proof) {
           var tmp = new Uint8Array(1 + node[1].length);
           tmp[0] = 2;
           var i = 1;
           for (var i = 0; i < node[1].length; i++) {
               tmp[i + 1] = node[1][i];
           }
           this.proof.push(rlp.encode([node[0], tmp]))
       }
   }
}

describe('Governance', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+deployer.address)
        console.log("wallet2 "+admin.address)
        console.log("wallet3 "+miner.address)
        
        coreGovernanceCon = await ethers.getContractFactory("CoreGovernance");
        coreGovernance = await coreGovernanceCon.deploy();
        await coreGovernance.deployed();
        console.log("CoreGovernance "  + coreGovernance.address)

        edgeGovernanceCon = await ethers.getContractFactory("EdgeGovernance");
        edgeGovernance = await edgeGovernanceCon.deploy();
        await edgeGovernance.deployed();
        console.log("EdgeGovernance "  + edgeGovernance.address)
            
        limitCon = await ethers.getContractFactory("Limit");
        limit = await limitCon.deploy(admin.address);
        await limit.deployed();
        console.log("Limit "  + limit.address)
    
        multiLimitCon = await ethers.getContractFactory("MultiLimit");
        multiLimit = await multiLimitCon.deploy(admin.address);
        await multiLimit.deployed();
    
        console.log("multiLimit "  + multiLimit.address)
    
        coreProxyCon = await ethers.getContractFactory("CoreProxy");
        coreProxy = await coreProxyCon.deploy();
        await coreProxy.deployed();
    
        console.log("coreProxy "  + coreProxy.address)
    
        generalContractorCon = await ethers.getContractFactory("GeneralContractor");
        generalContractor = await generalContractorCon.deploy();
        await generalContractor.deployed();
    
        console.log("generalContractor "  + generalContractor.address)
    
        erc20TokenSampleCon = await ethers.getContractFactory("ERCTemplate");
        erc20TokenSample = await erc20TokenSampleCon.deploy();
        await erc20TokenSample.deployed();
    
        console.log("erc20TokenSample "  + erc20TokenSample.address)
    
        nfrFactoryCon = await ethers.getContractFactory("NFRFactory");
        nfrFactory = await nfrFactoryCon.deploy(erc20TokenSample.address, generalContractor.address);
        await nfrFactory.deployed();
    
        console.log("nfrFactory "  + nfrFactory.address)
        
        await coreProxy.initialize(generalContractor.address, 1, coreGovernance.address, multiLimit.address)
        await generalContractor.initialize(coreProxy.address, 1, coreGovernance.address)
    
        // sub general
        headerSyncMockCon = await ethers.getContractFactory("HeaderSyncMock");
        headerSyncMock = await headerSyncMockCon.deploy();
        await headerSyncMock.deployed();
    
        console.log("headerSyncMock "  + headerSyncMock.address)
    
        ethLikeProverCon = await ethers.getContractFactory("EthLikeProver");
        ethLikeProver = await ethLikeProverCon.deploy(headerSyncMock.address);
        await ethLikeProver.deployed();
    
        console.log("ethLikeProver "  + ethLikeProver.address)
    
        subContractorCon = await ethers.getContractFactory("SubContractor");
        subContractor = await subContractorCon.deploy();
        await subContractor.deployed();
    
        console.log("subContractor "  + subContractor.address)
    
        edgeProxyCon = await ethers.getContractFactory("EdgeProxy");
        edgeProxy = await edgeProxyCon.deploy();
        await edgeProxy.deployed();
    
        console.log("edgeProxy "  + edgeProxy.address)
    
        nfrFactoryCon1 = await ethers.getContractFactory("NFRFactory");
        nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample.address, subContractor.address);
        await nfrFactory1.deployed();
    
        console.log("nfrFactory "  + nfrFactory1.address)
    
        await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, edgeGovernance.address)
        await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, edgeGovernance.address, limit.address)

        await coreGovernance.initialize(1, admin.address)
        await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address)

        await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
        await coreGovernance.bindGovernedContract(generalContractor.address)
        await edgeGovernance.bindGovernedContract(subContractor.address)
    })

    describe('grantRole', () => {
        it('adminRole', async () => {
            let abiCall = Web3EthAbi.encodeFunctionCall({
                name: 'renounceRole',
                type: 'function',
                inputs: [{
                    type: 'bytes32',
                    name: 'role'
                },{
                    type: 'address',
                    name: 'account'
                }]
            }, ['0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address]);

            await coreGovernance.propose('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', '0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', [1,2], abiCall)
            expect (await generalContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(false)

            abiCall = Web3EthAbi.encodeFunctionCall({
                name: 'grantRole',
                type: 'function',
                inputs: [{
                    type: 'bytes32',
                    name: 'role'
                },{
                    type: 'address',
                    name: 'account'
                }]
            }, ['0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address]);

            //========================================================================
            let tx = await coreGovernance.propose('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', '0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', [1,2], abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposal")

            expect (await generalContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(true)
      
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            let block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            let re = Receipt.fromRpc(targetReceipt)
            let rlpLog = new LOGRLP(rc.logs[event.logIndex])
            let rlplog = Log.fromRpc(rlpLog)
            let value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            let blockHash = keccak256(proof.header.buffer)
            let schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            let buffer = borsh.serialize(schema, value);

            tx = await edgeGovernance.applyProposal(buffer)
            rc = await tx.wait()

            expect (await subContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(true)
        })

        it('revokeRole', async () => {
            abiCall = Web3EthAbi.encodeFunctionCall({
                name: 'grantRole',
                type: 'function',
                inputs: [{
                    type: 'bytes32',
                    name: 'role'
                },{
                    type: 'address',
                    name: 'account'
                }]
            }, ['0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address]);

            //========================================================================
            let tx = await coreGovernance.propose('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', '0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', [1,2], abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposal")
            expect (await generalContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(true)
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            let block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            let re = Receipt.fromRpc(targetReceipt)
            let rlpLog = new LOGRLP(rc.logs[event.logIndex])
            let rlplog = Log.fromRpc(rlpLog)
            let value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            let blockHash = keccak256(proof.header.buffer)
            let schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            let buffer = borsh.serialize(schema, value);

            tx = await edgeGovernance.applyProposal(buffer)
            rc = await tx.wait()
            expect (await subContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(true)

            abiCall = Web3EthAbi.encodeFunctionCall({
                name: 'revokeRole',
                type: 'function',
                inputs: [{
                    type: 'bytes32',
                    name: 'role'
                },{
                    type: 'address',
                    name: 'account'
                }]
            }, ['0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address]);

            //========================================================================
            tx = await coreGovernance.propose('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', '0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', [1,2], abiCall)
            rc = await tx.wait()
            event = rc.events.find(event=>event.event === "GovernanceProposal")

            expect (await generalContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(false)
      
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);

            tx = await edgeGovernance.applyProposal(buffer)
            rc = await tx.wait()

            expect (await subContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(false)
        })
    })
})