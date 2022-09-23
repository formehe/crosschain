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
        
        await coreProxy.initialize(generalContractor.address, 1, admin.address, multiLimit.address)
        await generalContractor.initialize(coreProxy.address, 1, admin.address)
    
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
    
        await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address)
        await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)
    
        issueInfo = {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "forme",
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

    describe('bindTemplate', () => {
        it('bind template', async () => {
            await expect(generalContractor.bindTemplate(0, AddressZero)).
                to.be.revertedWith('address is not contract')
            await generalContractor.bindTemplate(0, nfrFactory.address)
        })
    })

    describe('issue', () => {
        it('issue', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "forme",
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

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            await generalContractor.bindTemplate(0, nfrFactory.address)
            await expect(generalContractor.issue(1, bytesOfIssue)).
            to.be.revertedWith('template is not exist')
            await expect(generalContractor.issue(0, bytesOfIssue)).
            to.be.revertedWith('chain is not bound')
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)
            await generalContractor.issue(0, bytesOfIssue)
            bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            await expect(generalContractor.issue(0, bytesOfIssue)).
            to.be.revertedWith('must issue on main chain')
        })
    })

    describe('bindContractGroup', () => {
        it('bindContractGroup', async () => {
            await generalContractor.bindTemplate(0, nfrFactory.address)
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
            //========================================================================
            let tx = await generalContractor.issue(0, bytesOfIssue)
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

            await subContractor.bindTemplate(0, nfrFactory1.address)
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
            re = Receipt.fromRpc(targetReceipt)
            rlpLog = new LOGRLP(rc.logs[event.logIndex])
            rlplog = Log.fromRpc(rlpLog)
            value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
            blockHash = keccak256(proof.header.buffer)
            schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
            buffer = borsh.serialize(schema, value);
            await generalContractor.bindContractGroup(buffer)
            await expect(generalContractor.bindContractGroup(buffer)).
            to.be.revertedWith('fail to bind contract group')
        })
    })

    describe('expand', () => {
        it('expand', async () => {
            issueInfo1 = {
                name: "nfr",
                symbol: "nfr",
                issuer: {
                    name: "forme",
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
                    }
                ]
            }
            await generalContractor.bindTemplate(0, nfrFactory.address)
            await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

            let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
            //========================================================================
            let tx = await generalContractor.issue(0, bytesOfIssue)
            let rc = await tx.wait()
            let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
            console.log(event)

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

            await subContractor.bindTemplate(0, nfrFactory1.address)
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
            to.be.revertedWith('fail to bind contract group')

            erc20SampleInstance = await erc20TokenSampleCon.attach(templateAddr)
            await expect(erc20SampleInstance.connect(admin).burn(1)).to.be.revertedWith('ERC721: operator query for nonexistent token')
        })
    })
})

// describe('SubContractor', () => {
//     beforeEach(async () => {
//         [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
//         provider = hardhat.ethers.provider
//         console.log("wallet "+deployer.address)
//         console.log("wallet2 "+admin.address)
//         console.log("wallet3 "+miner.address)

//         issueCoderCon = await ethers.getContractFactory("testIssueCoder");
//         issueCoder = await issueCoderCon.deploy();
//         await issueCoder.deployed();
    
//         console.log("testIssueCoder "  + issueCoder.address)
    
//         limitCon = await ethers.getContractFactory("Limit");
//         limit = await limitCon.deploy(admin.address);
//         await limit.deployed();
//         console.log("Limit "  + limit.address)
    
//         multiLimitCon = await ethers.getContractFactory("MultiLimit");
//         multiLimit = await multiLimitCon.deploy(admin.address);
//         await multiLimit.deployed();
    
//         console.log("multiLimit "  + multiLimit.address)
    
//         coreProxyCon = await ethers.getContractFactory("CoreProxy");
//         coreProxy = await coreProxyCon.deploy();
//         await coreProxy.deployed();
    
//         console.log("coreProxy "  + coreProxy.address)
    
//         generalContractorCon = await ethers.getContractFactory("GeneralContractor");
//         generalContractor = await generalContractorCon.deploy();
//         await generalContractor.deployed();
    
//         console.log("generalContractor "  + generalContractor.address)
    
//         erc20TokenSampleCon = await ethers.getContractFactory("ERCTemplate");
//         erc20TokenSample = await erc20TokenSampleCon.deploy();
//         await erc20TokenSample.deployed();
    
//         console.log("erc20TokenSample "  + erc20TokenSample.address)
    
//         nfrFactoryCon = await ethers.getContractFactory("NFRFactory");
//         nfrFactory = await nfrFactoryCon.deploy(erc20TokenSample.address, generalContractor.address);
//         await nfrFactory.deployed();
    
//         console.log("nfrFactory "  + nfrFactory.address)
        
//         await coreProxy.initialize(generalContractor.address, 1, admin.address, multiLimit.address)
//         await generalContractor.initialize(coreProxy.address, 1, admin.address)
    
//         // sub general
//         headerSyncMockCon = await ethers.getContractFactory("HeaderSyncMock");
//         headerSyncMock = await headerSyncMockCon.deploy();
//         await headerSyncMock.deployed();
    
//         console.log("headerSyncMock "  + headerSyncMock.address)
    
//         ethLikeProverCon = await ethers.getContractFactory("EthLikeProver");
//         ethLikeProver = await ethLikeProverCon.deploy(headerSyncMock.address);
//         await ethLikeProver.deployed();
    
//         console.log("ethLikeProver "  + ethLikeProver.address)
    
//         subContractorCon = await ethers.getContractFactory("SubContractor");
//         subContractor = await subContractorCon.deploy();
//         await subContractor.deployed();
    
//         console.log("subContractor "  + subContractor.address)
    
//         edgeProxyCon = await ethers.getContractFactory("EdgeProxy");
//         edgeProxy = await edgeProxyCon.deploy();
//         await edgeProxy.deployed();
    
//         console.log("edgeProxy "  + edgeProxy.address)
    
//         nfrFactoryCon1 = await ethers.getContractFactory("NFRFactory");
//         nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample.address, subContractor.address);
//         await nfrFactory1.deployed();
    
//         console.log("nfrFactory "  + nfrFactory1.address)
    
//         await subContractor.initialize(generalContractor.address, 2, edgeProxy.address, ethLikeProver.address, admin.address)
//         await edgeProxy.initialize(ethLikeProver.address, subContractor.address, coreProxy.address, 1, 2, admin.address, limit.address)
    
//         issueInfo = {
//             name: "nfr",
//             symbol: "nfr",
//             issuer: {
//                 name: "forme",
//                 certification: "test certification",
//                 agreement: "test agreement",
//                 uri:"test uri"
//             },
//             rights: [
//                 {
//                     id:0, 
//                     right: {
//                         name: "right1",
//                         uri: "right uri",
//                         agreement: "right agreement"
//                     }
//                 },
//                 {
//                     id:1, 
//                     right: {
//                         name: "right2",
//                         uri: "right uri",
//                         agreement: "right agreement"
//                     },
//                 }
//             ],
//             issueOfChains:[
//                 {
//                     issuer: miner.address,
//                     chainId: 1,
//                     amountOfToken: 50,
//                     circulationOfRights: [
//                         {
//                             id:0,
//                             amount:50
//                         },
//                         {
//                             id:1,
//                             amount:50
//                         }
//                     ]
//                 },
//                 {
//                     issuer: miner.address,
//                     chainId: 2,
//                     amountOfToken: 50,
//                     circulationOfRights: [
//                         {
//                             id:0,
//                             amount:50
//                         },
//                         {
//                             id:1,
//                             amount:50
//                         }
//                     ]
//                 }
//             ]
//         }
//     })

//     describe('bindTemplate', () => {
//         it('bind template', async () => {
//             await expect(subContractor.bindTemplate(0, AddressZero)).
//             to.be.revertedWith('address is not contract')
//             await subContractor.bindTemplate(0, nfrFactory.address)
//         })
//     })

//     describe('subIssue', () => {
//         it('sub issue', async () => {
//             await generalContractor.bindTemplate(0, nfrFactory.address)
//             await generalContractor.bindSubContractor(2, subContractor.address, ethLikeProver.address)

//             let bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo)
//             //========================================================================
//             let tx = await generalContractor.issue(0, bytesOfIssue)
//             let rc = await tx.wait()
//             let event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
//             // construct receipt proof
//             getProof = new GetProof("http://127.0.0.1:8545")
//             proof = await getProof.receiptProof(tx.hash)
//             rpcInstance = new rpc("http://127.0.0.1:8545")
//             let block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
//             let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
//             let re = Receipt.fromRpc(targetReceipt)
//             let rlpLog = new LOGRLP(rc.logs[event.logIndex])
//             let rlplog = Log.fromRpc(rlpLog)
//             let value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
//             let blockHash = keccak256(proof.header.buffer)
//             let schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
//             let buffer = borsh.serialize(schema, value);
//             await expect(subContractor.subIssue(buffer)).
//             to.be.revertedWith('template is not exist')

//             await subContractor.bindTemplate(0, nfrFactory1.address)
//             await subContractor.subIssue(buffer)
//             await expect(subContractor.subIssue(buffer)).
//             to.be.revertedWith('proof is reused')

//             subContractorCon1 = await ethers.getContractFactory("SubContractor");
//             subContractor1 = await subContractorCon1.deploy();
//             await subContractor1.deployed();
//             await subContractor1.initialize(edgeProxy.address, 2, edgeProxy.address, ethLikeProver.address, admin.address)
//             await expect(subContractor1.subIssue(buffer)).
//             to.be.revertedWith('general contractor address is error')

//             issueInfo1= {
//                 name: "nfr",
//                 symbol: "nfr",
//                 issuer: {
//                     name: "forme",
//                     certification: "test certification",
//                     agreement: "test agreement",
//                     uri:"test uri"
//                 },
//                 rights: [
//                     {
//                         id:0, 
//                         right: {
//                             name: "right1",
//                             uri: "right uri",
//                             agreement: "right agreement"
//                         }
//                     },
//                     {
//                         id:1, 
//                         right: {
//                             name: "right2",
//                             uri: "right uri",
//                             agreement: "right agreement"
//                         },
//                     }
//                 ],
//                 issueOfChains:[
//                     {
//                         issuer: miner.address,
//                         chainId: 1,
//                         amountOfToken: 50,
//                         circulationOfRights: [
//                             {
//                                 id:0,
//                                 amount:50
//                             },
//                             {
//                                 id:1,
//                                 amount:50
//                             }
//                         ]
//                     }
//                 ]
//             }

//             bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfo1)
//             //========================================================================
//             tx = await generalContractor.issue(0, bytesOfIssue)
//             rc = await tx.wait()
//             event = rc.events.find(event=>event.event === "GeneralContractorIssue")
      
//             // construct receipt proof
//             getProof = new GetProof("http://127.0.0.1:8545")
//             proof = await getProof.receiptProof(tx.hash)
//             rpcInstance = new rpc("http://127.0.0.1:8545")
//             block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
//             targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
//             re = Receipt.fromRpc(targetReceipt)
//             rlpLog = new LOGRLP(rc.logs[event.logIndex])
//             rlplog = Log.fromRpc(rlpLog)
//             value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
//             blockHash = keccak256(proof.header.buffer)
//             schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
//             buffer = borsh.serialize(schema, value);
//             await expect(subContractor.subIssue(buffer)).
//             to.be.revertedWith('not issue on this chain')
//         })
//     })
// })