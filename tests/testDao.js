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

        await expect(timelockcontroller.connect(deployer).grantRole("0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1", tdao.address))
        .to.be.revertedWith("is missing role")
        await expect(timelockcontroller.connect(deployer).grantRole("0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63", tdao.address))
        .to.be.revertedWith("is missing role")

        await timelockcontroller._TimeController_initialize(tdao.address, 1, 100)
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

            transferCalldata = tdao.interface.encodeFunctionData('setProposalThreshold', [0])
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

            transferCalldata = tdao.interface.encodeFunctionData('updateQuorumNumerator', [80])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));

            transferCalldata = tdao.interface.encodeFunctionData('updateQuorumNumerator', [120])
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

            transferCalldata = tdao.interface.encodeFunctionData('updateQuorumNumerator', [0])
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

            transferCalldata = tdao.interface.encodeFunctionData('setVotingDelay', [0])
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

            transferCalldata = tdao.interface.encodeFunctionData('setVotingDelay', [1])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())

            transferCalldata = tdao.interface.encodeFunctionData('setVotingDelay', [2])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())

            transferCalldata = tdao.interface.encodeFunctionData('setVotingPeriod', [0])
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

            transferCalldata = tdao.interface.encodeFunctionData('setVotingPeriod', [3])
            tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([tdao.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(timelockcontroller.address, 10000000)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote(tx.toBigInt(), 1)
            await tdao.connect(user1).castVote(tx.toBigInt(), 1)
            await tdao.connect(user2).castVote(tx.toBigInt(), 1)
            await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
            await new Promise(r => setTimeout(r, 1000));
            await tdao.connect(user)["execute(uint256)"](tx.toBigInt())

            transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            await expect(tdao.connect(admin)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address], [0], [transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("GovernorCompatibilityBravo: proposer votes below proposal threshold")
        } catch (e) {
            console.log(e)
        }
    })

    it('immutable vote', async () => {
        await expect(votesCon.deploy([user.address, user1.address])).to.be.revertedWith("number of voters must more than 3")
        await expect(votesCon.deploy([user.address, user1.address, user.address])).to.be.revertedWith("voter can not be repeated")
        await expect(votesCon.deploy([user.address, user1.address, AddressZero])).to.be.revertedWith("invalid voter")
        await expect(votes.getPastTotalSupply(BigNumber.from(1).shl(129))).to.be.revertedWith("Transaction reverted without a reason string")
        await expect(votes.getPastVotes(user.address, BigNumber.from(1).shl(129))).to.be.revertedWith("Transaction reverted without a reason string")
        await expect(votes.delegates(user.address)).to.be.revertedWith("Transaction reverted without a reason string")
        await expect(votes.delegate(user.address)).to.be.revertedWith("Transaction reverted without a reason string")
        // await expect(votes.delegateBySig(user.address)).to.be.revertedWith("Transaction reverted without a reason string")
    })

    it('time controller', async () => {
        timelockcontrollerCon1 = await ethers.getContractFactory("TimeControllerTest", deployer)
        timelockcontract = await timelockcontrollerCon1.deploy(1)
        await timelockcontract.deployed()
        await expect(timelockcontract._TimeController_initialize(deployer.address, 1, 100)).to.be.revertedWith("invalid address")
        await expect(timelockcontract._TimeController_initialize(timelockcontract.address, 0, 100)).to.be.revertedWith("invalid the lower of delay")
        await expect(timelockcontract._TimeController_initialize(timelockcontract.address, 1, 0)).to.be.revertedWith("the uppder of delay must larger than the lower")
        await timelockcontract._TimeControllerTest_initialize(deployer.address, 1, 100)
        await expect(timelockcontract.updateDelay(2)).to.be.revertedWith("TimelockController: caller must be timelock")

        let transferCalldata = timelockcontract.interface.encodeFunctionData('updateDelay', [101])
        await timelockcontract.scheduleBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000006", 2)
        await new Promise(r => setTimeout(r, 2100))
        await expect(timelockcontract.executeBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000006"))
        .to.be.revertedWith("TimelockController: underlying transaction reverted")
        
        transferCalldata = timelockcontract.interface.encodeFunctionData('updateDelay', [1])
        await expect(timelockcontract.executeBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("TimelockController: operation is not ready")
        await expect(timelockcontract.connect(user).executeBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("is missing role")
        await expect(timelockcontract.executeBatch([], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("TimelockController: length mismatch")
        await expect(timelockcontract.executeBatch([], [], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("TimelockController: length mismatch")

        await expect(timelockcontract.scheduleBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002", 0)).
        to.be.revertedWith("TimelockController: insufficient delay")

        await timelockcontract.scheduleBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002", 2)
        await expect(timelockcontract.executeBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("TimelockController: operation is not ready")
        await expect(timelockcontract.executeBatch([timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address], [0,0,0,0,0,0,0,0,0,0,0], [transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("actions")
        await expect(timelockcontract.executeBatch([timelockcontract.address, AddressZero], [0, 0], [transferCalldata, transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("invalid contract")
        await expect(timelockcontract.executeBatch([timelockcontract.address, user.address], [0, 0], [transferCalldata, transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("invalid contract")
        await expect(timelockcontract.scheduleBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002", 1)).
        to.be.revertedWith("TimelockController: operation already scheduled")
        await expect(timelockcontract.scheduleBatch([timelockcontract.address,  AddressZero], [0,0], [transferCalldata,transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002", 1)).
        to.be.revertedWith("invalid contract")
        await expect(timelockcontract.scheduleBatch([timelockcontract.address,  user.address], [0,0], [transferCalldata,transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002", 1)).
        to.be.revertedWith("invalid contract")
        await expect(timelockcontract.scheduleBatch([timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address, timelockcontract.address], [0,0,0,0,0,0,0,0,0,0,0], [transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata,transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002", 1)).
        to.be.revertedWith("actions")
        await new Promise(r => setTimeout(r, 1000))
        await timelockcontract.executeBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")
        const tx = await timelockcontract.hashOperationBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000002")
        await expect(timelockcontract.cancel(tx)).to.be.revertedWith("TimelockController: operation cannot be cancelled")
        await timelockcontract.scheduleBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000002", "0x0000000000000000000000000000000000000000000000000000000000000002", 1)
        await new Promise(r => setTimeout(r, 1000))
        await expect(timelockcontract.executeBatch([timelockcontract.address], [0], [transferCalldata], "0x0000000000000000000000000000000000000000000000000000000000000002", "0x0000000000000000000000000000000000000000000000000000000000000002")).
        to.be.revertedWith("TimelockController: missing dependency")
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
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address, AddressZero], [0,0], [transferCalldata, transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("invalid contract")
            await expect(tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address, erc20Sample.address], [0,0,0,0,0,0,0,0,0,0,0], 
                [transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata, transferCalldata], "Proposal #1: Give grant to team")).
            to.be.revertedWith("too many actions")
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
            await new Promise(r => setTimeout(r, 1000))
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