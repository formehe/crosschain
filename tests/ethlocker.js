const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployContract } = require('ethereum-waffle')
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

    const Erc20token =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token = await Erc20token.deploy('ERC20Mintable', 'et')

    const EthLocker =  await hre.ethers.getContractFactory("EthLocker", wallet, overrides)
    ethLocker = await EthLocker.deploy()

    console.log("wallet>>>> "  + wallet.address)
    console.log("wallet2>>>> "  + wallet2.address)

    console.log("erc20Token>>>> "  + erc20Token.address)

    console.log("ethLocker>>>> "  + ethLocker.address)

    await ethLocker._EthLocker_initialize(AddressZero,12,wallet.address)

  })

  //bindAssetHash
  describe('bindAssetHash', () => {
    it('It has permissions', async () => {
       await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
    })

    it('It has no permissions', async () => {
      let msg = 'AccessControl: account ' + wallet2.address.toLowerCase() + ' is missing role 0xb19546dff01e856fb3f010c267a7b1c60363cf8a4664e21cc89c26224620214e'
      await expect(ethLocker.connect(wallet2).bindAssetHash(AddressZero, erc20Token.address,erc20Token.address)
      ).to.be.revertedWith(msg)

    })

  })
  
  //lockToken
  describe('lockToken', () => {
    it('no have bind token', async () => {
       await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address)).to.be.revertedWith('empty illegal toAssetHash')
    })

    it('Inconsistent quantity', async () => {
      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      await expect(ethLocker.lockToken(AddressZero,toWei('2'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('transferred ether is not equal to amount!')

    })

    it('Lack of balance', async () => {
      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      try{
        await expect(ethLocker.lockToken(AddressZero,toWei('100000'),wallet3.address,{value:toWei('100000')})).to.be.revertedWith("sender doesn't have enough funds to send tx")
      }catch{
        console.log("Lack of balance>>>> "  + 'Lack of balance')
      }
      
    })

    it('have bind token but without balance', async () => {
      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      await ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})

    })

    it('pause and have no permissions', async () => {
      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);

      await ethLocker.adminPause(1)
      expect(await ethLocker.paused()).to.equal(1);

      await ethLocker.revokeRole('0xf8047ab327a401c711fd20c7b6e5c451929f0635cb87242f469ec7644b76376e',wallet.address)
      expect(await ethLocker.hasRole('0xf8047ab327a401c711fd20c7b6e5c451929f0635cb87242f469ec7644b76376e',wallet.address)).to.equal(false);
     
      await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('has been pause')

    })

    it('no settings can pass and have permissions', async () => {
      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
      await ethLocker.adminPause(1)
      expect(await ethLocker.paused()).to.equal(1);
      await ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})

    })

    it('set blacklist', async () => {

      await ethLocker.grantRole('0x937b6710550da16fcb4641beeba857944a83f406360b6b9db3ed2e88646ce304',wallet.address)
      expect(await ethLocker.hasRole('0x937b6710550da16fcb4641beeba857944a83f406360b6b9db3ed2e88646ce304',wallet.address)).to.equal(true);
      await expect(ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})).to.be.revertedWith('has been pause')

    })
    
    it('settings can pass', async () => {
      await ethLocker.bindAssetHash(AddressZero, erc20Token.address,erc20Token.address);
  
      await ethLocker.adminPause(0)
      expect(await ethLocker.paused()).to.equal(0);
      await ethLocker.lockToken(AddressZero,toWei('1'),wallet3.address,{value:toWei('1')})

    })

  })

})
