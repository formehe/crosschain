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
}

deployeth()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
