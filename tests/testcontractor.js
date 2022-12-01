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

describe('GeneralContractor', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+deployer.address)
        console.log("wallet2 "+admin.address)
        console.log("wallet3 "+miner.address)

        issueCoderCon = await ethers.getContractFactory("testIssueCoder");
        issueCoder = await issueCoderCon.deploy();
        await issueCoder.deployed();
    
        console.log("testIssueCoder "  + issueCoder.address)
    
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
        
        await coreProxy.initialize(generalContractor.address, 1, admin.address, multiLimit.address)
        await expect(generalContractor.initialize(coreProxy.address, 1, AddressZero, 0, 0, proxyRegistry.address, nfrFactory.address)).
        to.be.revertedWith('invalid owner')
        await expect(generalContractor.initialize(user.address, 1, admin.address, 0, 0, proxyRegistry.address, nfrFactory.address)).
        to.be.revertedWith('invalid local proxy')
        await expect(generalContractor.initialize(coreProxy.address, 1, admin.address, 0, 1, user.address, nfrFactory.address)).
        to.be.revertedWith('invalid minter proxy')
        await expect(generalContractor.initialize(coreProxy.address, 1, admin.address, 0, 0, proxyRegistry.address, user.address)).
        to.be.revertedWith('invalid token factory address')
        await generalContractor.initialize(coreProxy.address, 1, admin.address, 4, 4, proxyRegistry.address, nfrFactory.address)
    
        // sub general
        headerSyncMockCon = await ethers.getContractFactory("HeaderSyncMock");
        headerSyncMock = await headerSyncMockCon.deploy();
        await headerSyncMock.deployed();
    
        console.log("headerSyncMock "  + headerSyncMock.address)
    
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
    
        nfrFactoryCon1 = await ethers.getContractFactory("NFRFactory");
        nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample.address, subContractor.address);
        await nfrFactory1.deployed();
    
        console.log("nfrFactory "  + nfrFactory1.address)
    
        proxyRegistryCon1 = await ethers.getContractFactory("ProxyRegistry");
        proxyRegistry1 = await proxyRegistryCon1.deploy(edgeProxy.address, admin.address);
        await proxyRegistry1.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry1.address)

        await expect(subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, AddressZero, 0, proxyRegistry1.address, nfrFactory1.address)).
        to.be.revertedWith('invalid owner')
        await expect(subContractor.initialize(AddressZero, 2, edgeProxy.address, ethLikeProver.address, admin.address, 0, proxyRegistry1.address, nfrFactory1.address)).
        to.be.revertedWith('invalid general contractor')
        await expect(subContractor.initialize(generalContractor.address, 2, user.address, ethLikeProver.address, admin.address, 0, proxyRegistry1.address, nfrFactory1.address)).
        to.be.revertedWith('invalid local proxy')
        await expect(subContractor.initialize(generalContractor.address, 2, edgeProxy.address, user.address, admin.address, 0, proxyRegistry1.address, nfrFactory1.address)).
        to.be.revertedWith('invalid prover')
        await expect(subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address, 0, user.address, nfrFactory1.address)).
        to.be.revertedWith('invalid minter proxy')
        await expect(subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address, 0, proxyRegistry1.address, user.address)).
        to.be.revertedWith('invalid token factory address')
        await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address, 3, proxyRegistry1.address, nfrFactory1.address)
        await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)

        // sub general
        headerSyncMockCon1 = await ethers.getContractFactory("HeaderSyncMock");
        headerSyncMock1 = await headerSyncMockCon1.deploy();
        await headerSyncMock1.deployed();
    
        console.log("headerSyncMock "  + headerSyncMock1.address)
    
        ethLikeProverCon1 = await ethers.getContractFactory("TestEthLikeProver");
        ethLikeProver1 = await ethLikeProverCon1.deploy(headerSyncMock1.address);
        await ethLikeProver1.deployed();
    
        console.log("ethLikeProver "  + ethLikeProver1.address)
    
        subContractorCon1 = await ethers.getContractFactory("SubContractor");
        subContractor1 = await subContractorCon1.deploy();
        await subContractor1.deployed();
    
        console.log("subContractor "  + subContractor1.address)
    
        edgeProxyCon1 = await ethers.getContractFactory("EdgeProxy");
        edgeProxy1 = await edgeProxyCon1.deploy();
        await edgeProxy1.deployed();
    
        console.log("edgeProxy "  + edgeProxy1.address)
    
        nfrFactoryCon2 = await ethers.getContractFactory("NFRFactory");
        nfrFactory2 = await nfrFactoryCon2.deploy(erc20TokenSample.address, subContractor1.address);
        await nfrFactory2.deployed();
    
        console.log("nfrFactory "  + nfrFactory2.address)
    
        proxyRegistryCon2 = await ethers.getContractFactory("ProxyRegistry");
        proxyRegistry2 = await proxyRegistryCon2.deploy(edgeProxy1.address, admin.address);
        await proxyRegistry2.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry2.address)

        await subContractor1.initialize(generalContractor.address, 3, edgeProxy1.address, ethLikeProver1.address, admin.address, 3, proxyRegistry2.address, nfrFactory2.address)
        await edgeProxy1.initialize(ethLikeProver1.address, generalContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)

        issueInfo = {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        }
    })

    describe('bindSubContractor', () => {
        it('bind subcontractor', async () => {
            await expect(generalContractor.bindSubContractor(1, subContractor.address, AddressZero)).
            to.be.revertedWith('can not bind on main chain')
            await expect(generalContractor.bindSubContractor(2, subContractor.address, AddressZero)).
            to.be.revertedWith('invalid prover address')
            await expect(generalContractor.bindSubContractor(2, AddressZero, ethLikeProver.address)).
            to.be.revertedWith('invalid subcontractor address')
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
        })

        it('repeat bind subcontractor', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            await expect(generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)).
            to.be.revertedWith('chain has been bound')
        })
    })

    describe('bindHistoryContractGroup', () => {
        it('bindHistoryContractGroup', async () => {
            await expect(generalContractor.bindHistoryContractGroup(0, 1, [1,2], [user.address, admin.address])).
            to.be.revertedWith('contract group id can not be 0')
            await expect(generalContractor.bindHistoryContractGroup(5, 1, [1,2], [user.address, admin.address])).
            to.be.revertedWith('contract group id is overflow')
            await expect(generalContractor.bindHistoryContractGroup(1, 0, [1,2], [user.address, admin.address])).
            to.be.revertedWith('salt id can not be 0')
            await expect(generalContractor.bindHistoryContractGroup(1, 5, [1,2], [user.address, admin.address])).
            to.be.revertedWith('salt id is overflow')
            await expect(generalContractor.bindHistoryContractGroup(1, 1, [1,2], [user.address])).
            to.be.revertedWith('invalid chains info')
            await expect(generalContractor.bindHistoryContractGroup(1, 1, [2], [AddressZero])).
            to.be.revertedWith('chain is not bound')
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            await expect(generalContractor.bindHistoryContractGroup(1, 1, [2], [AddressZero])).
            to.be.revertedWith('must issue on main chain')
            await expect(generalContractor.bindHistoryContractGroup(1, 1, [1,2], [AddressZero, admin.address])).
            to.be.revertedWith('invalid asset address')
            await expect(generalContractor.bindHistoryContractGroup(1, 1, [1,2], [user.address, admin.address])).
            to.be.revertedWith('local asset is not exist')
            let tx = await generalContractor.bindHistoryContractGroup(1, 1, [1,2], [ethLikeProver.address, user.address])
            await expect(generalContractor.bindHistoryContractGroup(1, 1, [1,2], [ethLikeProver.address, subContractor.address])).
            to.be.revertedWith('asset generate info has been bound')

            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "HistoryContractorGroupBound")
      
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            let block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            
            let contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = AddressZero
            rc.logs[event.logIndex].address = AddressZero
            let re = Receipt.fromRpc(targetReceipt)
            let rlpLog = new LOGRLP(rc.logs[event.logIndex])
            let rlplog = Log.fromRpc(rlpLog)
            let value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            let blockHash = keccak256(proof.header.buffer)
            let schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            let buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('general contractor address is zero')

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
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('general contractor address is error')

            // wrong groupid
            let groupId = targetReceipt.logs[event.logIndex].topics[1]
            targetReceipt.logs[event.logIndex].topics[1] = 0
            rc.logs[event.logIndex].topics[1] = 0
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[1] = groupId
            rc.logs[event.logIndex].topics[1] = groupId
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('contract group id can not be 0')

            groupId = targetReceipt.logs[event.logIndex].topics[1]
            targetReceipt.logs[event.logIndex].topics[1] = 4
            rc.logs[event.logIndex].topics[1] = 4
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[1] = groupId
            rc.logs[event.logIndex].topics[1] = groupId
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('contract group id is bigger')
            
            // wrong signature
            let signatrue = targetReceipt.logs[event.logIndex].topics[0]
            targetReceipt.logs[event.logIndex].topics[0] = user.address
            rc.logs[event.logIndex].topics[0] = user.address
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[0] = signatrue
            rc.logs[event.logIndex].topics[0] = signatrue
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('invalid signature')        
            
            // // wrong asset
            //  let topics = targetReceipt.logs[event.logIndex].topics
            //  targetReceipt.logs[event.logIndex].topics[3] = AddressZero
            //  rc.logs[event.logIndex].topics[3] = AddressZero
            //  re = Receipt.fromRpc(targetReceipt)
            //  rlpLog = new LOGRLP(rc.logs[event.logIndex])
            //  rlplog = Log.fromRpc(rlpLog)
            //  value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            //  blockHash = keccak256(proof.header.buffer)
            //  schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            //  buffer = borsh.serialize(schema, value);
            //  targetReceipt.logs[event.logIndex].topics = topics
            //  rc.logs[event.logIndex].topics = topics
            //  await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('wrong number of topics')

            //invalid asset address
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await ethLikeProver.set(false)
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('proof is invalid')
            await ethLikeProver.set(true)
            await expect(subContractor.bindHistoryContractGroup(buffer)).to.be.revertedWith('invalid asset address')

            //repeat bindContractGroup
            tx = await generalContractor.bindHistoryContractGroup(4, 4, [1,2], [ethLikeProver.address, subContractor.address])
            rc = await tx.wait()
            block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await expect(subContractor.bindHistoryContractGroup(buffer)).
            to.be.revertedWith('contract group id is bigger')

            await generalContractor.bindSubContractor(3, subContractor1.address, ethLikeProver.address)

            tx = await generalContractor.bindHistoryContractGroup(3, 3, [1,2,3], [ethLikeProver.address, subContractor.address, subContractor.address])
            rc = await tx.wait()
            event = rc.events.find(event=>event.event === "HistoryContractorGroupBound")
            block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await subContractor.bindHistoryContractGroup(buffer)
            await expect(subContractor1.bindHistoryContractGroup(buffer)).to.be.revertedWith('fail to bind contract group')
            await expect(subContractor.bindHistoryContractGroup(buffer)).
            to.be.revertedWith('proof is reused')
        })
    })

    describe('issue', () => {
        it('issue nfr success', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            await generalContractor.issue(bytesOfIssue)
        })

        it('not issue on main chain', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('must issue on main chain')
        })

        it('issue on not bind chain', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 3,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('chain is not bound')
        })

        it('issue nfr,number of rights is not equal', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('number of rights is not equal')
        })

        it('issue nfr,right kind is not exist', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:2,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('right kind is not exist')
        })

        it('issue nfr,right kind is not consistent', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:0,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('right kind is not exist')
        })

        it('issue nfr,rights id is repeat', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:0, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:0,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('rights id is repeat')
        })

        it('issue nfr,chain is repeat', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(bytesOfIssue)).
            to.be.revertedWith('chains id is repeated')
        })

        it('issue nft success', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                        ]
                    },
                    {
                        issuer: miner.address,
                        chainId: 2,
                        amountOfToken: 50,
                        circulationOfRights: [
                        ]
                    }
                ]
            }

            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await generalContractor.issue(bytesOfIssue)
        })
    })

    describe('bindContractGroup', () => {
        it('bindContractGroup success', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            //========================================================================
            let tx = await generalContractor.issue(bytesOfIssue)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
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

            tx = await subContractor.subIssue(buffer)
            rc = await tx.wait()
            //========================================================================
            event = rc.events.find(event=>event.event === "SubContractorIssue")
            console.log(event.topics[3])
            console.log((event.topics[3]))
            templateAddr = "0x"+ (event.topics[3]).substring(26)
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)

            // wrong contract address
            let contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = AddressZero
            rc.logs[event.logIndex].address = AddressZero
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('invalid peer sub contractor')

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
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('peer sub contractor is not bound')

            // wrong chainId
            let chainId = targetReceipt.logs[event.logIndex].topics[1]
            targetReceipt.logs[event.logIndex].topics[1] = 100
            rc.logs[event.logIndex].topics[1] = 100
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[1] = chainId
            rc.logs[event.logIndex].topics[1] = chainId
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('peer sub contractor is not bound')

            // wrong groupid
            let groupId = targetReceipt.logs[event.logIndex].topics[2]
            targetReceipt.logs[event.logIndex].topics[2] = 100
            rc.logs[event.logIndex].topics[2] = 100
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[2] = groupId
            rc.logs[event.logIndex].topics[2] = groupId
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('contract group is not exist')
            
             // wrong asset
             let asset = targetReceipt.logs[event.logIndex].topics[3]
             targetReceipt.logs[event.logIndex].topics[3] = AddressZero
             rc.logs[event.logIndex].topics[3] = AddressZero
             re = Receipt.fromRpc(targetReceipt)
             rlpLog = new LOGRLP(rc.logs[event.logIndex])
             rlplog = Log.fromRpc(rlpLog)
             value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
             blockHash = keccak256(proof.header.buffer)
             schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
             buffer = borsh.serialize(schema, value);
             targetReceipt.logs[event.logIndex].topics[3] = asset
             rc.logs[event.logIndex].topics[3] = asset
             await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('fail to bind contract group')

            // wrong signature
            let signatrue = targetReceipt.logs[event.logIndex].topics[0]
            targetReceipt.logs[event.logIndex].topics[0] = user.address
            rc.logs[event.logIndex].topics[0] = user.address
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[0] = signatrue
            rc.logs[event.logIndex].topics[0] = signatrue
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('invalid signature')

            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[0])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(0, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('wrong number of topics')

            //success
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await ethLikeProver.set(false)
            await expect(generalContractor.bindContractGroup(buffer)).to.be.revertedWith('proof is invalid')
            await ethLikeProver.set(true)
            await generalContractor.bindContractGroup(buffer)
            //repeat bindContractGroup
            await expect(generalContractor.bindContractGroup(buffer)).
            to.be.revertedWith('event of proof cannot be reused')
        })
    })

    describe('expand', () => {
        it('expand', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right1 uri",
                            agreement: "right1 agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right2 uri",
                            agreement: "right2 agreement"
                        },
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            //========================================================================
            let tx = await generalContractor.issue(bytesOfIssue)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
            console.log(event)

            await expect(generalContractor.expand(100, 2, admin.address)).to.be.revertedWith('group id has not issued')
            await expect(generalContractor.expand(event.topics[2], 100, admin.address)).to.be.revertedWith('chain is not bound')

            tx = await generalContractor.expand(event.topics[2], 2, admin.address)
            rc = await tx.wait()
            event = rc.events.find(event=>event.event === "GeneralContractorIssue")

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

            tx = await subContractor.subIssue(buffer)
            rc = await tx.wait()
            //========================================================================
            event = rc.events.find(event=>event.event === "SubContractorIssue")
            console.log(event.topics[3])
            templateAddr = "0x"+ (event.topics[3]).substring(26)
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
            await generalContractor.bindContractGroup(buffer)
            await expect(generalContractor.bindContractGroup(buffer)).
            to.be.revertedWith('event of proof cannot be reused')

            erc20SampleInstance = await erc20TokenSampleCon.attach(templateAddr)
            await expect(erc20SampleInstance.connect(admin).burn(1)).to.be.revertedWith('ERC721: operator query for nonexistent token')
        })
    })
})

describe('SubContractor', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+deployer.address)
        console.log("wallet2 "+admin.address)
        console.log("wallet3 "+miner.address)

        issueCoderCon = await ethers.getContractFactory("testIssueCoder");
        issueCoder = await issueCoderCon.deploy();
        await issueCoder.deployed();
    
        console.log("testIssueCoder "  + issueCoder.address)
    
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

        await coreProxy.initialize(generalContractor.address, 1, admin.address, multiLimit.address)
        await generalContractor.initialize(coreProxy.address, 1, admin.address, 0, 0, proxyRegistry.address, nfrFactory.address)
    
        // sub general
        headerSyncMockCon = await ethers.getContractFactory("HeaderSyncMock");
        headerSyncMock = await headerSyncMockCon.deploy();
        await headerSyncMock.deployed();
    
        console.log("headerSyncMock "  + headerSyncMock.address)
    
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
    
        nfrFactoryCon1 = await ethers.getContractFactory("NFRFactory");
        nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample.address, subContractor.address);
        await nfrFactory1.deployed();
    
        console.log("nfrFactory "  + nfrFactory1.address)

        proxyRegistryCon1 = await ethers.getContractFactory("ProxyRegistry");
        proxyRegistry1 = await proxyRegistryCon1.deploy(edgeProxy.address, admin.address);
        await proxyRegistry1.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry1.address)	
    
        await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address, 0, proxyRegistry1.address, nfrFactory1.address)
        await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)
    
        issueInfo = {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        }
    })

    describe('subIssue', () => {
        it('not subissue on this chain', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            issueInfo1= {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "test user",
                    certification: "test certification",
                    agreement: "test agreement",
                    uri:"test uri"
                },
                rights: [
                    {
                        id:0, 
                        right: {
                            name: "right1",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    },
                    {
                        id:1, 
                        right: {
                            name: "right2",
                            uri: "right uri",
                            agreement: "right agreement"
                        }
                    }
                ],
                issueOfChains:[
                    {
                        issuer: miner.address,
                        chainId: 1,
                        amountOfToken: 50,
                        circulationOfRights: [
                            {
                                id:0,
                                amount:50
                            },
                            {
                                id:1,
                                amount:50
                            }
                        ]
                    }
                ]
            }

            bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            //========================================================================
            let tx = await generalContractor.issue(bytesOfIssue)
            let rc = await tx.wait()
            event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
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
            let buffer = borsh.serialize(schema, value);
            await expect(subContractor.subIssue(buffer)).
            to.be.revertedWith('not issue on this chain')
        })

        it('not issue by general contractor address', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            //========================================================================
            let tx = await generalContractor.issue(bytesOfIssue)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
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

            subContractorCon1 = await ethers.getContractFactory("SubContractor");
            subContractor1 = await subContractorCon1.deploy();
            await subContractor1.deployed();
            await subContractor1.initialize(edgeProxy.address, 2, edgeProxy.address, ethLikeProver.address, admin.address, 0, proxyRegistry1.address, nfrFactory1.address)
            await expect(subContractor1.subIssue(buffer)).
            to.be.revertedWith('general contractor address is error')
        })

        it('repeat subIssue', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            //========================================================================
            let tx = await generalContractor.issue(bytesOfIssue)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
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
            await subContractor.subIssue(buffer)
            await expect(subContractor.subIssue(buffer)).
            to.be.revertedWith('proof is reused')
        })

        it('wrong proof', async () => {
            let tx = await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "SubContractorBound")
            console.log(rc)
            console.log("==================")
            console.log(event)
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
            await expect(subContractor.subIssue(buffer)).
            to.be.revertedWith('wrong number of topic')
        })

        it('subIssue success', async () => {
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            //========================================================================
            let tx = await generalContractor.issue(bytesOfIssue)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
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

            // wrong contract address
            let contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = AddressZero
            rc.logs[event.logIndex].address = AddressZero
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            await expect(subContractor.subIssue(buffer)).to.be.revertedWith('general contractor address is zero')

            // wrong contract address
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
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            await expect(subContractor.subIssue(buffer)).to.be.revertedWith('general contractor address is error')

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
            buffer = borsh.serialize(schema, value);
            targetReceipt.logs[event.logIndex].topics[0] = signature
            rc.logs[event.logIndex].topics[0] = signature
            await expect(subContractor.subIssue(buffer)).to.be.revertedWith('invalid signature')

            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[0])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(0, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await expect(subContractor.subIssue(buffer)).to.be.revertedWith('wrong number of topics')

            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await ethLikeProver.set(false)
            await expect(subContractor.subIssue(buffer)).to.be.revertedWith('proof is invalid')
            await ethLikeProver.set(true)
            await subContractor.subIssue(buffer)
        })
    })
})