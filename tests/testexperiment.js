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

        zeroAccount = "0x0000000000000000000000000000000000000000"

        //deploy TVotes
        timelockcontrollerCon = await ethers.getContractFactory("TimelockController", deployer)
        timelockcontroller = await timelockcontrollerCon.deploy(4,[],[])
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await timelockcontroller.deployed()

        console.log("+++++++++++++timelockcontroller+++++++++++++++ ", timelockcontroller.address)

        //deploy TVotes
        tvotesCon = await ethers.getContractFactory("TVotes", deployer)
        tvotes = await tvotesCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await tvotes.deployed()

        await tvotes.connect(user).delegate(user.address)
        await tvotes.connect(user1).delegate(user1.address)
        await tvotes.connect(user2).delegate(user2.address)
        await tvotes.connect(user3).delegate(user3.address)

        await tvotes.connect(user).mint(100)
        await tvotes.connect(user1).mint(100)
        await tvotes.connect(user2).mint(100)
        await tvotes.connect(user3).mint(100)
        
        console.log("+++++++++++++Tvotes+++++++++++++++ ", tvotes.address)
        //deploy TDao
        tdaoCon = await ethers.getContractFactory("TDao", deployer)
        tdao = await tdaoCon.deploy(tvotes.address, timelockcontroller.address)
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await tdao.deployed()
        console.log("+++++++++++++TDao+++++++++++++++ ", tdao.address)
        await timelockcontroller.connect(deployer).grantRole("0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1", tdao.address)
        await timelockcontroller.connect(deployer).grantRole("0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63", tdao.address)

        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", user)
        erc20Sample = await erc20SampleCon.deploy()
        await erc20Sample.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

        // const signature = 'test()'
        // const hash = Web3.utils.keccak256(signature)
        // const buff = Buffer.from(hash, "utf-8")

        // // const tx = await tdao.connect(user).proposalSnapshot(128)
        // const tx = await tdao.connect(deployer).propose([erc20Sample.address], [0], [buff], 'abc')

        TopBridgeCon =  await hre.ethers.getContractFactory("TopBridge", deployer)
        TopBridgeContract = await TopBridgeCon.deploy()
        await TopBridgeContract.deployed()
        TopBridgeContract.connect(deployer).initialize(1, user.address)

        console.log("+++++++++++++TopBridge+++++++++++++++ ", TopBridgeContract.address)
    })

    it('TDao Test', async () => {
        // //deploy TRC20
        // const tx = await tdao.connect(user1).updateTimelock("0x0000000000000000000000000000000000000000")
        try {
            const transferCalldata = erc20Sample.interface.encodeFunctionData('transfer', [user.address, 128])
            const tx = await tdao.connect(user).proposeTest([user.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).castVote("88928029944966018697812182705908317718404684317186120591563164328264189978767", 1)
            await tdao.connect(user1).castVote("88928029944966018697812182705908317718404684317186120591563164328264189978767", 1)
            await tdao.connect(user2).castVote("88928029944966018697812182705908317718404684317186120591563164328264189978767", 1)
            await tdao.connect(user3).castVote("88928029944966018697812182705908317718404684317186120591563164328264189978767", 1)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user).queueTest("88928029944966018697812182705908317718404684317186120591563164328264189978767")
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await erc20Sample.connect(user).transfer(user1.address, 10)
            await tdao.connect(user3).executeTest("88928029944966018697812182705908317718404684317186120591563164328264189978767")
            // //const tx = await tdao.connect(deployer).castVote(128,128)
        } catch (e) {
            console.log(e)
        }
    })

    it('Bridge, batch', async () => {
        // //deploy TRC20
        // const tx = await tdao.connect(user1).updateTimelock("0x0000000000000000000000000000000000000000")
         try {
             const data = '0xf9029eb9029b00f90297b86d00f86a7b8201c882350ba0c45f950382d542169ea207959ee0220ec1491755abe405cd7498d6b16adb6df8a0d25688cf0ab10afa1a0e2dba7853ed5f1e5bf1c631757ed4e103b593ff3f5620a0e3f407f83fc012470c26a93fdff534100f2c6f736439ce0ca90e9914f7d1c381a0cda1f407f83fc012470c26a93fdff534100f2c6f736439ce0ca9acbde1234567f9012864f90124f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f8daf84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201c180f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201'
             await TopBridgeContract.connect(user).addLightClientBlocks(data);
         } catch (e) {
             console.log(e)
         }
     })
})