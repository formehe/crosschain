const chai = require("chai");
const expect = chai.expect;
const Web3 = require('web3');

var utils = require('ethers').utils;
const { AddressZero } = require("ethers").constants
const { BigNumber } = require('ethers')

const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
const borsh = require("borsh")

const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const buffer = require('safe-buffer').Buffer;

const toWei = (val) => ethers.utils.parseEther('' + val)
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')

describe("Proxy", function () {
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
        timelockcontrollerCon = await ethers.getContractFactory("TimeController", deployer)
        timelockcontroller = await timelockcontrollerCon.deploy(1)
        await timelockcontroller.deployed()
        console.log("+++++++++++++timelockcontroller+++++++++++++++ ", timelockcontroller.address)

        //deploy TVotes
        votesCon = await ethers.getContractFactory("ImmutableVotes", deployer)
        votes = await votesCon.deploy([user.address, user1.address, user2.address, user3.address])
        await votes.deployed()
        console.log("+++++++++++++ImmutableVotes+++++++++++++++ ", votes.address)

        //deploy TDao
        tdaoCon = await ethers.getContractFactory("TDao", deployer)
        await expect(tdaoCon.deploy(votes.address, 0, 3, 70, timelockcontroller.address, admin.address, 1,5,1,7)).to.be.revertedWith("vote delay")
        await expect(tdaoCon.deploy(votes.address, 1, 0, 70, timelockcontroller.address, admin.address, 1,5,1,7)).to.be.revertedWith("voting period ")
        await expect(tdaoCon.deploy(votes.address, 1, 3, 120, timelockcontroller.address, admin.address, 1,5,1,7)).to.be.revertedWith("quorumNumerator over quorumDenominator")
        tdao = await tdaoCon.deploy(votes.address, 2, 3, 70, timelockcontroller.address, admin.address, 1,5,1,7)
        await tdao.deployed()
        console.log("+++++++++++++TDao+++++++++++++++ ", tdao.address)

        await timelockcontroller._TimeController_initialize(tdao.address, 1, 100)
        
        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", user)
        erc20Sample = await erc20SampleCon.deploy()
        await erc20Sample.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

        transparentproxyCon = await ethers.getContractFactory("TransparentProxy", deployer)
        await expect(transparentproxyCon.deploy(admin.address, tdao.address, admin.address)).to.be.revertedWith("ERC1967: new implementation is not a contract")
        await expect(transparentproxyCon.deploy(erc20Sample.address, admin.address, admin.address)).to.be.revertedWith("invalid admin")
        await expect(transparentproxyCon.deploy(erc20Sample.address, tdao.address, AddressZero)).to.be.revertedWith("invalid owner")
        transparentproxy = await transparentproxyCon.deploy(erc20Sample.address, timelockcontroller.address, owner.address)
    })

    it('setAdminPause', async () => {
        await transparentproxy.connect(owner).setAdminPause(true)
        await expect(transparentproxy.connect(user).setAdminPause(true)).to.be.revertedWith("not owner")
        await expect(transparentproxy.connect(owner).setAdminPause(true)).to.be.revertedWith("pause is not modified")
    })

    it('setImplementPause', async () => {
        await transparentproxy.connect(owner).setImplementPause(true)
        await expect(transparentproxy.connect(user).setImplementPause(true)).to.be.revertedWith("not owner")
        await expect(transparentproxy.connect(owner).setImplementPause(true)).to.be.revertedWith("pause is not modified")
    })

    it('changeAdmin', async () => {
        let transferCalldata = transparentproxy.interface.encodeFunctionData('changeAdmin', [tdao.address])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
 
        await transparentproxy.connect(owner).setAdminPause(true)
        transferCalldata = transparentproxy.interface.encodeFunctionData('changeAdmin', [tdao.address])
        tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #2: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #2: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
        await transparentproxy.connect(owner).setAdminPause(true)

        transferCalldata = transparentproxy.interface.encodeFunctionData('changeAdmin', [user.address])
        tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #3: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #3: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")

        transferCalldata = transparentproxy.interface.encodeFunctionData('changeAdmin', [AddressZero])
        tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #4: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #4: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
    })

    it('upgradeTo', async () => {
        let transferCalldata = transparentproxy.interface.encodeFunctionData('upgradeTo', [erc20Sample.address])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
 
        await transparentproxy.connect(owner).setImplementPause(true)
        transferCalldata = transparentproxy.interface.encodeFunctionData('upgradeTo', [erc20Sample.address])
        tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #2: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #2: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
        await transparentproxy.connect(owner).setImplementPause(true)

        transferCalldata = transparentproxy.interface.encodeFunctionData('upgradeTo', [user.address])
        tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #3: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #3: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")

        transferCalldata = transparentproxy.interface.encodeFunctionData('upgradeTo', [AddressZero])
        tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #4: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #4: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(user2).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
    })
})