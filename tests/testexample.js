const chai = require("chai");
const expect = chai.expect;

var utils = require('ethers').utils;

const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const hre = require("hardhat");

const toWei = (val) => ethers.utils.parseEther('' + val)

console.log(process.argv)

describe("AssetLockManagerContract", function () {

    beforeEach(async function () {

        //准备必要账户
        [deployer, admin, miner, user, redeemaccount] = await hre.ethers.getSigners()
        owner = deployer
        console.log("deployer account:", deployer.address)
        console.log("owner account:", owner.address)
        console.log("admin account:", admin.address)
        console.log("team account:", miner.address)
        console.log("user account:", user.address)
        console.log("redeemaccount account:", redeemaccount.address)
        
        //deploy library
        UtilsCon = await ethers.getContractFactory("Utils", deployer)
        utils = await UtilsCon.deploy();
        //utils = await UtilsCon.attach("0x8F4ec854Dd12F1fe79500a1f53D0cbB30f9b6134")
        await utils.deployed();

        console.log("+++++++++++++Utils+++++++++++++++ ", utils.address)
        
        //deploy ERC20
        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", deployer)
        erc20Sample = await erc20SampleCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await erc20Sample.deployed()

        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

        //deploy contract
		address = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"
        lockContractCon = await ethers.getContractFactory("ERC20Locker", deployer)
        // lockContractCon = await ethers.getContractFactory("ERC20Locker", {
        //     libraries: {
        //       Utils: utils.address,
        //     }
        // }, deployer)
        lockContract = await lockContractCon.deploy(address, address, 1000, admin.address, 0)
        //lockContract = await lockContractCon.attach("0xeF31027350Be2c7439C1b0BE022d49421488b72C")
        console.log("+++++++++++++LockContract+++++++++++++++ ", lockContract.address)
        // await staking.switchOnContract(true)

        //deploy ERC20
        ed25519Con = await ethers.getContractFactory("Ed25519", deployer)
        ed25519 = await ed25519Con.deploy()
        await ed25519.deployed()
        console.log("+++++++++++++ed25519+++++++++++++++ ", lockContract.address)

    })

    it('bind hashasset must be admin', async () => {
        await lockContract.bindAssetHash(erc20Sample.address, 1, address)
    })

    it('bind success uses admin', async () => {
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
    })

    it('amount cannot be zero', async () => {
        // amount cannot be zero
        await lockContract.lockToken(erc20Sample.address, 0, 0, address)
    })

    // it('amount must be less than ((1 << 128) -1)', async () => {
    //     // amount cannot be zero
    //     await lockContract.lockToken(erc20Sample.address, 0, (1<<128 + 1), address)

    //     console.log(".....")
    // })

    it('erc20 contract must be binded', async () => {
        // amount cannot be zero
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
        await lockContract.lockToken(erc20Sample.address, 0, 1, address)
    })


    it('lock fail because of not allowance', async () => {
        // amount cannot be zero
        // amount cannot be zero
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
        await lockContract.lockToken(erc20Sample.address, 1, 1, address)
    })

    
    it('lock fail because of allowance is not enough', async () => {
        // amount cannot be zero
        // amount cannot be zero
        await erc20Sample.approve(lockContract.address, 1000)
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
        await lockContract.lockToken(erc20Sample.address, 1, 2000, address)
    })

    it('lock success', async () => {
        // amount cannot be zero
        await erc20Sample.approve(lockContract.address, 1000)
        await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, user.address)
        try {
            const tx = await lockContract.lockToken(erc20Sample.address, 1, 1, user.address)
            // console.log(tx)
            const rc = await tx.wait()
            const event = rc.events.find(event=>event.event === "Locked")
            // const latestBlock = await hre.ethers.provider.getBlock("latest")
            // console.log(latestBlock)

            const latestBlock = await hre.ethers.provider.getBlock(1)
            console.log(latestBlock)
            //await lockContract.parseLog(rc.logs[event.logIndex])
        } catch (error) {
            console.log(error)
        }        
    })
});