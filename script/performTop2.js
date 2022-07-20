const hardhat = require("hardhat")
const {ethers} = require("hardhat");

const {
    tokenEth,lockerTop,tokenTop,minTransferedTokenTop,maxTransferedTokenTop,limitTop
} = require('./performparams')

//perform Top
async function performTop(){
    await performLocker()
    await performLimit()
}

async function performLocker(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()

    console.log("+++++++++++++deployer+++++++++++++++ ", deployer)
    const signer = await ethers.provider.getSigner(deployer)

    console.log("+++++++++++++lockerTop+++++++++++++++ ", lockerTop)
    locker = await ethers.getContractAt('ERC20MintProxy', lockerTop, signer)

    await locker.adminPause(0)
    await locker.bindAssetHash(tokenTop,tokenEth)
}

async function performLimit(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()
    const signer = await ethers.provider.getSigner(deployer)
    const limit = await ethers.getContractAt('Limit', limitTop, signer)
    await limit.bindTransferedQuota(tokenTop,minTransferedTokenTop,maxTransferedTokenTop)
}

performTop()
