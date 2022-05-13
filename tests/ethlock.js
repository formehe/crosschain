const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployContract } = require('ethereum-waffle')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 9500000 }

describe('Liquidation', () => {

  let wallet, wallet2
  let erc20Token

  beforeEach(async () => {
    [wallet, wallet2] = await hardhat.ethers.getSigners()
    provider = hardhat.ethers.provider

    const Erc20token =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token = await Erc20token.deploy('ERC20Mintable', 'et')

    console.log("erc20Token>>>> "  + erc20Token.address)
  })



  describe('arriveLossValue()', () => {
    it('arriveLossValue  true', async () => {
    })

   
  })

})
