// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hardhat = require("hardhat")
const {ethers} = require("hardhat");
const { AddressZero } = require("ethers").constants
const toWei = ethers.utils.parseEther

//deploy eth
async function deployeth() {
    //params
    const minBlockAcceptanceHeight = 1000;
    const minTransferedQuota = 1
    const maxTransferedQuota = toWei('10000')

    const { getNamedAccounts, deployments, getChainId} = hardhat
    console.log('deployments', deployments)
    const { deploy } = deployments
    let {
        deployer,
        adminAccount,
      } = await getNamedAccounts()
      console.log("+++++++++++++deployer+++++++++++++++ ", deployer)

    const signer = await ethers.provider.getSigner(deployer)

    //deploy TRC20Token
    const ERC20TokenSampleResult = await deploy("ERC20TokenSample", {
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const erc20TokenSample = await hardhat.ethers.getContractAt(
        "ERC20TokenSample",
        ERC20TokenSampleResult.address,
        signer
    )
    console.log("+++++++++++++ERC20TokenSample+++++++++++++++ ", erc20TokenSample.address)

    //deploy ERC20Locker
    const ERC20LockerResult = await deploy("ERC20Locker", {
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const erc20Locker = await hardhat.ethers.getContractAt(
        "ERC20Locker",
        ERC20LockerResult.address,
        signer
    )
    console.log("+++++++++++++ERC20Locker+++++++++++++++ ", erc20Locker.address)

    const LimitResult = await deploy("Limit", {
      from: deployer,
      skipIfAlreadyDeployed: true
    })
  
    const limit = await hardhat.ethers.getContractAt(
      "Limit",
      LimitResult.address,
      signer
    )

    console.log("+++++++++++++LimitResult+++++++++++++++ ", limit.address)

    const TopBridgeResult = await deploy("TopBridge", {
      from: deployer,
      skipIfAlreadyDeployed: true
    })
  
    const topBridge = await hardhat.ethers.getContractAt(
      "TopBridge",
      TopBridgeResult.address,
      signer
    )
    console.log("+++++++++++++TopBridge+++++++++++++++ ", topBridge.address)





    const TopProverResult = await deploy("TopProver", {
      args: [topBridge.address],
      from: deployer,
      skipIfAlreadyDeployed: true
    })

    const topProver = await hardhat.ethers.getContractAt(
      "TopProver",
      TopProverResult.address,
      signer
    )

    console.log("+++++++++++++TopProver+++++++++++++++ ", topProver.address)
    
    //method is called
    // await erc20Locker._ERC20Locker_initialize(AddressZero,minBlockAcceptanceHeight,'0x12e7ad7470bb315a6ba8d0883cec8ec3ac548a36')
    // await erc20Locker.adminPause(0)
    // await erc20Locker.bindTransferedQuota(erc20TokenSample.address,minTransferedQuota,maxTransferedQuota) 
}

//perform Eth
async function performEth(){
    const { getNamedAccounts, deployments, getChainId} = hardhat
    const { deploy } = deployments
    let {
        deployer,
        adminAccount,
      } = await getNamedAccounts()
      console.log("+++++++++++++deployer+++++++++++++++ ", deployer)
    const signer = await ethers.provider.getSigner(deployer)

    //params
    const erc20LockerAddress = "0x08CA3b554b51D60cC6108b242F757279cAb2321E";
    const peerLockProxyHash = "0x93a5bc1a9b328cFa0815C4e7aD325F00Baf67358";

    const erc20TokenEth = "0x1EF6BF62E43c529540338082fFcAeFD924e03E93";
    const erc20TokenTop = "0x8773814F4a7dBF80C44Feb664D50E511f249FBD1";

    //bindHash
    const erc20Locker = await ethers.getContractAt('ERC20Locker', erc20LockerAddress, signer)
    await erc20Locker.bindAssetHash(erc20TokenEth,erc20TokenTop,peerLockProxyHash)
}

deployeth()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
