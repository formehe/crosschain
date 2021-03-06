const chai = require("chai");
const expect = chai.expect;

var utils = require('ethers').utils;

const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
const borsh = require("borsh")

const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const buffer = require('safe-buffer').Buffer;

const toWei = (val) => ethers.utils.parseEther('' + val)
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')


describe("Limit", function () {

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

        zeroAccount = "0x0000000000000000000000000000000000000000"

        //deploy ERC20
        limitCon = await ethers.getContractFactory("Limit", admin)
        limitContract = await limitCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await limitContract.deployed()
        console.log("+++++++++++++Limit+++++++++++++++ ", limitContract.address)
    })

    it('bind transfered only for owner', async () => {
        let msg = 'AccessControl: account ' + user.address.toLowerCase() + ' is missing role 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6'
        await expect(limitContract.connect(user).bindTransferedQuota(user.address, 100, 50))
            .to.be.revertedWith(msg)
    })

    it('bind transfered quota fail because of min is bigger than max', async () => {
        await expect(limitContract.connect(admin).bindTransferedQuota(user.address, 100, 50))
            .to.be.revertedWith('is less than the min')
    }) 

    it('bind transfered success', async () => {
        await limitContract.connect(admin).bindTransferedQuota(user.address, 50, 51)
    })

    it('checkTransferedQuota, asset is not bound', async () => {
        await limitContract.connect(admin).bindTransferedQuota(owner.address, 50, 51)
        let value = await limitContract.checkTransferedQuota(user.address, 50)
        expect(value).to.equal(false);
    
    })

    it('checkTransferedQuota, amount is not allowed', async () => {
        await limitContract.connect(admin).bindTransferedQuota(owner.address, 50, 60)
        let value = await limitContract.checkTransferedQuota(owner.address, 50)
        expect(value).to.equal(false);
    })

    it('black tx list only for owner', async () => {
        let msg = 'AccessControl: account ' + user.address.toLowerCase() + ' is missing role 0x3ae7ceea3d592ba264a526759c108b4d8d582ba37810bbb888fcee6f32bbf04d'
        await expect(limitContract.connect(user).forbiden("0x1111111111111111111111111111111111111111111111111111111111111111"))
            .to.be.revertedWith(msg)
    })

    it('black tx list, tx has been forbidden', async () => {
        await limitContract.connect(admin).forbiden("0x1111111111111111111111111111111111111111111111111111111111111111")
        await expect(limitContract.connect(admin).forbiden("0x1111111111111111111111111111111111111111111111111111111111111111"))
            .to.be.revertedWith('id has been already forbidden')
    })

    it('black tx list, forbid tx success', async () => {
        await limitContract.connect(admin).forbiden("0x1111111111111111111111111111111111111111111111111111111111111111")
        await limitContract.connect(admin).forbiden("0x1111111111111111111111111111111111111111111111111111111111111112")
    })

    it('black tx list, recover tx is not exist', async () => {
        await expect(limitContract.connect(admin).recover("0x1111111111111111111111111111111111111111111111111111111111111112"))
            .to.be.revertedWith('id has not been forbidden')
    })

    it('black tx list, recover tx success', async () => {
        await limitContract.connect(admin).forbiden("0x1111111111111111111111111111111111111111111111111111111111111111")
        await limitContract.connect(admin).recover("0x1111111111111111111111111111111111111111111111111111111111111111")
    })
})