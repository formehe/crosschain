const networks = require('./hardhat.networks')
require("@nomiclabs/hardhat-waffle")
require('hardhat-deploy')
require('hardhat-deploy-ethers')
require('solidity-coverage')
require("@nomiclabs/hardhat-etherscan")
require('hardhat-abi-exporter')

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

const OwnerTestAccount = '0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a'

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {

  networks,
  solidity: {
    version: "0.8.3",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    owner: {
      42: OwnerTestAccount,
      4: OwnerTestAccount,
      3: OwnerTestAccount
    },
    admin: {
      42: OwnerTestAccount,
      4: OwnerTestAccount,
      3: OwnerTestAccount
    }
  },
  mocha: {
    timeout: 2000000
  }
};

