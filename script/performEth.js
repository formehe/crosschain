const hardhat = require("hardhat")
const {ethers} = require("hardhat");

const {
    lockerEth,tokenEth,limitEth,bridgeEth,lockerTop,tokenTop,minTransferedToken,maxTransferedToken,topInitBlock
} = require('./performparams')

//perform Eth
async function performEth(){
    performLocker()
    performLimit()
    performTopBridge()
}

async function performLocker(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()

    console.log("+++++++++++++deployer+++++++++++++++ ", deployer)
    const signer = await ethers.provider.getSigner(deployer)

    console.log("+++++++++++++lockerEth+++++++++++++++ ", lockerEth)
    const locker = await ethers.getContractAt('ERC20Locker', lockerEth, signer)

    await locker.adminPause(0);
    await locker.bindAssetHash(tokenEth,tokenTop,lockerTop)
}

async function performLimit(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()
    const signer = await ethers.provider.getSigner(deployer)
    const limit = await ethers.getContractAt('Limit', limitEth, signer)
    await limit.bindTransferedQuota(lockerEth,minTransferedToken,maxTransferedToken)
}

async function performTopBridge(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()
    const signer = await ethers.provider.getSigner(deployer)
    const bridge = await ethers.getContractAt('TopBridge', bridgeEth, signer)
    await bridge.initialize(0,deployer)
    await bridge.initWithBlock(topInitBlock)
}

performEth()
