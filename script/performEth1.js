const hardhat = require("hardhat")
const {ethers} = require("hardhat");

const {
    isErc20Locker,lockerEth,tokenEth,limitEth,proverEth,bridgeEth,lockerTop,tokenTop,minTransferedToken,maxTransferedToken,bridgeEthAddBolckAdmin,topInitBlock
} = require('./performparams')

//perform Eth
async function performEth(){
    await performLocker()
    await performTopBridge()
}

async function performLocker(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()

    console.log("+++++++++++++deployer+++++++++++++++ ", deployer)
    const signer = await ethers.provider.getSigner(deployer)

    console.log("+++++++++++++lockerEth+++++++++++++++ ", lockerEth)
    let locker
    if(!isErc20Locker){
        locker = await ethers.getContractAt('EthLocker', lockerEth, signer)
        await locker._EthLocker_initialize(proverEth,0,deployer,limitEth,tokenTop,lockerTop, deserializeEth)
    }else{
        locker = await ethers.getContractAt('ERC20Locker', lockerEth, signer)
        await locker._ERC20Locker_initialize(proverEth,0,deployer,limitEth, deserializeEth)

    } 
}

async function performTopBridge(){
    const { getNamedAccounts} = hardhat
    let {
    deployer
    } = await getNamedAccounts()
    const signer = await ethers.provider.getSigner(deployer)
    const bridge = await ethers.getContractAt('TopBridge', bridgeEth, signer)
    await bridge.initialize(0,deployer, deserializeEth)
}

performEth()
