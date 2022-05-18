const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployContract } = require('ethereum-waffle')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 9500000 }

describe('ERC20Locker', () => {

  let wallet, wallet2,wallet3
  let erc20Token,erc20Token2
  let erc20Locker

  beforeEach(async () => {
    [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
    provider = hardhat.ethers.provider

    const Erc20token =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token = await Erc20token.deploy('ERC20Mintable', 'et')

    const Erc20token2 =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token2 = await Erc20token2.deploy('ERC20Mintable2', 'et2')

    const Erc20Locker =  await hre.ethers.getContractFactory("ERC20Locker", wallet, overrides)
    erc20Locker = await Erc20Locker.deploy()

    console.log("wallet>>>> "  + wallet.address)
    console.log("wallet2>>>> "  + wallet2.address)

    console.log("erc20Token>>>> "  + erc20Token.address)
    console.log("erc20Token2>>>> "  + erc20Token2.address)
    console.log("erc20Locker>>>> "  + erc20Locker.address)

    await erc20Locker._ERC20Locker_initialize(AddressZero,12,wallet.address)

  })

  //bindAssetHash
  describe('bindAssetHash', () => {
    it('It has permissions', async () => {
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
    })

    it('It has no permissions', async () => {
      let msg = 'AccessControl: account ' + wallet2.address.toLowerCase() + ' is missing role 0xb19546dff01e856fb3f010c267a7b1c60363cf8a4664e21cc89c26224620214e'
      await expect(erc20Locker.connect(wallet2).bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address)
      ).to.be.revertedWith(msg)

    })

  })
  
  //lockToken
  describe('lockToken', () => {
    it('no have bind token', async () => {
       await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('empty illegal toAssetHash')
    })

    it('have bind token but without balance', async () => {
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('ERC20: insufficient allowance')

    })

    it('without approve', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('pause and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.adminPause(1)
      expect(await erc20Locker.paused()).to.equal(1);

      await erc20Locker.revokeRole('0xf8047ab327a401c711fd20c7b6e5c451929f0635cb87242f469ec7644b76376e',wallet.address)
      expect(await erc20Locker.hasRole('0xf8047ab327a401c711fd20c7b6e5c451929f0635cb87242f469ec7644b76376e',wallet.address)).to.equal(false);
     
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('has been pause')

    })

    it('no settings can pass and have permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

    })

    it('set blacklist', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.grantRole('0x937b6710550da16fcb4641beeba857944a83f406360b6b9db3ed2e88646ce304',wallet.address)

      expect(await erc20Locker.hasRole('0x937b6710550da16fcb4641beeba857944a83f406360b6b9db3ed2e88646ce304',wallet.address)).to.equal(true);

      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('has been pause')

    })
    
    it('no settings can pass', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))
    
      await erc20Locker.revokeRole('0xf8047ab327a401c711fd20c7b6e5c451929f0635cb87242f469ec7644b76376e',wallet.address)
      expect(await erc20Locker.hasRole('0xf8047ab327a401c711fd20c7b6e5c451929f0635cb87242f469ec7644b76376e',wallet.address)).to.equal(false);
     
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('has been pause')

    })
    
    it('settings can pass', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

      await erc20Token.approve(erc20Locker.address,toWei('200'))
    
      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

    })


  })

})
