const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployContract } = require('ethereum-waffle')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 9500000 }

describe('TopProver', () => {

  let wallet, wallet2,wallet3
  let topProver,topProver1
  let topBridge,topBridge1

  beforeEach(async () => {
    [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
    provider = hardhat.ethers.provider

    console.log("wallet>>>> "  + wallet.address)

    const TopBridge =  await hre.ethers.getContractFactory("TopPridgeTest", wallet, overrides)
    topBridge = await TopBridge.deploy()
    
    const TopProver =  await hre.ethers.getContractFactory("TopProverTest", wallet, overrides)
    topProver = await TopProver.deploy(topBridge.address)

  })

  describe('verifyHash', () => {
    it('There is no hash', async () => {
        await expect(topProver.verifyHash('0x0000000000000000000000000000000000000000000000000000000000000001')
        ).to.be.revertedWith('fail to decode')
    })

    it('There is hash', async () => {
      await topBridge.setBlockHashes('0x0000000000000000000000000000000000000000000000000000000000000001',true)
      let{valid,reason} = await topProver.verifyHash('0x0000000000000000000000000000000000000000000000000000000000000001');
    })

  })

  describe('getAddLightClientTime', () => {
    it('There is no height', async () => {
        await expect(topProver.getAddLightClientTime(2)
        ).to.be.revertedWith('Height is not confirmed1')
    })

    it('There is height', async () => {
      await topBridge.setBlockHeights(2,100)
      expect(await call(topProver,"getAddLightClientTime",2)).to.equal(100)
    })

  })

})
