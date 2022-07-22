const hardhat = require("hardhat")
const {ethers} = require("hardhat");

const {
    lockerEth,lockerTop,limitTop,proverTop
} = require('./performparams')

//perform Top
async function performTop(){
    await performLocker()
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
    await locker.initialize(proverTop,lockerEth,0,limitTop)
}

performTop()
