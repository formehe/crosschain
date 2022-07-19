const hardhat = require("hardhat")
const Web3 = require('web3')
var Tx = require("ethereumjs-tx").Transaction

const networks  = require('../hardhat.networks')
const network = networks.rinkeby

const web3 = new Web3(new Web3.providers.HttpProvider(network.url));

async function deploy(){
    deployERC20MintProxy()
}

async function deployERC20MintProxy(){

    const { getNamedAccounts} = hardhat
    let {
          deployer
    } = await getNamedAccounts()

    console.log("+++++++++++++url+++++++++++++++ ",JSON.stringify(networks.topTest))
    const mintProxy = await hre.artifacts.readArtifact("ERC20MintProxy")
    const bytecode = mintProxy.bytecode
    const abi = mintProxy.abi
    // console.log("+++++++++++++Limit+++++++++++++++ ",abi)
    const MintProxyContract = new web3.eth.Contract(abi);
    // console.log("+++++++++++++Limit+++++++++++++++ ",bytecode)
    console.log("+++++++++++++Limit+++++++++++++++ ",MintProxyContract)

    var fromAddr = deployer;
    console.log("+++++++++++++fromAddr+++++++++++++++ ",fromAddr)
    var count = await web3.eth.getTransactionCount(fromAddr);

    var gasPrice = await web3.eth.getGasPrice();

    console.log("+++++++++++++gasPrice+++++++++++++++ ",web3.utils.toHex(gasPrice))
    var gasLimit = 3000000;
    var privateKey = new Buffer.from(network.accounts[0], 'hex');

    var rawTx = {
        'from': fromAddr,
        'nonce': web3.utils.toHex(count),
        'gasPrice': web3.utils.toHex(gasPrice),
        'gasLimit': web3.utils.toHex(gasLimit),
        'value': '0x0',
        'data': bytecode
    };
    //console.log("+++++++++++++rawTx+++++++++++++++ ",JSON.stringify(rawTx))
    const tx = new Tx(rawTx, {chain: 'rinkeby'})
    // const tx = new Tx(rawTx);
    tx.sign(privateKey);
    var serializedTx = tx.serialize();
    var hashTx = await web3.eth.sendSignedTransaction('0x'+serializedTx.toString('hex'));
    console.log('contractAddress: ' + hashTx.contractAddress);
}

deploy()