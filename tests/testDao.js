const chai = require("chai");
const expect = chai.expect;
const Web3 = require('web3');

var utils = require('ethers').utils;
const { AddressZero } = require("ethers").constants

const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
const borsh = require("borsh")

const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const buffer = require('safe-buffer').Buffer;

const toWei = (val) => ethers.utils.parseEther('' + val)
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')

describe("TDao", function () {
    beforeEach(async function () {
        //准备必要账户
        [deployer, admin, miner, user, user1, ,user2, user3, redeemaccount] = await hre.ethers.getSigners()
        owner = deployer
        console.log("deployer account:", deployer.address)
        console.log("owner account:", owner.address)
        console.log("admin account:", admin.address)
        console.log("team account:", miner.address)
        console.log("user account:", user.address)
        console.log("user1 account:", user1.address)
        console.log("user2 account:", user2.address)
        console.log("user3 account:", user3.address)
        console.log("redeemaccount account:", redeemaccount.address)

        //deploy time lock controller
        timelockcontrollerCon = await ethers.getContractFactory("TimelockController", deployer)
        timelockcontroller = await timelockcontrollerCon.deploy(1,[],[])
        await timelockcontroller.deployed()
        console.log("+++++++++++++timelockcontroller+++++++++++++++ ", timelockcontroller.address)

        //deploy TVotes
        votesCon = await ethers.getContractFactory("ImmutableVotes", deployer)
        votes = await votesCon.deploy([user.address, user1.address, user2.address, user3.address])
        await votes.deployed()
        console.log("+++++++++++++ImmutableVotes+++++++++++++++ ", votes.address)

        //deploy TDao
        tdaoCon = await ethers.getContractFactory("TDao", deployer)
        tdao = await tdaoCon.deploy(votes.address, 2, 3, 70, timelockcontroller.address, admin.address)
        await tdao.deployed()
        await tdao.initialize()
        console.log("+++++++++++++TDao+++++++++++++++ ", tdao.address)

        await timelockcontroller.connect(deployer).grantRole("0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1", tdao.address)
        await timelockcontroller.connect(deployer).grantRole("0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63", tdao.address)

        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", user)
        erc20Sample = await erc20SampleCon.deploy()
        await erc20Sample.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)
    })

    it('TDao OK', async () => {
        try {
            const transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            const tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await expect(tdao.connect(user2).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
        } catch (e) {
            console.log(e)
        }
    })

    it('config', async () => {
        try {
            let transferCalldata = tdao.interface.encodeFunctionData('setProposalThreshold', [1])
            let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())

            transferCalldata = tdao.interface.encodeFunctionData('setProposalThreshold', [2])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")

            transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            // tx = await tdao.connect(admin).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await expect(tdao.connect(admin)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("GovernorCompatibilityBravo: proposer votes below proposal threshold")
        } catch (e) {
            console.log(e)
        }
    })

    it('Proposal', async () => {
        try {
            const transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            const tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("Governor: proposal already exists")
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([], [0], [transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("Governor: invalid proposal length")
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [], [transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("Governor: invalid proposal length")
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [], "Proposal #1: Give grant to team")).
            to.be.revertedWith("Governor: invalid proposal length")
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([], [], [], "Proposal #1: Give grant to team")).
            to.be.revertedWith("Governor: empty proposal")
        } catch (e) {
            console.log(e)
        }
    })

    it('vote', async () => {
        try {
            const transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            const tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("GovernorCompatibilityBravo: vote already cast")
            await expect(tdao.connect(user2).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
            await expect(tdao.connect(user3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
            await expect(tdao.connect(user)["queue(uint256)"](tx.toBigInt())).to.be.revertedWith("Governor: proposal not successful")
            await expect(tdao.connect(user).castVote(1, 1)).to.be.revertedWith("Governor: unknown proposal id")
        } catch (e) {
            console.log(e)
        }
    })

    it('queue', async () => {
        try {
            const transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            const tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await expect(tdao.connect(user)["queue(uint256)"](tx.toBigInt())).to.be.revertedWith("Governor: proposal not successful")
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        } catch (e) {
            console.log(e)
        }
    })

    it('cancel', async () => {
        try {
            let transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await tdao.connect(user).cancel(tx.toBigInt())
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("Governor: proposal already exists")
            await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")


            transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 1])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user).cancel(tx.toBigInt())

            transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 2])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await tdao.connect(user).cancel(tx.toBigInt())

            transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 3])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
            await expect(tdao.connect(user).cancel(tx.toBigInt())).to.be.revertedWith("Governor: proposal not active")
        } catch (e) {
            console.log(e)
        }
    })
    
    it('execute', async () => {
        try {
            const transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            const tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await expect(tdao.connect(user)["queue(uint256)"](tx.toBigInt())).to.be.revertedWith("Governor: proposal not successful")
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
        } catch (e) {
            console.log(e)
        }
    })
})