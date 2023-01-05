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
        
        proxyRegistryCon = await ethers.getContractFactory("ProxyRegistry");
        proxyRegistry = await proxyRegistryCon.deploy(coreProxy.address, admin.address);
        await proxyRegistry.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry.address)

        await coreProxy.initialize(generalContractor.address, 1, coreGovernance.address, multiLimit.address)
        await generalContractor.initialize(coreProxy.address, 1, coreGovernance.address, 0, 0, proxyRegistry.address, nfrFactory.address)
    
        // sub general
        headerSyncMockCon = await ethers.getContractFactory("HeaderSyncMock");
        headerSyncMock = await headerSyncMockCon.deploy();
        await headerSyncMock.deployed();
        console.log("headerSyncMock "  + headerSyncMock.address)

        topBridgeCon = await ethers.getContractFactory("TopBridge");
        topBridge = await topBridgeCon.deploy();
        await topBridge.deployed();
        console.log("topBridge "  + topBridge.address)
        await topBridge.initialize(0, admin.address)
    
        ethLikeProverCon = await ethers.getContractFactory("TestEthLikeProver");
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
    
        nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample.address, subContractor.address);
        await nfrFactory1.deployed();

        testGovernedCon = await ethers.getContractFactory("TestGoverned");
        testGoverned = await testGovernedCon.deploy();
        await testGoverned.deployed();
    
        console.log("TestGoverned "  + nfrFactory1.address)
    
        proxyRegistry1 = await proxyRegistryCon.deploy(edgeProxy.address, admin.address);
        await proxyRegistry1.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry1.address)	

        await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, edgeGovernance.address, 0, proxyRegistry1.address, nfrFactory1.address)
        await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, edgeGovernance.address, limit.address)
        const {bindEdgeGovernances,bindGovernedContractsOfEdge,bindGovernedContractsOfCore} = require('./helpers/testGovernanceConfig')
   })

    describe('initialize', () => {
        it('EdgeGovernance', async () => {
            await expect(edgeGovernance.initialize(AddressZero, 2, ethLikeProver.address, admin.address, deployer.address)).
            to.be.revertedWith("invalid core governance")
            await expect(edgeGovernance.initialize(coreGovernance.address, 2, user.address, admin.address, deployer.address)).
            to.be.revertedWith("invalid prover")
            await expect(edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, AddressZero, deployer.address)).
            to.be.revertedWith("invalid owner")
            await expect(edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, AddressZero)).
            to.be.revertedWith("invalid acceptor")
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            await expect(edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)).
            to.be.revertedWith('Initializable: contract is already initialized')
        })

        it('CoreGovernance', async () => {
            await expect(coreGovernance.initialize(1, AddressZero, deployer.address, deployer.address, 0)).
            to.be.revertedWith('invalid owner')
            await expect(coreGovernance.initialize(1, admin.address, AddressZero, deployer.address, 0)).
            to.be.revertedWith('invalid proposer')
            await expect(coreGovernance.initialize(1, admin.address, deployer.address, AddressZero, 0)).
            to.be.revertedWith('invalid acceptor')
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await expect(coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)).
            to.be.revertedWith('Initializable: contract is already initialized')
        })
    })

    describe('bindGovernedContract', () => {
        it('EdgeGovernance', async () => {
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            for (i in bindGovernedContractsOfEdge) {
                if (bindGovernedContractsOfEdge[i].expect.length != 0) {
                    await expect(edgeGovernance.connect(bindGovernedContractsOfEdge[i].caller).
                            bindGovernedContract(bindGovernedContractsOfEdge[i].governed)).
                          to.be.revertedWith(bindGovernedContractsOfEdge[i].expect)
                } else {
                    await edgeGovernance.connect(bindGovernedContractsOfEdge[i].caller).
                            bindGovernedContract(bindGovernedContractsOfEdge[i].governed)
                }
            }

            await expect(edgeGovernance.bindGovernedContract(edgeGovernance.address)).to.be.revertedWith('not myself')
        })

        it('CoreGovernance', async () => {
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
            for (i in bindGovernedContractsOfCore) {
                if (bindGovernedContractsOfCore[i].expect.length != 0) {
                    await expect(coreGovernance.connect(bindGovernedContractsOfCore[i].caller).
                            bindGovernedContract(bindGovernedContractsOfCore[i].governed)).
                          to.be.revertedWith(bindGovernedContractsOfCore[i].expect)
                } else {
                    await coreGovernance.connect(bindGovernedContractsOfCore[i].caller).
                            bindGovernedContract(bindGovernedContractsOfCore[i].governed)
                }
            }

            await expect(coreGovernance.bindGovernedContract(coreGovernance.address)).to.be.revertedWith('not myself')
        })
    })

    describe('bindEdgeGovernance', () => {
        it('CoreGovernance', async () => {
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            for (i in bindEdgeGovernances) {
                if (bindEdgeGovernances[i].expect .length != 0) {
                    await expect(coreGovernance.connect(bindEdgeGovernances[i].caller).
                            bindEdgeGovernance(bindEdgeGovernances[i].chainId,
                                bindEdgeGovernances[i].contractor,
                                bindEdgeGovernances[i].prover)).
                          to.be.revertedWith(bindEdgeGovernances[i].expect)
                } else {
                    await coreGovernance.connect(bindEdgeGovernances[i].caller).bindEdgeGovernance(bindEdgeGovernances[i].chainId,
                        bindEdgeGovernances[i].contractor,
                        bindEdgeGovernances[i].prover)
                }
            }
        })
    })

    describe('grantRole', () => {
        it('adminRole', async () => {
            await topBridge.connect(admin).grantRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', edgeGovernance.address)
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
            await coreGovernance.bindGovernedContract(generalContractor.address)
            await edgeGovernance.bindGovernedContract(subContractor.address)
            await edgeGovernance.bindGovernedContract(topBridge.address)

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
            }, ['0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de', user1.address]);

            await expect(coreGovernance.propose(abiCall)).to.be.revertedWith('invalid method')
            expect (await generalContractor.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de', user1.address)).to.equal(false)

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
            }, ['0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de', user1.address]);

            //========================================================================
            let tx = await coreGovernance.propose(abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposed")
            await coreGovernance.accept(event.topics[1])
            expect (await generalContractor.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de', user1.address)).to.equal(true)
            await expect(coreGovernance.accept(1000)).to.be.revertedWith('proposal is not exist')
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            let block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            
            // wrong contract address
            let contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = AddressZero
            rc.logs[event.logIndex].address = AddressZero
            let re = Receipt.fromRpc(targetReceipt)
            let rlpLog = new LOGRLP(rc.logs[event.logIndex])
            let rlplog = Log.fromRpc(rlpLog)
            let value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            let blockHash = keccak256(proof.header.buffer)
            let schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            let buffer = borsh.serialize(schema, value)
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('core governance is zero')
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress

            contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = user.address
            rc.logs[event.logIndex].address = user.address
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('core governance is error')
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress

            // wrong signature
            let signature = targetReceipt.logs[event.logIndex].topics[0]
            targetReceipt.logs[event.logIndex].topics[0] = user.address
            rc.logs[event.logIndex].topics[0] = user.address
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value)
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('invalid signature')
            targetReceipt.logs[event.logIndex].topics[0] = signature
            rc.logs[event.logIndex].topics[0] = signature

            // wrong method
            let data = targetReceipt.logs[event.logIndex].data
            let newData = (targetReceipt.logs[event.logIndex].data).substr(0,135) + '3'+ (targetReceipt.logs[event.logIndex].data).substr(136)
            targetReceipt.logs[event.logIndex].data = newData
            rc.logs[event.logIndex].data = newData
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value)
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('invalid method')
            targetReceipt.logs[event.logIndex].data = data
            rc.logs[event.logIndex].data = data

            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await ethLikeProver.set(false)
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('proof is invalid')
            await ethLikeProver.set(true)
            tx = await edgeGovernance.propose(buffer)
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('proof is reused')
            rc = await tx.wait()
            await edgeGovernance.accept(event.topics[1])
            expect (await subContractor.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de', user1.address)).to.equal(true)
            expect (await topBridge.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de', user1.address)).to.equal(true)
        })

        it('core fail to apply governance', async () => {
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
            await coreGovernance.bindGovernedContract(generalContractor.address)
            await coreGovernance.bindGovernedContract(testGoverned.address)
            await edgeGovernance.bindGovernedContract(subContractor.address)
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
            let tx = await coreGovernance.propose(abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposed")
            await expect(coreGovernance.accept(event.topics[1])).to.be.revertedWith('fail to apply governance')
        })

        it('edge fail to apply governance', async () => {
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
            await coreGovernance.bindGovernedContract(generalContractor.address)
            await edgeGovernance.bindGovernedContract(testGoverned.address)
            await edgeGovernance.bindGovernedContract(subContractor.address)
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
            let tx = await coreGovernance.propose(abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposed")
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

            tx = await edgeGovernance.propose(buffer)
            await expect(edgeGovernance.accept(event.topics[1])).to.be.revertedWith('fail to apply governance')
        })

        it('wrong number of topic', async () => {
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
            await coreGovernance.bindGovernedContract(generalContractor.address)
            await edgeGovernance.bindGovernedContract(subContractor.address)

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
            let tx = await coreGovernance.propose(abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposed")
            tx = await coreGovernance.accept(event.topics[1])
            await expect(coreGovernance.connect(user).accept(event.topics[1])).to.be.revertedWith('is missing role')
            rc = await tx.wait()
            //construct receipt proof
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

            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('wrong number of topic')
        })

        it('revokeRole', async () => {
            await coreGovernance.initialize(1, admin.address, deployer.address, deployer.address, 0)
            await edgeGovernance.initialize(coreGovernance.address, 2, ethLikeProver.address, admin.address, deployer.address)
            await coreGovernance.bindEdgeGovernance(2, edgeGovernance.address, ethLikeProver.address)
            await coreGovernance.bindGovernedContract(generalContractor.address)
            await edgeGovernance.bindGovernedContract(subContractor.address)

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
            let tx = await coreGovernance.propose(abiCall)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GovernanceProposed")
            await coreGovernance.accept(event.topics[1])
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

            tx = await edgeGovernance.propose(buffer)
            await expect(edgeGovernance.propose(buffer)).to.be.revertedWith('proof is reused')
            rc = await tx.wait()
            await edgeGovernance.accept(event.topics[1])
            expect (await subContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(true)
            await expect(edgeGovernance.accept(1000)).to.be.revertedWith('proposal is not exist')
            await expect(edgeGovernance.connect(user).accept(1000)).to.be.revertedWith('is missing role')

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
            tx = await coreGovernance.propose(abiCall)
            rc = await tx.wait()
            event = rc.events.find(event=>event.event === "GovernanceProposed")
            await coreGovernance.accept(event.topics[1])
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

            tx = await edgeGovernance.propose(buffer)
            rc = await tx.wait()
            await edgeGovernance.accept(event.topics[1])
            expect (await subContractor.hasRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user1.address)).to.equal(false)
        })
    })
})