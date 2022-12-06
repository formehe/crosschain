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

describe('proxy', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet " + deployer.address)
        console.log("wallet2 " + admin.address)
        console.log("wallet3 " + miner.address)

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

        await expect(coreProxy.initialize(generalContractor.address, 1, AddressZero, multiLimit.address)).
        to.be.revertedWith('invalid owner')
        await expect(coreProxy.initialize(user.address, 1, admin.address, multiLimit.address)).
        to.be.revertedWith('invalid general contractor')
        await expect(coreProxy.initialize(generalContractor.address, 1, admin.address, user.address)).
        to.be.revertedWith('invalid limit contractor')
        await generalContractor.initialize(coreProxy.address, 1, admin.address, 0, 0, proxyRegistry.address, nfrFactory.address)
        await coreProxy.initialize(generalContractor.address, 1, admin.address, multiLimit.address)
        await expect(coreProxy.initialize(generalContractor.address, 1, admin.address, multiLimit.address)).
        to.be.revertedWith('Initializable: contract is already initialized')

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
    
        nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample.address, subContractor.address);
        await nfrFactory1.deployed();
    
        console.log("nfrFactory "  + nfrFactory1.address)

        proxyRegistry1 = await proxyRegistryCon.deploy(edgeProxy.address, admin.address);
        await proxyRegistry1.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry1.address)
    
        await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address, 0, proxyRegistry1.address, nfrFactory1.address)
        await expect(edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, AddressZero, limit.address)).
        to.be.revertedWith('invalid owner')
        await expect(edgeProxy.initialize(ethLikeProver.address, user.address, coreProxy.address, 1, 2, admin.address, limit.address)).
        to.be.revertedWith('invalid sub contractor')
        await expect(edgeProxy.initialize(user.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)).
        to.be.revertedWith('invalid prover')
        await expect(edgeProxy.initialize(ethLikeProver.address, subContractor.address, AddressZero, 1, 2, admin.address, limit.address)).
        to.be.revertedWith('invalid peer proxy')
        await expect(edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, user.address)).
        to.be.revertedWith('invalid limit contract')
        await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)
        await expect(edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)).
        to.be.revertedWith('Initializable: contract is already initialized')

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

      await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
    
      let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
      //========================================================================
      let tx = await generalContractor.issue(bytesOfIssue)
      let rc = await tx.wait()
      let event = rc.events.find(event=>event.event === "GeneralContractorIssue")

      let event1 = rc.events.find(event=>event.topics[0] === "0xc1889a90696bd45dab537e0a41003065c4a8ab9a81b243f49ba039064e149dad")
      templateAddr1 = "0x"+ (event1.topics[3]).substring(26)

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
      templateAddr = "0x"+ (event.topics[3]).substring(26)
      contractGroupId = event.topics[2]
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
      buffer1 = borsh.serialize(schema, value);

      await coreProxy.bindPeerChain(2,ethLikeProver.address, edgeProxy.address)
      erc20SampleInstance = await erc20TokenSampleCon.attach(templateAddr)
      await erc20SampleInstance.connect(miner).attachRight(51,1)
      await erc20SampleInstance.connect(miner).approve(edgeProxy.address, 51)

      await erc20SampleInstance.connect(miner).attachRight(52,1)
      await erc20SampleInstance.connect(miner).approve(edgeProxy.address, 52)

      erc20SampleInstance = await erc20TokenSampleCon.attach(templateAddr1)
      await erc20SampleInstance.connect(miner).attachRight(1,1)
      await erc20SampleInstance.connect(miner).approve(coreProxy.address, 1)
      
      await erc20SampleInstance.connect(miner).attachRight(50,1)
      await erc20SampleInstance.connect(miner).approve(coreProxy.address, 50)
      
      coreProxy1 = await coreProxyCon.deploy();
      await coreProxy1.deployed();

      testProxyCon = await ethers.getContractFactory("TestProxy");
      testProxy1 = await testProxyCon.deploy(coreProxy1.address);
      await testProxy1.deployed();
  
      await coreProxy1.initialize(testProxy1.address, 1, admin.address, multiLimit.address)

      edgeProxy1 = await edgeProxyCon.deploy();
      await edgeProxy1.deployed();

      testProxy2 = await testProxyCon.deploy(edgeProxy1.address);
      await testProxy2.deployed();
    })

    describe('burn and mint', () => {
        it('bind peer chain', async () => {
            const {bindPeersOfCore} = require('./helpers/testProxyConfig')
            for (i in bindPeersOfCore) {
                if (bindPeersOfCore[i].expect.length != 0) {
                    await expect(coreProxy.connect(bindPeersOfCore[i].caller).bindPeerChain(
                            bindPeersOfCore[i].chainId, 
                            bindPeersOfCore[i].prover, 
                            bindPeersOfCore[i].proxy)).
                            to.be.revertedWith(bindPeersOfCore[i].expect)
                } else {
                    await coreProxy.connect(bindPeersOfCore[i].caller).bindPeerChain(
                            bindPeersOfCore[i].chainId, 
                            bindPeersOfCore[i].prover, 
                            bindPeersOfCore[i].proxy)
                }
            }
        })

        it('edge burn, core mint', async () => {
            const {burnOfEdge} = require('./helpers/testProxyConfig')
            for (i in burnOfEdge) {
                if (burnOfEdge[i].expect.length != 0) {
                    await expect(edgeProxy.connect(burnOfEdge[i].caller).burnTo(
                            burnOfEdge[i].chainId, 
                            burnOfEdge[i].groupId, 
                            burnOfEdge[i].receiver,
                            burnOfEdge[i].tokenId)).
                            to.be.revertedWith(burnOfEdge[i].expect)
                } else {
                    await edgeProxy.connect(burnOfEdge[i].caller).burnTo(
                        burnOfEdge[i].chainId, 
                        burnOfEdge[i].groupId, 
                        burnOfEdge[i].receiver,
                        burnOfEdge[i].tokenId)
                }
            }
            
            let tx = await edgeProxy.connect(miner).burnTo(3, contractGroupId, user1.address, 51)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "CrossTokenBurned")
            // construct receipt proof
            let getProof = new GetProof("http://127.0.0.1:8545")
            let proof = await getProof.receiptProof(tx.hash)
            let rpcInstance = new rpc("http://127.0.0.1:8545")
            let block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            let re = Receipt.fromRpc(targetReceipt)
            let rlpLog = new LOGRLP(rc.logs[event.logIndex])
            let rlplog = Log.fromRpc(rlpLog)
            let value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            let blockHash = keccak256(proof.header.buffer)
            let schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            let buffer = borsh.serialize(schema, value);
            await expect(coreProxy.mint(buffer)).to.be.revertedWith('from chain is not permit')
            tx1 = await generalContractor.bindContractGroup(buffer1)
            rc1 = await tx1.wait()
            await expect(coreProxy.mint(buffer)).to.be.revertedWith('to chain is not permit')

            tx = await edgeProxy.connect(miner).burnTo(1, contractGroupId, user1.address, 52)
            rc = await tx.wait()
            event = rc.events.find(event=>event.event === "CrossTokenBurned")
            // construct receipt proof
            getProof = new GetProof("http://127.0.0.1:8545")
            proof = await getProof.receiptProof(tx.hash)
            rpcInstance = new rpc("http://127.0.0.1:8545")
            block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
            targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
            
            // wrong contract address
            let contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = AddressZero
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].address = AddressZero
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('proxy of peer is not bound')
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            
            // wrong group id
            let groupId = targetReceipt.logs[event.logIndex].topics[1]
            targetReceipt.logs[event.logIndex].topics[1] = 100
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].topics[1] = 100
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('from chain is not permit')
            targetReceipt.logs[event.logIndex].topics[1] = groupId
            rc.logs[event.logIndex].topics[1] = groupId

            // wrong from chainId
            let chainId = targetReceipt.logs[event.logIndex].topics[2]
            targetReceipt.logs[event.logIndex].topics[2] = 100
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].topics[2] = 100
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('peer is not bound')
            targetReceipt.logs[event.logIndex].topics[2]= chainId
            rc.logs[event.logIndex].topics[2] = chainId

            // wrong to chainId
            chainId = targetReceipt.logs[event.logIndex].topics[3]
            targetReceipt.logs[event.logIndex].topics[3] = 100
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].topics[3] = 100
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('to chain is not permit')
            targetReceipt.logs[event.logIndex].topics[3]= chainId
            rc.logs[event.logIndex].topics[3] = chainId

            // wrong asset
            let byteValue = targetReceipt.logs[event.logIndex].data
            let newValue = (targetReceipt.logs[event.logIndex].data).substr(0,30) + '3'+ (targetReceipt.logs[event.logIndex].data).substr(31)
            targetReceipt.logs[event.logIndex].data = newValue
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].data = newValue
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('from chain is not permit')
            targetReceipt.logs[event.logIndex].data = byteValue
            rc.logs[event.logIndex].data  = byteValue

            // wrong proxy
            byteValue = targetReceipt.logs[event.logIndex].data
            newValue = (targetReceipt.logs[event.logIndex].data).substr(0,129) + '1'+ (targetReceipt.logs[event.logIndex].data).substr(130)
            targetReceipt.logs[event.logIndex].data = newValue
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].data = newValue
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('receipt must from edge')
            targetReceipt.logs[event.logIndex].data = byteValue
            rc.logs[event.logIndex].data  = byteValue

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
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('invalid signatrue')
            targetReceipt.logs[event.logIndex].topics[0] = signature
            rc.logs[event.logIndex].topics[0]  = signature
            
            //fail to mint
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await proxyRegistry.set(user.address)
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('fail to mint')
            await proxyRegistry.set(coreProxy.address)

            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[2])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(2, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('wrong number of topics')
            
            // success
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value)
            await ethLikeProver.set(false)
            await expect(coreProxy.mint(buffer)).to.be.revertedWith('proof is invalid')
            await ethLikeProver.set(true)
            tx = await coreProxy.mint(buffer)
            tx = await expect(coreProxy.mint(buffer)).to.be.revertedWith('The burn event proof cannot be reused')
        })

        it('core proxy bind asset group', async () => {
            const {bindAssetOfCore} = require('./helpers/testProxyConfig')
            await expect(coreProxy1.connect(user).bindAssetProxyGroup(coreProxy1.address, 1, 1, coreProxy1.address)).
            to.be.revertedWith('only for general contractor')
            for (i in bindAssetOfCore) {
                if (bindAssetOfCore[i].expect.length != 0) {
                    await expect(testProxy1.connect(bindAssetOfCore[i].caller).bindAssetProxyGroup(
                            bindAssetOfCore[i].asset, 
                            bindAssetOfCore[i].chainId, 
                            bindAssetOfCore[i].groupId,
                            bindAssetOfCore[i].template)).
                            to.be.revertedWith(bindAssetOfCore[i].expect)
                } else {
                    await testProxy1.connect(bindAssetOfCore[i].caller).bindAssetProxyGroup(
                        bindAssetOfCore[i].asset, 
                        bindAssetOfCore[i].chainId, 
                        bindAssetOfCore[i].groupId,
                        bindAssetOfCore[i].template)
                }
            }
        })

        it('edge proxy bind asset group', async () => {
            const {bindAssetOfEdge} = require('./helpers/testProxyConfig')            
            await edgeProxy1.initialize(ethLikeProver.address, testProxy1.address, coreProxy.address, 1, 2, admin.address, limit.address)
            await expect(edgeProxy1.connect(user).bindAssetGroup(edgeProxy1.address, 1, edgeProxy1.address)).
            to.be.revertedWith('just subcontractor can bind')

            for (i in bindAssetOfEdge) {
                if (bindAssetOfEdge[i].expect.length != 0) {
                    await expect(testProxy2.connect(bindAssetOfEdge[i].caller).bindAssetGroup(
                            bindAssetOfEdge[i].asset, 
                            bindAssetOfEdge[i].groupId,
                            bindAssetOfEdge[i].template)).
                            to.be.revertedWith(bindAssetOfEdge[i].expect)
                } else {
                    await testProxy2.connect(bindAssetOfEdge[i].caller).bindAssetGroup(
                        bindAssetOfEdge[i].asset, 
                        bindAssetOfEdge[i].groupId,
                        bindAssetOfEdge[i].template)
                }
            }
        })

        it('core burn, edge mint', async () => {
            tx1 = await generalContractor.bindContractGroup(buffer1)
            rc1 = await tx1.wait()
            const {burnOfCore} = require('./helpers/testProxyConfig')
            for (i in burnOfCore) {
                if (burnOfCore[i].expect.length != 0) {
                    await expect(edgeProxy.connect(burnOfCore[i].caller).burnTo(
                            burnOfCore[i].chainId, 
                            burnOfCore[i].groupId, 
                            burnOfCore[i].receiver,
                            burnOfCore[i].tokenId)).
                            to.be.revertedWith(burnOfCore[i].expect)
                } else {
                    await edgeProxy.connect(burnOfCore[i].caller).burnTo(
                        burnOfCore[i].chainId, 
                        burnOfCore[i].groupId, 
                        burnOfCore[i].receiver,
                        burnOfCore[i].tokenId)
                }
            }

            let tx = await coreProxy.connect(miner).burnTo(2, contractGroupId, user1.address, 50)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "CrossTokenBurned")
            // construct receipt proof
            let getProof = new GetProof("http://127.0.0.1:8545")
            let proof = await getProof.receiptProof(tx.hash)
            let rpcInstance = new rpc("http://127.0.0.1:8545")
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
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].address = AddressZero
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('proxy of peer is not bound')
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress

            contractAddress = targetReceipt.logs[event.logIndex].address
            targetReceipt.logs[event.logIndex].address = user.address
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].address = user.address
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('proxy of peer is not bound')
            targetReceipt.logs[event.logIndex].address = contractAddress
            rc.logs[event.logIndex].address = contractAddress
            
            // wrong group id
            let groupId = targetReceipt.logs[event.logIndex].topics[1]
            targetReceipt.logs[event.logIndex].topics[1] = 100
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].topics[1] = 100
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('chain is not permit')
            targetReceipt.logs[event.logIndex].topics[1] = groupId
            rc.logs[event.logIndex].topics[1] = groupId

            // wrong from chainId
            let chainId = targetReceipt.logs[event.logIndex].topics[2]
            targetReceipt.logs[event.logIndex].topics[2] = 100
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].topics[2] = 100
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('peer is not bound')
            targetReceipt.logs[event.logIndex].topics[2]= chainId
            rc.logs[event.logIndex].topics[2] = chainId

            // wrong to chainId
            chainId = targetReceipt.logs[event.logIndex].topics[3]
            targetReceipt.logs[event.logIndex].topics[3] = 100
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].topics[3] = 100
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('not to mine')
            targetReceipt.logs[event.logIndex].topics[3]= chainId
            rc.logs[event.logIndex].topics[3] = chainId

            // wrong asset
            let byteValue = targetReceipt.logs[event.logIndex].data
            let newValue = (targetReceipt.logs[event.logIndex].data).substr(0,30) + '3'+ (targetReceipt.logs[event.logIndex].data).substr(31)
            targetReceipt.logs[event.logIndex].data = newValue
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].data = newValue
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('chain is not permit')
            targetReceipt.logs[event.logIndex].data = byteValue
            rc.logs[event.logIndex].data  = byteValue

            // wrong proxy
            byteValue = targetReceipt.logs[event.logIndex].data
            newValue = (targetReceipt.logs[event.logIndex].data).substr(0,129) + '0'+ (targetReceipt.logs[event.logIndex].data).substr(130)
            targetReceipt.logs[event.logIndex].data = newValue
            re = Receipt.fromRpc(targetReceipt)
            rc.logs[event.logIndex].data = newValue
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('receipt must from core')
            targetReceipt.logs[event.logIndex].data = byteValue
            rc.logs[event.logIndex].data  = byteValue

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
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('invalid signatrue')
            targetReceipt.logs[event.logIndex].topics[0] = signature
            rc.logs[event.logIndex].topics[0]  = signature

            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[2])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(2, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('wrong number of topics')
            
            // fail to mint
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await proxyRegistry1.set(user.address)
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('fail to mint')
            await proxyRegistry1.set(edgeProxy.address)

            // success
            await ethLikeProver.set(false)
            await expect(edgeProxy.mint(buffer)).to.be.revertedWith('proof is invalid')
            await ethLikeProver.set(true)
            tx = await edgeProxy.mint(buffer)
            tx = await expect(edgeProxy.mint(buffer)).to.be.revertedWith('The burn event proof cannot be reused')
        })
    })
})

