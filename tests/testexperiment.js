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
             const data = '0xf9051ab9051700f902deb86d00f86a7b8201c882350ba0c45f950382d542169ea207959ee0220ec1491755abe405cd7498d6b16adb6df8a0d25688cf0ab10afa1a0e2dba7853ed5f1e5bf1c631757ed4e103b593ff3f5620a0e3f407f83fc012470c26a93fdff534100f2c6f736439ce0ca90e9914f7d1c381a0cda1f407f83fc012470c26a93fdff534100f2c6f736439ce0ca9acbde1234567f9012864f90124f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f847a0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70eaa0b72d55c76bd8f477f4b251763c33f75e6f5f5dd8af071e711e0cb9b2accc70ea8412345678f90120f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d303842012b5142546631352f73757350384a4841723063627248727a386958a0000000000000000000000000000000000000000000000000000000000000000080f843a046796841364250326d5462674f736d7351466a513039723969586e2b6633666da0000000000000000000000000000000000000000000000000000000000000000080f901b0f84601f843a09c161a471b06c98332f13b36f2125d9ae075bc682ddcc6c1a788f6d60a9d6090a07426e57f825b646f24968296fbb0945d2903136b00094fed66227f9478e42edf80f84601f843a06fb8d2f574c0f746ceae776d0ca1d3a9d1b1ad43bdec7825ea584714846abec9a023cfda85b292f720f255446502722d917d02e7c49120b73041c3b774c422f42880f84601f843a0ecccb7971a0adedbcccc258e46e31f2ed8f52ed9f290e76fe1cdbe6d09321cbea054e2a77195fde3ea28fdd159a52447cfd5a878f12be530bf2cd37118f7887a6201f84601f843a008295f74841e9d145a30edc1eb467a89822ee65e221c19c55e8f6920d4019fc2a07ad3993d085ca67bbab5652031cd27a4c65d2f3041f3ebd43e01e2f08a46753d01f84601f843a01494c1ce0d52c24e0ec306afeb222ef5f4a6d8b23501ade2442a094beed80fcea001b71c1e606caf603a656a7dac22eeb34606440d1632a4dfe08ccfc0b2f95d4f80f84601f843a09098830a0c3e3aa862874cfa7588f7fc7da878d669014c909175e17bf296767fa07f637823400a1790ae1ebe36e65d8a5bba087cd8280e88b95fe1ba8ea8ffb38e01'
             await TopBridgeContract.connect(user).addLightClientBlocks(data);
         } catch (e) {
             console.log(e)
         }
     })

     it('Bridge, batch  no producer', async () => {
        // //deploy TRC20
        // const tx = await tdao.connect(user1).updateTimelock("0x0000000000000000000000000000000000000000")
         try {
             const data = '0xf901bbb901b801f901b4b86d01f86a7b8201c882350ba056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a00558a1adb78ce4290c4ff34c91e57f2cd41cf2c8cee80010ce02e8df1a87988ca00000000000000000000000000000000000000000000000000000000000000000a0cda1f407f83fc012470c26a93fdff534100f2c6f736439ce0ca9acbde1234567c0f90120f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201f84601f843a04f89ece0f576ba39123456789123456781604b97cf3baa922b010a758d303842a04f812345678abcdef1234ba19a44d94601604b97cf3baa922b010a758d30384201'
             await TopBridgeContract.connect(user).addLightClientBlocks(data);
         } catch (e) {
             console.log(e)
         }
     })
})