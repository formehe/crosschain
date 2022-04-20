// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile 
    // manually to make sure everything is compiled
    // await hre.run('compile');

    //部署FLT token 合约
    const FILECon = await ethers.getContractFactory("FILE");
    const fileCon = await FILECon.deploy("FILEToken","FILE",18,"0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a","5242880000000000000000000000000000000000","20971520000000000000000000000000000000000000000000","0x03dF0C7Da179D4120eb556CB79726fD2B78a885D"); //string memory name,string memory symbol,uint8 decimals,address marketing,uint256 amount
    await fileCon.deployed();
    console.log("FILEToken deployed to:",fileCon.address)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
