const chai = require("chai");
const expect = chai.expect;

var utils = require('ethers').utils;

const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
const borsh = require("borsh")

const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const buffer = require('safe-buffer').Buffer;
const rpc = require('isomorphic-rpc')

const { GetAndVerify, GetProof, VerifyProof } = require('eth-proof')
const toWei = (val) => ethers.utils.parseEther('' + val)
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')
const { Account, Header, Log, Proof, Receipt, Transaction } = require("eth-object")
console.log(process.argv)
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
        // console.log(proof.buffer)
        // console.log("______________________________")
        for (const node of proof) {
            var tmp = new Uint8Array(1 + node[1].length);
            tmp[0] = 2;
            var i = 1;
            for (var i = 0; i < node[1].length; i++) {
                tmp[i + 1] = node[1][i];
            }
            this.proof.push(rlp.encode([node[0], tmp]))
        }
        // console.log("______________________________")
        // console.log(keccak256(this.proof[0]))
    }
}

// describe("Delegated", function () {

//     beforeEach(async function () {
//         //准备必要账户
//         [deployer, admin, miner, user, user1, redeemaccount] = await hre.ethers.getSigners()
//         owner = deployer
//         console.log("deployer account:", deployer.address)
//         console.log("owner account:", owner.address)
//         console.log("admin account:", admin.address)
//         console.log("team account:", miner.address)
//         console.log("user account:", user.address)
//         console.log("redeemaccount account:", redeemaccount.address)
        
//         //deploy delegater
//         delegaterCon = await ethers.getContractFactory("Delegater", deployer)
//         delegater = await delegaterCon.deploy();
//         //utils = await UtilsCon.attach("0x8F4ec854Dd12F1fe79500a1f53D0cbB30f9b6134")
//         await delegater.deployed();
//         console.log("+++++++++++++delegaterCon+++++++++++++++ ", delegater.address)

//         //deploy delegated
//         delegatedCon = await ethers.getContractFactory("Delegated", deployer)
//         delegated = await delegatedCon.deploy();
//         //utils = await UtilsCon.attach("0x8F4ec854Dd12F1fe79500a1f53D0cbB30f9b6134")
//         await delegated.deployed();

//         console.log("+++++++++++++delegatedCon+++++++++++++++ ", delegated.address)
//     })

//     it('delegate', async () => {
//         delegater.connect(deployer).mint(delegated.address)
//     })
// })

describe("AssetLockManagerContract", function () {

    beforeEach(async function () {
        //准备必要账户
        [deployer, admin, miner, user, user1, redeemaccount] = await hre.ethers.getSigners()
        owner = deployer
        console.log("deployer account:", deployer.address)
        console.log("owner account:", owner.address)
        console.log("admin account:", admin.address)
        console.log("team account:", miner.address)
        console.log("user account:", user.address)
        console.log("redeemaccount account:", redeemaccount.address)
        
        // // //deploy library
        // UtilsCon = await ethers.getContractFactory("Utils", deployer)
        // utils = await UtilsCon.deploy();
        // //utils = await UtilsCon.attach("0x8F4ec854Dd12F1fe79500a1f53D0cbB30f9b6134")
        // await utils.deployed();

        // console.log("+++++++++++++Utils+++++++++++++++ ", utils.address)

        //deploy ERC20
        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", deployer)
        erc20Sample = await erc20SampleCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await erc20Sample.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

        //deploy prove
		address = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"
        topProveContractCon = await ethers.getContractFactory("TopProve", deployer)

        topProveContract = await topProveContractCon.deploy(address)
        console.log("+++++++++++++TopProve+++++++++++++++ ", topProveContract.address)
        
        //deploy contract
        lockContractCon = await ethers.getContractFactory("ERC20MintProxy", deployer)
        // lockContractCon = await ethers.getContractFactory("ERC20Locker", {
        //     libraries: {
        //       Utils: utils.address,
        //     }
        // }, deployer)
        lockContract = await lockContractCon.deploy()
        //lockContract = await lockContractCon.attach("0xeF31027350Be2c7439C1b0BE022d49421488b72C")
        console.log("+++++++++++++LockContract+++++++++++++++ ", lockContract.address)
        // await staking.switchOnContract(true)

        //deploy contract1
        lockContractCon1 = await ethers.getContractFactory("ERC20MintProxy", deployer)
        lockContract1 = await lockContractCon1.deploy()
        
        lockContract.initialize(topProveContract.address, lockContract1.address, 1000, admin.address, 0)
        lockContract1.initialize(topProveContract.address, lockContract.address, 1000, admin.address, 0)
        console.log("+++++++++++++LockContract1+++++++++++++++ ", lockContract1.address)

        // //deploy Ed25519
        // ed25519Con = await ethers.getContractFactory("Ed25519", deployer)
        // ed25519 = await ed25519Con.deploy()
        // await ed25519.deployed()
        // console.log("+++++++++++++ed25519+++++++++++++++ ", lockContract.address)
    })

    it('bind hashasset must be admin', async () => {
        await lockContract.bindAssetHash(erc20Sample.address, address)
    })

    it('bind success uses admin', async () => {
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, address)
    })

    it('amount cannot be zero', async () => {
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, address)
        await lockContract.burn(erc20Sample.address, 0, address)
    })

    // it('amount must be less than ((1 << 128) -1)', async () => {
    //     // amount cannot be zero
    //     await lockContract.lockToken(erc20Sample.address, 0, (1<<128 + 1), address)

    //     console.log(".....")
    // })

    it('erc20 contract must be binded', async () => {
        // amount cannot be zero
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, address)
        await lockContract.burn(erc20Sample.address, 1, address)
    })


    it('lock fail because of not allowance', async () => {
        // amount cannot be zero
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
        await lockContract.burn(erc20Sample.address, 1, address)
    })

    
    it('lock fail because of allowance is not enough', async () => {
        // amount cannot be zero
        // amount cannot be zero
        await erc20Sample.approve(lockContract.address, 1000)
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, address)
        await lockContract.burn(erc20Sample.address, 2000, address)
    })

    it('lock success', async () => {
        // amount cannot be zero
        await erc20Sample.approve(lockContract.address, 1000)
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, user.address)
        try {
            const tx = await lockContract.burn(erc20Sample.address, 1, user.address)
            // console.log(tx)
            const rc = await tx.wait()
            const event = rc.events.find(event=>event.event === "Locked")
            // const latestBlock = await hre.ethers.provider.getBlock("latest")
            // console.log(latestBlock)
            const latestBlock = await hre.ethers.provider.getBlock(1)

            //await lockContract.parseLog(rc.logs[event.logIndex])
        } catch (error) {
            console.log(error)
        }
    })
})


// describe("Native token to ERC20", function () {

//     beforeEach(async function () {

//         //准备必要账户
//         [deployer, admin, miner, user, user1, redeemaccount] = await hre.ethers.getSigners()
//         owner = deployer
//         console.log("deployer account:", deployer.address)
//         console.log("owner account:", owner.address)
//         console.log("admin account:", admin.address)
//         console.log("team account:", miner.address)
//         console.log("user account:", user.address)
//         console.log("redeemaccount account:", redeemaccount.address)
        
//         //deploy library
//         UtilsCon = await ethers.getContractFactory("Utils", deployer)
//         utils = await UtilsCon.deploy();
//         //utils = await UtilsCon.attach("0x8F4ec854Dd12F1fe79500a1f53D0cbB30f9b6134")
//         await utils.deployed();

//         console.log("+++++++++++++Utils+++++++++++++++", utils.address)
        
//         //deploy ERC20
//         erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", deployer)
//         erc20Sample = await erc20SampleCon.deploy()
//         //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
//         await erc20Sample.deployed()

//         console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

//         //deploy prove
// 		address = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"
//         topProveContractCon = await ethers.getContractFactory("TopProve", deployer)

//         topProveContract = await topProveContractCon.deploy(address)
//         console.log("+++++++++++++TopProve+++++++++++++++ ", topProveContract.address)

//         // proveContractCon = await ethers.getContractFactory("TopProve", deployer)
//         // proveContract = await proveContractCon.deploy(deployer.address)

//         // console.log("+++++++++++++TopProve+++++++++++++++ ", proveContract.address)

//         //deploy contract
//         lockContractCon = await ethers.getContractFactory("NativeLocker", deployer)
//         // lockContractCon = await ethers.getContractFactory("ERC20Locker", {
//         //     libraries: {
//         //       Utils: utils.address,
//         //     }
//         // }, deployer)
//         lockContract = await lockContractCon.deploy(topProveContract.address, 1000, admin.address, 1, 0)
//         //lockContract = await lockContractCon.attach("0xeF31027350Be2c7439C1b0BE022d49421488b72C")
//         console.log("+++++++++++++LockContract+++++++++++++++ ", lockContract.address)
//         // await staking.switchOnContract(true)

//         lockContractCon1 = await ethers.getContractFactory("NativeLocker", deployer)
//         lockContract1 = await lockContractCon1.deploy(topProveContract.address, 1000, admin.address, 2, 0)
//         console.log("+++++++++++++LockContract1+++++++++++++++ ", lockContract1.address)

//         //deploy ERC20
//         ed25519Con = await ethers.getContractFactory("Ed25519", deployer)
//         ed25519 = await ed25519Con.deploy()
//         await ed25519.deployed()
//         console.log("+++++++++++++ed25519+++++++++++++++ ", lockContract.address)

//         InternalCon = await ethers.getContractFactory("Internal", deployer)
//         Internal = await InternalCon.deploy()

//         DependencyCon = await ethers.getContractFactory("Dependency", deployer)
//         Dependency = await DependencyCon.deploy()
//         console.log("+++++++++++++Dependency+++++++++++++++ ", Dependency.address)
//     })

//     it('bind hashasset must be admin', async () => {
//         await lockContract.bindAssetHash(erc20Sample.address, 1, address)
//     })

//     it('from and to asset address all be no zero', async () => {
//         await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
//     })

//     it('bind peer contract must be admin', async () => {
//         await lockContract.bindPeerContract(lockContract1.address)
//     })

//     it('bind peer contract uses admin', async () => {
//         // amount cannot be zero
//         await lockContract.connect(admin).bindPeerContract(lockContract1.address)
//     })

//     it('from or to asset address be zero', async () => {
//         await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, "0x0000000000000000000000000000000000000000")
//     })

//     it('amount cannot be zero', async () => {
//         // amount cannot be zero
//         await lockContract.lockToken(erc20Sample.address, 0, 0, address)
//     })

//     it('transfer native token to contract to unbinded token', async () => {
//         await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, "0x0000000000000000000000000000000000000000")
//         await lockContract.connect(admin).bindPeerContract(lockContract1.address)
//         balance = await hre.ethers.provider.getBalance(user.address)
//         await lockContract.connect(user).lockToken("0x0000000000000000000000000000000000000000", 1, 1000000000, user.address, {value: ethers.utils.parseUnits ("1", "gwei")})
//         balance = await hre.ethers.provider.getBalance(user.address)
//         console.log(balance)
//     })

//     it('transfer native token to contract', async () => {
//         await lockContract.connect(admin).bindAssetHash("0x0000000000000000000000000000000000000000", 2, erc20Sample.address);
//         await lockContract.connect(admin).bindPeerContract(lockContract1.address)
//         await lockContract1.connect(admin).bindAssetHash(erc20Sample.address, 1, "0x0000000000000000000000000000000000000000");
//         await lockContract1.connect(admin).bindPeerContract(lockContract.address)
//         // amount cannot be zero
//         const tx1 = await lockContract.connect(user).lockToken("0x0000000000000000000000000000000000000000", 2, 1000000000, user.address, {value: ethers.utils.parseUnits ("1", "gwei")})
//         const rc = await tx1.wait()
//         // console.log(rc)
//         getProof = new GetProof("http://127.0.0.1:8545")
//         proof = await getProof.receiptProof(tx1.hash)
//         // console.log("========================================================")
//         rpcInstance = new rpc("http://127.0.0.1:8545")
//         const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
//         // console.log(block)
//         let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx1.hash)
//         // console.log(targetReceipt)
//         const re = Receipt.fromRpc(targetReceipt)
//         const rlpLog = new LOGRLP(rc.logs[0])
//         const rlplog = Log.fromRpc(rlpLog)
//         const value = new TxProof(rc.logs[0].logIndex, rlplog.buffer, rc.logs[0].transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
//         // console.log(value)
//         const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
//         const buffer = borsh.serialize(schema, value);
//         const c = rlp.encode(["0x2080","0x02f902080182778ab90100000000000000020000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000200000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000020000004000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000004000000000000000000000000000a0000000000000000000000010000000000000000000000000000000000000000048f8fff8fd941fa02b2d6a771842690194cf62d91bdd92bfe28df884a01857a936c31a8489624aa934cc1a9095a3cfdbad40945dbfcacd94c701e284b0a00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000922d6956c99e12dfeb3224dea977d0939758a1fea000000000000000000000000090f79bf6eb2c4f870365e785982e1f101e93b906b8600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000090f79bf6eb2c4f870365e785982e1f101e93b906"])
//         // console.log(keccak256(c))

//         // console.log("+++++++++++++++++++++++++++++++++++++++++++++")
//         await erc20Sample.connect(deployer).transfer(lockContract1.address, 2000000000)
//         await erc20Sample.approve(lockContract1.address, 1000000000)
//         await lockContract1.connect(user).unlockToken(buffer, 1)
//         // console.log("========================================================")

//         await Internal.testStruct()
//         await Internal.testBytes()
//         await Internal.testMemoryTransfer()
//         const tx = await Internal.testContractCall(Dependency.address)
//         // console.log(tx)
//         const rc1 = await tx.wait()
//         console.log(rc1)
//         const event = rc1.events.find(event=>event.event === "xxx")
//         console.log(event)
//     })
// })