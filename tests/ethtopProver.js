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

    // const TopBridge1 = await hre.artifacts.readArtifact("TopPridgeTest")
    // topBridge1 = await deployMockContract(wallet, TopBridge1.abi, overrides)

    // const TopProver1 =  await hre.ethers.getContractFactory("TopProverTest", wallet, overrides)
    // topProver1 = await TopProver1.deploy(topBridge1.address)

  })

  describe('verifyHeight', () => {
    it('There is no height', async () => {
        let{valid,reason} = await topProver.verifyHeight(2);
        console.log("There is no height->  " + valid + "  " + reason)
    })

    it('There is height', async () => {
        //await topBridge.mock.calculateEarlyExitFee.withArgs(account,controlledToken,borrowAmount).returns(toWei('0.02'),toWei('0.02'))
    })

  })


})
