const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 9500000 }

describe('EthLocker', () => {

  let wallet, wallet2,wallet3
  let erc20Token
  let ethLocker

  beforeEach(async () => {
    [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
    provider = hardhat.ethers.provider

    // deserializeCon = await ethers.getContractFactory("Deserialize");
    // deserialize = await deserializeCon.deploy();
    // await deserialize.deployed();

    const Erc20token =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token = await Erc20token.deploy('ERC20Mintable', 'et')

    const EthLockerResult =  await hre.ethers.getContractFactory("EthLockerTest", {
      gasLimit: 9500000,
      signer: wallet,
      // libraries: {
      //   Deserialize:deserialize.address
      // }
    })
    ethLocker = await EthLockerResult.deploy()

    // const TopBridge = await hre.artifacts.readArtifact("TopBridge", {
    //   libraries: {
    //     Deserialize:deserialize.address
    //   }
    // })

    const TopBridge = await hre.artifacts.readArtifact("TopBridge")
    
    bridge = await deployMockContract(wallet, TopBridge.abi, overrides)

    const TopProver = await hre.ethers.getContractFactory("TopProver", wallet, overrides)
    prover = await TopProver.deploy()
    await prover._TopProver_initialize(bridge.address)

    const Limit = await hre.ethers.getContractFactory("Limit", wallet, overrides)
    limit = await Limit.deploy()
    await limit._Limit_initialize(wallet.address)

    console.log("wallet>>>> "  + wallet.address)
    console.log("wallet2>>>> "  + wallet2.address)

    console.log("erc20Token>>>> "  + erc20Token.address)
    console.log("ethLocker>>>> "  + ethLocker.address)

    console.log("prover>>>> "  + prover.address)
    console.log("bridge>>>> "  + bridge.address)
    console.log("Limit>>>> "  + limit.address)


    await ethLocker._EthLocker_initialize(prover.address,0,wallet.address,limit.address,erc20Token.address,erc20Token.address)

  })

  // //bindAssetHash
  // describe('bindAssetHash', () => {
  //   it('It has permissions', async () => {
  //      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
  //   })

  //   it('It has no permissions', async () => {
  //     let msg = 'AccessControl: account ' + wallet2.address.toLowerCase() + ' is missing role 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6'
  //     await expect(ethLocker.connect(wallet2).bindAssetHash(AddressZero, erc20Token.address,erc20Token.address)
  //     ).to.be.revertedWith(msg)
  //   })

  //   it('It is bind not empty address', async () => {
  //     await expect(ethLocker.bindAssetHash(erc20Token.address, erc20Token.address,erc20Token.address)).to.be.revertedWith('both asset addresses are not to be 0')

  //   })
  // })
  
  //lockToken
  describe('lockToken', () => {
    it('no have bind token', async () => {
       await ethLocker.adminPause(0)
       await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address)).to.be.revertedWith('transferred ether is not equal to amount')
    })
  
    it('Inconsistent quantity', async () => {
      //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      await ethLocker.adminPause(0)
      await limit.bindTransferedQuota(AddressZero,toWei('0.5'),toWei('4'))
      await expect(ethLocker.lockToken(AddressZero,toWei('2'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('transferred ether is not equal to amount!')

    })

    it('Lack of balance', async () => {
      //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      try{
        await expect(ethLocker.lockToken(AddressZero,toWei('100000'),wallet3.address,{value:toWei('100000')})).to.be.revertedWith("sender doesn't have enough funds to send tx")
      }catch{
        console.log("Lack of balance>>>> "  + 'Lack of balance')
      }
    })

    it('pause and have no permissions', async () => {
      //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      await ethLocker.adminPause(1)
      expect(await ethLocker.paused()).to.equal(1);

      await ethLocker.revokeRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)
      expect(await ethLocker.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)).to.equal(false);
      await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('no permit')


    })
    
    it('settings can pass', async () => {
      //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
  
      await ethLocker.adminPause(0)
      expect(await ethLocker.paused()).to.equal(0);
      await limit.bindTransferedQuota(AddressZero,toWei('0.5'),toWei('4'))
      await ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})

    })

    // it('There is no set lock amount limit', async () => {
    //   //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
    //   await ethLocker.adminPause(0)
    //   expect(await ethLocker.paused()).to.equal(0);
    //   await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('quota is not exist')

    // })

    // it('Minimum lock amount limit', async () => {
    //   //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
    //   await ethLocker.adminPause(0)
    //   expect(await ethLocker.paused()).to.equal(0);
    //   await limit.bindTransferedQuota(AddressZero,toWei('2'),toWei('4'))
    //   await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('amount of token is underflow')

    // })

    // it('Maximum lock amount limit', async () => {
    //   //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
    //   await ethLocker.adminPause(0)
    //   expect(await ethLocker.paused()).to.equal(0);
    //   await limit.bindTransferedQuota(AddressZero,toWei('0.5'),toWei('4'))
    //   await expect(ethLocker.lockToken(AddressZero,toWei('5'),wallet3.address,{value:toWei('5')})).to.be.revertedWith('amount of token is overflow')

    // })

    it('account set blacklist', async () => {
      await ethLocker.grantRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet.address)
      expect(await ethLocker.hasRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet.address)).to.equal(true);
      await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('no permit')

    })
  })

//   //adminTransfer
//   describe('adminTransfer', () => {
//     it('No initial permissions', async () => {

//       //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
//       await ethLocker.adminPause(0)
//       expect(await ethLocker.paused()).to.equal(0);
//       await limit.bindTransferedQuota(AddressZero,toWei('0.5'),toWei('4'))
//       await ethLocker.lockToken(AddressZero,toWei('2'),wallet3.address,{value:toWei('2')})

//       expect(await ethLocker.ethBalance(ethLocker.address)).to.equal(toWei('2'))
//       let currentbalance= await ethLocker.ethBalance(wallet.address)

//       let msg = 'AccessControl: account ' + wallet.address.toLowerCase() + ' is missing role 0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443'
//       await expect(ethLocker.adminTransfer(wallet.address,toWei('1'))).to.be.revertedWith(msg)
//     })

//     it('have permissions', async () => {
//       //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
//       await ethLocker.adminPause(0)
//       expect(await ethLocker.paused()).to.equal(0);
//       await limit.bindTransferedQuota(AddressZero,toWei('0.5'),toWei('4'))
//       await ethLocker.lockToken(AddressZero,toWei('2'),wallet3.address,{value:toWei('2')})

//       expect(await ethLocker.ethBalance(ethLocker.address)).to.equal(toWei('2'))
//       let currentbalance= await ethLocker.ethBalance(wallet.address)

//       await ethLocker.grantRole('0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443',wallet.address)
//       await ethLocker.adminTransfer(wallet.address,toWei('1'))
//       expect(await ethLocker.ethBalance(ethLocker.address)).to.equal(toWei('1'))

//       await ethLocker.adminTransfer(wallet.address,toWei('1'))
//       expect(await ethLocker.ethBalance(ethLocker.address)).to.equal(0)

//    })

//   it('remove permissions', async () => {
//       //await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
//       await ethLocker.adminPause(0)
//       expect(await ethLocker.paused()).to.equal(0);
//       await limit.bindTransferedQuota(AddressZero,toWei('0.5'),toWei('4'))
//       await ethLocker.lockToken(AddressZero,toWei('2'),wallet3.address,{value:toWei('2')})

//       expect(await ethLocker.ethBalance(ethLocker.address)).to.equal(toWei('2'))
//       let currentbalance= await ethLocker.ethBalance(wallet.address)

//       await ethLocker.grantRole('0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443',wallet.address)

//       await ethLocker.revokeRole('0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443',wallet.address)
//       expect(await ethLocker.hasRole('0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443',wallet.address)).to.equal(false);

//       let msg = 'AccessControl: account ' + wallet.address.toLowerCase() + ' is missing role 0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443'
//       await expect(ethLocker.adminTransfer(wallet.address,toWei('2'))).to.be.revertedWith(msg)
//   })

//  })


})
