// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile 
    // manually to make sure everything is compiled
    // await hre.run('compile');
    // create accounts
    [deployer, admin, miner, user, user1, redeemaccount] = await ethers.getSigners()
    owner = deployer
    console.log("deployer account:", deployer.address)
    console.log("owner account:", owner.address)
    console.log("admin account:", admin.address)
    console.log("team account:", miner.address)
    console.log("user account:", user.address)
    console.log("redeemaccount account:", redeemaccount.address)

    //deploy ERC20
    erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", user)
    erc20Sample = await erc20SampleCon.deploy()
    //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
    await erc20Sample.deployed()
    console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

    //deploy TopProve
    //fork address
    address = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"
    topProveContractCon = await ethers.getContractFactory("TopProve", deployer)
    topProveContract = await topProveContractCon.deploy(address)
    await topProveContract.deployed()
    console.log("+++++++++++++TopProve+++++++++++++++ ", topProveContract.address)

    //deploy ERC20Locker
    lockContractCon = await ethers.getContractFactory("TopERC20Lockproxy", deployer)
    lockContract = await lockContractCon.deploy()
    await lockContract.deployed()
    
    //fork peer contract
    peerContractaddress = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784b"
    lockContract.initialize(topProveContract.address, peerContractaddress, 1000, admin.address, 1, 0)
    console.log("+++++++++++++LockContract+++++++++++++++ ", lockContract.address)
    
    //bind asset
    await lockContract.connect(admin).bindAssetHash(erc20Sample.address, 1, address)
    console.log("+++++++++++++bind my and peer asset contract+++++++++++++++ ", address)

    //aprove
    await erc20Sample.connect(user).approve(lockContract.address, 1000)
    console.log("+++++++++++++aprove erc20 contract+++++++++++++++ ", lockContract)

    try {
      const tx = await lockContract.connect(user).lockToken(erc20Sample.address, 1, 1, user.address)
      // console.log(tx)
      const rc = await tx.wait()
      const event = rc.events.find(event=>event.event === "Locked")
      console.log("+++++++++++++lock token+++++++++++++++ ")
      console.log(event)
    } catch (error) {
        console.log(error)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
