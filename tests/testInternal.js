const chai = require("chai");
const expect = chai.expect;
const Web3 = require('web3');

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
console.log(process.argv)

describe("TDao", function () {
    // beforeEach(async function () {
    //     //准备必要账户
    //     [deployer, admin, miner, user, user1, ,user2, user3, redeemaccount] = await hre.ethers.getSigners()
    //     owner = deployer
    //     console.log("deployer account:", deployer.address)
    //     console.log("owner account:", owner.address)
    //     console.log("admin account:", admin.address)
    //     console.log("team account:", miner.address)
    //     console.log("user account:", user.address)
    //     console.log("user1 account:", user1.address)
    //     console.log("user2 account:", user2.address)
    //     console.log("user3 account:", user3.address)
    //     console.log("redeemaccount account:", redeemaccount.address)

    //     zeroAccount = "0x0000000000000000000000000000000000000000"

    //     //deploy Internal
    //     InternalCon = await ethers.getContractFactory("Internal", deployer)
    //     Internal = await InternalCon.deploy()
    //     await Internal.deployed()
    // })

    // it('Internal', async () => {
    //     // //deploy TRC20
    //     // const tx = await tdao.connect(user1).updateTimelock("0x0000000000000000000000000000000000000000")
    //     try {
    //         await Internal.testStorageCall(user.address)
    //     } catch (e) {
    //         console.log(e)
    //     }
    // })
})