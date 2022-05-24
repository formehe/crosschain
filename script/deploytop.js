// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hardhat = require("hardhat")
const {ethers} = require("hardhat");
const { AddressZero } = require("ethers").constants
const toWei = ethers.utils.parseEther

//deploy top
async function deploytop() {
    //params
    const peerProxyHash = "0x08CA3b554b51D60cC6108b242F757279cAb2321E"
    const addressEthToken = "0x1EF6BF62E43c529540338082fFcAeFD924e03E93"

    const bridgeLightAddress = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"

    const minTransferedQuota = 1
    const maxTransferedQuota = toWei('10000')
    const minBlockAcceptanceHeight = 1000;

    const { getNamedAccounts, deployments, getChainId} = hardhat
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

    //deploy TopProve
    const TopProveResult = await deploy("TopProve", {
        args: [
            bridgeLightAddress
        ],
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const topProve = await hardhat.ethers.getContractAt(
        "TopProve",
        TopProveResult.address,
        signer
    )
    console.log("+++++++++++++TopProveResult+++++++++++++++ ", topProve.address)

    //deploy ERC20MintProxy
    const ERC20MintProxyResult = await deploy("ERC20MintProxy", {
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const erc20MintProxy = await hardhat.ethers.getContractAt(
        "ERC20MintProxy",
        ERC20MintProxyResult.address,
        signer
    )
    console.log("+++++++++++++ERC20MintProxy+++++++++++++++ ", erc20MintProxy.address)

    //method is called
    await erc20MintProxy.initialize(topProve.address,peerProxyHash,minBlockAcceptanceHeight)
    await erc20MintProxy.adminPause(0)
    await erc20MintProxy.bindAssetHash(erc20TokenSample.address,addressEthToken)
    await erc20MintProxy.bindTransferedQuota(erc20TokenSample.address,minTransferedQuota,maxTransferedQuota)
}    

deploytop()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
