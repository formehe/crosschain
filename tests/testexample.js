const chai = require("chai");
const expect = chai.expect;

var utils = require('ethers').utils;

const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
const borsh = require("borsh")

const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const buffer = require('safe-buffer').Buffer;
const rpc = require('isomorphic-rpc')
const { RobustWeb3, JSONreplacer } = require('rainbow-bridge-utils')

const { GetAndVerify, GetProof, VerifyProof } = require('eth-proof')
const toWei = (val) => ethers.utils.parseEther('' + val)
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')
const { Account, Header, Log, Proof, Receipt, Transaction } = require("eth-object")
const Web3EthAbi = require('web3-eth-abi')
console.log(process.argv)
class ReceiptRLP {
    constructor(status, cumulativeGasUsed, logsBloom, logs) {
        this.status = rc.status
        if (rc.hasOwnProperty("root")) {
            this.root = rc.root
        }
        this.cumulativeGasUsed = new BN(rc.cumulativeGasUsed.toNumber())
        this.logsBloom = rc.logsBloom
        this.logs = new Array()
        for (var key in rc.logs) {
            if(rc.logs.hasOwnProperty(key)) {
                this.logs.push(rc.logs[key])
            }
        }
    }
}

class LOGRLP {
    constructor(log) {
        this.address = log.address
        this.data = log.data
        this.topics = new Array()
        for (var key in log.topics) {
            if(log.topics.hasOwnProperty(key)) {
                this.topics.push(log.topics[key])
            }
        }
    }
}

class TxProof {
     constructor(logIndex, logEntryData, reciptIndex, reciptData, headerData, proof) {
        this.logIndex = logIndex
        this.logEntryData = logEntryData
        this.reciptIndex = reciptIndex
        this.reciptData = new Uint8Array(1 + reciptData.length);
        this.reciptData[0] = 2;
        for (var i = 0; i < reciptData.length; i++) {
            this.reciptData[i + 1] = reciptData[i];
        }
        this.headerData = headerData
        
        this.proof = []
        // console.log(proof.buffer)
        // console.log("______________________________")
        for (const node of proof) {
            var tmp = new Uint8Array(1 + node[1].length);
            tmp[0] = 2;
            var i = 1;
            for (var i = 0; i < node[1].length; i++) {
                tmp[i + 1] = node[1][i];
            }
            this.proof.push(rlp.encode([node[0], tmp]))
        }
        // console.log("______________________________")
        // console.log(keccak256(this.proof[0]))
    }
}

describe("ERC20MintProxy", function () {

    beforeEach(async function () {
        //准备必要账户
        [deployer, admin, miner, user, user1, redeemaccount] = await hre.ethers.getSigners()
        owner = deployer
        console.log("deployer account:", deployer.address)
        console.log("owner account:", owner.address)
        console.log("admin account:", admin.address)
        console.log("team account:", miner.address)
        console.log("user account:", user.address)
        console.log("redeemaccount account:", redeemaccount.address)

        zeroAccount = "0x0000000000000000000000000000000000000000"

        // const deserializeCon = await ethers.getContractFactory("Deserialize");
        // const deserialize = await deserializeCon.deploy();
        // await deserialize.deployed();

        //deploy ERC20
        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", deployer)
        erc20Sample = await erc20SampleCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await erc20Sample.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

        //deploy ERC20 1
        erc20SampleCon1 = await ethers.getContractFactory("ERC20TokenSample", deployer)
        erc20Sample1 = await erc20SampleCon1.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await erc20Sample1.deployed()
        console.log("+++++++++++++Erc20Sample1+++++++++++++++ ", erc20Sample1.address)

        //header sync mock
        headerMockCon = await ethers.getContractFactory("HeaderSyncMock", deployer)
        headerMock = await headerMockCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await headerMock.deployed()
        console.log("+++++++++++++HeaderSyncMock+++++++++++++++ ", headerMock.address)

        //deploy prove
		address = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"
        topProveContractCon = await ethers.getContractFactory("EthProver", deployer)

        topProveContract = await topProveContractCon.deploy()
        console.log("+++++++++++++EthProver+++++++++++++++ ", topProveContract.address)
        await topProveContract.deployed()
        await topProveContract._EthProver_initialize(headerMock.address)
        await expect(topProveContract._EthProver_initialize(bridge.address)).to.be.revertedWith("Initializable: contract is already initialized")

        //deploy mint contract
        try {
            mintContractCon = await ethers.getContractFactory("ERC20MintProxyTest", {
                signer: admin,
                // libraries: {
                //     Deserialize: deserialize.address,
                // },
            })    
        } catch (error) {
            console.log(error)
        }
        
        mintContract = await mintContractCon.deploy()
        console.log("+++++++++++++mintContract+++++++++++++++ ", mintContract.address)
        await mintContract.deployed()

        //deploy mint contract1
        mintContractCon1 = await ethers.getContractFactory("ERC20MintProxyTest", {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address,
            // },
        })
        mintContract1 = await mintContractCon1.deploy()
        console.log("+++++++++++++MintContract1+++++++++++++++ ", mintContract1.address)
        await mintContract1.deployed()

        mintContractCon2 = await ethers.getContractFactory("ERC20MintProxyTest", {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        mintContract2 = await mintContractCon2.deploy()
        console.log("+++++++++++++MintContract2+++++++++++++++ ", mintContract2.address)
        await mintContract2.deployed()

        limitCon = await ethers.getContractFactory("Limit", admin)
        limitContract = await limitCon.deploy()
        console.log("+++++++++++++limitContract+++++++++++++++ ", limitContract.address)
        await limitContract.deployed()
        await limitContract._Limit_initialize(admin.address)

        await limitContract.connect(admin).bindTransferedQuota(erc20Sample1.address, 1, 1000000000)
        await limitContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        //deploy time lock controller
        timelockcontrollerCon = await ethers.getContractFactory("TimeController", deployer)
        timelockcontroller = await timelockcontrollerCon.deploy(1)
        await timelockcontroller.deployed()
        console.log("+++++++++++++timelockcontroller+++++++++++++++ ", timelockcontroller.address)

        //deploy TVotes
        votesCon = await ethers.getContractFactory("ImmutableVotes", deployer)
        votes = await votesCon.deploy([admin.address, user.address, user1.address])
        await votes.deployed()
        console.log("+++++++++++++ImmutableVotes+++++++++++++++ ", votes.address)

        //deploy TDao
        tdaoCon = await ethers.getContractFactory("TDao", deployer)
        tdao = await tdaoCon.deploy(votes.address, 2, 3, 70, timelockcontroller.address, deployer.address, 1,5,1,7)
        await tdao.deployed()
        console.log("+++++++++++++TDao+++++++++++++++ ", tdao.address)

        await timelockcontroller._TimeController_initialize(tdao.address, 1, 100)

        transparentproxyCon = await ethers.getContractFactory("TransparentProxy", deployer)
        transparentproxy = await transparentproxyCon.deploy(mintContract.address, tdao.address, admin.address)
        transparentproxy1 = await transparentproxyCon.deploy(mintContract1.address, tdao.address, admin.address)
        transparentproxy2 = await transparentproxyCon.deploy(mintContract2.address, tdao.address, admin.address)

        transparentproxied = await mintContractCon.attach(transparentproxy.address);
        transparentproxied1 = await mintContractCon.attach(transparentproxy1.address);
        transparentproxied2 = await mintContractCon.attach(transparentproxy2.address);
        
        await transparentproxied.initialize(topProveContract.address, transparentproxy1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [erc20Sample1.address])
        await transparentproxied.connect(admin).adminPause(0)
        await transparentproxied.connect(admin).adminPause(0)
        await transparentproxied1.initialize(topProveContract.address, transparentproxy.address, 1000, admin.address, limitContract.address, [erc20Sample1.address], [erc20Sample.address])
        await transparentproxied1.connect(admin).adminPause(0)
        await transparentproxied2.initialize(topProveContract.address, transparentproxy1.address, 1000, admin.address, limitContract.address, [limitContract.address], [erc20Sample.address])
        await transparentproxied2.connect(admin).adminPause(0)

        await transparentproxied.grantRole("0xba89994fffa21b6259d0e98b52260f21bc06a07249825a4125b51c20e48d06ff", timelockcontroller.address)
        await transparentproxied1.grantRole("0xba89994fffa21b6259d0e98b52260f21bc06a07249825a4125b51c20e48d06ff", timelockcontroller.address)
        await transparentproxied2.grantRole("0xba89994fffa21b6259d0e98b52260f21bc06a07249825a4125b51c20e48d06ff", timelockcontroller.address)
    })

    it('no admin user can not bind failed between local and peer asset', async () => {
        
        await expect(transparentproxied.connect(deployer).bindAssetHash(erc20Sample.address, address))
            .to.be.revertedWith('is missing role')
    })

    it('modify owner role', async () => {
        await transparentproxied.connect(admin).grantRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c', user.address)
        try {
          result = await transparentproxied.connect(admin).grantRole('0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6', user.address)
        } catch (error) {
          expect(
            error.message.indexOf('missing role') > -1
          ).to.equal(true)
        }
        // .to.be.revertedWith('missing role')
    })

    it('the local address can not be non-contract for binding', async () => {
        let transferCalldata = mintContract.interface.encodeFunctionData('bindAssetHash', [address, address])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(admin).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
        // await expect(mintContract.connect(admin).bindAssetHash(address, address))
        //     .to.be.revertedWith('from proxy address are not to be contract address')
    })

    it('the local address must be contract for binding', async () => {
        let transferCalldata = mintContract.interface.encodeFunctionData('bindAssetHash', [erc20Sample1.address, address])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(admin).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
    })

    it('the peer address can be zero', async () => {
        let transferCalldata = mintContract.interface.encodeFunctionData('bindAssetHash', [erc20Sample1.address, zeroAccount])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(admin).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](tx.toBigInt())
        // await mintContract.connect(admin).bindAssetHash(erc20Sample.address, zeroAccount)
    })

    it('amount of burn cannot be zero', async () => {
        await expect(transparentproxied.burn(erc20Sample.address, 0, address))
            .to.be.revertedWith('amount can not be 0')
    })

    it('rebind asset hash', async () => {
        // await expect(mintContract.connect(admin).bindAssetHash(erc20Sample.address, address))
        //     .to.be.revertedWith('can not modify the bind asset')
        let transferCalldata = mintContract.interface.encodeFunctionData('bindAssetHash', [erc20Sample.address, address])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(admin).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await expect(tdao.connect(user)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
    })

    it('the asset contract of burn must be bound', async () => {
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample1.address, 1, 1000000000)
        await expect(transparentproxied.burn(erc20Sample1.address, 2, address))
            .to.be.revertedWith('asset address must has been bound')
    })

    it('the receiver of burn can not be zero', async () => {
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await expect(transparentproxied.burn(erc20Sample1.address, 1, zeroAccount))
            .to.be.revertedWith('Transaction reverted without a reason string')
    })

    it('the owner must grant to mintContract enough allowance', async () => {
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await erc20Sample.connect(deployer).approve(transparentproxy.address, 1)
        await expect(transparentproxied.connect(deployer).burn(erc20Sample.address, 10, address))
            .to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('burn of mintContract success', async () => {
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await erc20Sample.connect(deployer).approve(transparentproxy.address, 1000)
        await transparentproxied.connect(deployer).burn(erc20Sample.address, 10, address)
    })

    it('burn success, the mint asset must be bound', async () => {
        //burn
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        let transferCalldata = mintContract.interface.encodeFunctionData('bindAssetHash', [erc20Sample1.address, zeroAccount])
        let tx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(tx.toBigInt(), 1)
        await tdao.connect(user1).castVote(tx.toBigInt(), 1)
        await tdao.connect(admin).castVote(tx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](tx.toBigInt())
        await expect(tdao.connect(user).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](tx.toBigInt())

        await erc20Sample1.connect(deployer).approve(transparentproxy.address, 1000)
        const txx = await transparentproxied.connect(deployer).burn(erc20Sample1.address, 10, address)
        const rc = await txx.wait()
        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(txx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(txx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await expect(transparentproxied1.connect(user).mint(buffer, 1))
            .to.be.revertedWith('asset address must has been bound')
    })

    it('burn success, the mint proxy must be bound', async () => {
        //burn
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await erc20Sample.connect(deployer).approve(transparentproxy.address, 1000)
        const tx = await transparentproxied.connect(deployer).burn(erc20Sample.address, 10, address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")
        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await expect(transparentproxied2.connect(user).mint(buffer, 1))
            .to.be.revertedWith('proxy is not bound')
    })

    it('burn success, repeat mint', async () => {
        //burn
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await erc20Sample.connect(deployer).approve(transparentproxy.address, 1000)
        const tx = await transparentproxied.connect(deployer).burn(erc20Sample.address, 10, address)
        const rc = await tx.wait()

        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await transparentproxied1.connect(admin).bindWithdrawQuota(erc20Sample1.address, 1000)
        // await mintContract1.connect(admin).bindTransferedQuota(erc20Sample1.address, 1, 1000000000)
        await transparentproxied1.connect(user).mint(buffer, 1)
        await expect(transparentproxied1.connect(user).mint(buffer, 1))
            .to.be.revertedWith('The burn event proof cannot be reused')
    })

    it('burn and mint success', async () => {
        //burn
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await erc20Sample.connect(deployer).approve(transparentproxy.address, 1000)
        const tx = await transparentproxied.connect(deployer).burn(erc20Sample.address, 10, address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await transparentproxied1.connect(admin).bindWithdrawQuota(erc20Sample1.address, 100000000000000)
        // await mintContract1.connect(admin).bindTransferedQuota(erc20Sample1.address, 1, 1000000000)
        await transparentproxied1.connect(user).mint(buffer, 1)

        expect(await erc20Sample1.balanceOf(address))
            .to.equal(10)
    })

    it('burn and mint success1', async () => {
        const ERC20MintCon =  await hre.ethers.getContractFactory("ERC20Mintable", admin, { gasLimit: 9500000 })
        ERC20Mint = await ERC20MintCon.deploy('ERC20Mintable', 'et')
        await ERC20Mint.deployed()
        // ERC20MintCon = await ethers.getContractFactory("ERC20TokenSample18", admin)
        // ERC20Mint = await ERC20MintCon.deploy()
        // console.log("+++++++++++++ERC20Mint Contract+++++++++++++++ ", ERC20Mint.address)
        // await ERC20Mint.deployed()

        //burn
        let transferCalldata = mintContract.interface.encodeFunctionData('bindAssetHash', [erc20Sample1.address, ERC20Mint.address])
        let txxx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(txxx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(txxx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(txxx.toBigInt(), 1)
        await tdao.connect(user1).castVote(txxx.toBigInt(), 1)
        await tdao.connect(admin).castVote(txxx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](txxx.toBigInt())
        await expect(tdao.connect(user).castVote(txxx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](txxx.toBigInt())
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await erc20Sample1.connect(deployer).approve(transparentproxy.address, 1000)
        const tx = await transparentproxied.connect(deployer).burn(erc20Sample1.address, 10, address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        transferCalldata = mintContract1.interface.encodeFunctionData('bindAssetHash', [ERC20Mint.address, erc20Sample1.address])
        txxx = await tdao.connect(user).callStatic["propose(address[],uint256[],bytes[],string)"]([transparentproxy1.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await tdao.connect(user)["propose(address[],uint256[],bytes[],string)"]([transparentproxy1.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
        await expect(tdao.connect(user1).castVote(txxx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await expect(tdao.connect(admin).castVote(txxx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await tdao.connect(user).castVote(txxx.toBigInt(), 1)
        await tdao.connect(user1).castVote(txxx.toBigInt(), 1)
        await tdao.connect(admin).castVote(txxx.toBigInt(), 1)
        await tdao.connect(user)["queue(uint256)"](txxx.toBigInt())
        await expect(tdao.connect(user).castVote(txxx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
        await new Promise(r => setTimeout(r, 1000));
        await tdao.connect(user)["execute(uint256)"](txxx.toBigInt())

        await transparentproxied1.connect(admin).bindWithdrawQuota(ERC20Mint.address, 10000000000000)
        // await mintContract1.connect(admin).bindTransferedQuota(erc20Sample1.address, 1, 1000000000)
        await transparentproxied1.connect(user).mint(buffer, 1)

        expect(await ERC20Mint.balanceOf(address))
            .to.equal(10000000000000)
    })
})

describe("TRC20", function () {
    beforeEach(async function () {
        //准备必要账户
        [deployer, admin, miner, user, user1, redeemaccount] = await hre.ethers.getSigners()
        owner = deployer
        console.log("deployer account:", deployer.address)
        console.log("owner account:", owner.address)
        console.log("admin account:", admin.address)
        console.log("team account:", miner.address)
        console.log("user account:", user.address)
        console.log("redeemaccount account:", redeemaccount.address)

        zeroAccount = "0x0000000000000000000000000000000000000000"

        //deploy ERC20
        erc20SampleCon = await ethers.getContractFactory("ERC20TokenSample", deployer)
        erc20Sample = await erc20SampleCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await erc20Sample.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample.address)

        // deserializeCon = await ethers.getContractFactory("Deserialize");
        // deserialize = await deserializeCon.deploy();
        // await deserialize.deployed();

        //deploy ERC20
        erc20SampleCon1 = await ethers.getContractFactory("ERC20TokenSample", deployer)
        erc20Sample1 = await erc20SampleCon1.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await erc20Sample1.deployed()
        console.log("+++++++++++++Erc20Sample+++++++++++++++ ", erc20Sample1.address)

        //header sync mock
        headerMockCon = await ethers.getContractFactory("HeaderSyncMock", deployer)
        headerMock = await headerMockCon.deploy()
        //erc20Sample = await erc20SampleCon.attach("0xC66AB83418C20A65C3f8e83B3d11c8C3a6097b6F")
        await headerMock.deployed()
        console.log("+++++++++++++HeaderSyncMock+++++++++++++++ ", headerMock.address)

        //deploy prove
		address = "0xa4bA11f3f36b12C71f2AEf775583b306A3cF784a"
        topProveContractCon = await ethers.getContractFactory("EthProver", deployer)

        topProveContract = await topProveContractCon.deploy()
        console.log("+++++++++++++EthProver+++++++++++++++ ", topProveContract.address)
        await topProveContract.deployed()
        await topProveContract._EthProver_initialize(headerMock.address)

        limitCon = await ethers.getContractFactory("Limit", admin)
        limitContract = await limitCon.deploy()
        console.log("+++++++++++++limitContract+++++++++++++++ ", limitContract.address)
        await limitContract.deployed()
        await limitContract._Limit_initialize(admin.address)

        await limitContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)
        await limitContract.connect(admin).bindTransferedQuota(erc20Sample1.address, 1, 1000000000)

        //deploy mint contract
        mintContractCon = await ethers.getContractFactory("ERC20MintProxyTest", {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        mintContract = await mintContractCon.deploy()
        console.log("+++++++++++++mintContract+++++++++++++++ ", mintContract.address)
        await mintContract.deployed()

        //deploy time lock controller
        timelockcontrollerCon = await ethers.getContractFactory("TimeController", deployer)
        timelockcontroller = await timelockcontrollerCon.deploy(1)
        await timelockcontroller.deployed()
        console.log("+++++++++++++timelockcontroller+++++++++++++++ ", timelockcontroller.address)

        //deploy TVotes
        votesCon = await ethers.getContractFactory("ImmutableVotes", deployer)
        votes = await votesCon.deploy([admin.address, user.address, user1.address])
        await votes.deployed()
        console.log("+++++++++++++ImmutableVotes+++++++++++++++ ", votes.address)

        //deploy TDao
        tdaoCon = await ethers.getContractFactory("TDao", deployer)
        tdao = await tdaoCon.deploy(votes.address, 2, 3, 70, timelockcontroller.address, deployer.address, 1,5,1,7)
        await tdao.deployed()
        console.log("+++++++++++++TDao+++++++++++++++ ", tdao.address)

        await timelockcontroller._TimeController_initialize(tdao.address, 1, 100)
    })

    it('burn success, the mint asset must be bound', async () => {
        //deploy TRC20
        TRC20ContractCon1 = await ethers.getContractFactory("TRC20Test",  {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })

        TRC20Contract1 = await TRC20ContractCon1.deploy(topProveContract.address, mintContract.address, erc20Sample1.address, 1, "hhh", "hhh", admin.address, limitContract.address)
        await TRC20Contract1.deployed()
        await TRC20Contract1.connect(admin).adminPause(0)
        // await TRC20Contract1.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)

        await mintContract.initialize(topProveContract.address, TRC20Contract1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [TRC20Contract1.address])
        await mintContract.connect(admin).adminPause(0)
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        //burn
        await erc20Sample.connect(deployer).approve(mintContract.address, 1000)
        const tx = await mintContract.connect(deployer).burn(erc20Sample.address, 1000, address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await expect(TRC20Contract1.connect(user).mint(buffer, 1))
            .to.be.revertedWith('asset address must has been bound')
    })

    it('burn success, the mint proxy must be bound', async () => {
        //burn
        TRC20ContractCon1 = await ethers.getContractFactory("TRC20Test",  {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        TRC20Contract1 = await TRC20ContractCon1.deploy(topProveContract.address, address, erc20Sample.address, 1, "hhh", "hhh", admin.address, limitContract.address)
        await TRC20Contract1.deployed()
        await TRC20Contract1.connect(admin).adminPause(0)
        // await TRC20Contract1.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)

        await mintContract.initialize(topProveContract.address, TRC20Contract1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [TRC20Contract1.address])
        await mintContract.connect(admin).adminPause(0)
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        await erc20Sample.connect(deployer).approve(mintContract.address, 1000)
        const tx = await mintContract.connect(deployer).burn(erc20Sample.address, 10, address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")
        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await expect(TRC20Contract1.connect(user).mint(buffer, 1))
            .to.be.revertedWith('proxy is not bound')
    })

    it('burn success, repeat mint', async () => {
        //burn
        TRC20ContractCon1 = await ethers.getContractFactory("TRC20Test",  {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        TRC20Contract1 = await TRC20ContractCon1.deploy(topProveContract.address, mintContract.address, erc20Sample.address, 1, "hhh", "hhh", admin.address, limitContract.address)
        await TRC20Contract1.deployed()
        await TRC20Contract1.connect(admin).adminPause(0)
        // await TRC20Contract1.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)

        await mintContract.initialize(topProveContract.address, TRC20Contract1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [TRC20Contract1.address])
        await mintContract.connect(admin).adminPause(0)
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        //burn
        await erc20Sample.connect(deployer).approve(mintContract.address, 1000)
        const tx = await mintContract.connect(deployer).burn(erc20Sample.address, 10, user.address)
        const rc = await tx.wait()

        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await TRC20Contract1.connect(user).mint(buffer, 1)
        await expect(TRC20Contract1.connect(user).mint(buffer, 1))
            .to.be.revertedWith('The burn event proof cannot be reused')
    })

    it('burn success, mint success', async () => {
        //burn
        TRC20ContractCon1 = await ethers.getContractFactory("TRC20Test",  {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        TRC20Contract1 = await TRC20ContractCon1.deploy(topProveContract.address, mintContract.address, erc20Sample.address, 1, "hhh", "hhh", admin.address, limitContract.address)
        await TRC20Contract1.deployed()
        await TRC20Contract1.connect(admin).adminPause(0)
        // await TRC20Contract1.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)

        await mintContract.initialize(topProveContract.address, TRC20Contract1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [TRC20Contract1.address])
        await mintContract.connect(admin).adminPause(0)
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        //burn
        await erc20Sample.connect(deployer).approve(mintContract.address, 1000)
        const tx = await mintContract.connect(deployer).burn(erc20Sample.address, 10, user.address)
        const rc = await tx.wait()

        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await TRC20Contract1.connect(user).mint(buffer, 1)
        const ownerBalance = await TRC20Contract1.balanceOf(user.address);
        expect(await TRC20Contract1.totalSupply())
            .to.equal(ownerBalance)
    })
    
    it('burn amount exceeds balance', async () => {
        //burn
        TRC20ContractCon1 = await ethers.getContractFactory("TRC20Test",  {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        TRC20Contract1 = await TRC20ContractCon1.deploy(topProveContract.address, mintContract.address, erc20Sample.address, 1, "hhh", "hhh", admin.address, limitContract.address)
        console.log("+++++++++++++MintContract1+++++++++++++++ ", TRC20Contract1.address)
        await limitContract.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)
        await TRC20Contract1.deployed()
        await TRC20Contract1.connect(admin).adminPause(0)
        // await TRC20Contract1.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)

        await mintContract.initialize(topProveContract.address, TRC20Contract1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [TRC20Contract1.address])
        await mintContract.connect(admin).adminPause(0)
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        //burn
        await erc20Sample.connect(deployer).approve(mintContract.address, 1000)
        const tx = await mintContract.connect(deployer).burn(erc20Sample.address, 10, user.address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);

        //mint
        await TRC20Contract1.connect(user).mint(buffer, 1)
        await expect(TRC20Contract1.connect(deployer).burn(10000, user1.address))
            .to.be.revertedWith('ERC20: burn amount exceeds balance')
    })

    it('burn success', async () => {
        //burn
        TRC20ContractCon1 = await ethers.getContractFactory("TRC20Test",  {
            signer: admin,
            // libraries: {
            //     Deserialize: deserialize.address
            // }
        })
        TRC20Contract1 = await TRC20ContractCon1.deploy(topProveContract.address, mintContract.address, erc20Sample.address, 1, "hhh", "hhh", admin.address, limitContract.address)
        await limitContract.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000)
        console.log("+++++++++++++MintContract1+++++++++++++++ ", TRC20Contract1.address)
        await TRC20Contract1.deployed()
        await TRC20Contract1.connect(admin).adminPause(0)
        // await TRC20Contract1.connect(admin).bindTransferedQuota(TRC20Contract1.address, 1, 1000000000)

        await mintContract.initialize(topProveContract.address, TRC20Contract1.address, 1000, admin.address, limitContract.address, [erc20Sample.address], [TRC20Contract1.address])
        await mintContract.connect(admin).adminPause(0)
        // await mintContract.connect(admin).bindTransferedQuota(erc20Sample.address, 1, 1000000000)

        //burn
        await erc20Sample.connect(deployer).approve(mintContract.address, 1000)
        const tx = await mintContract.connect(deployer).burn(erc20Sample.address, 1000, user.address)
        const rc = await tx.wait()
        const event = rc.events.find(event=>event.event === "Burned")

        // construct receipt proof
        getProof = new GetProof("http://127.0.0.1:8545")
        proof = await getProof.receiptProof(tx.hash)
        rpcInstance = new rpc("http://127.0.0.1:8545")
        const block = await rpcInstance.eth_getBlockByHash(rc.blockHash, false)
        let targetReceipt = await rpcInstance.eth_getTransactionReceipt(tx.hash)
        const re = Receipt.fromRpc(targetReceipt)
        const rlpLog = new LOGRLP(rc.logs[event.logIndex])
        const rlplog = Log.fromRpc(rlpLog)

        const value = new TxProof(event.logIndex, rlplog.buffer, event.transactionIndex, re.buffer, proof.header.buffer, proof.receiptProof)
        const blockHash = keccak256(proof.header.buffer)

        const schema = new Map([[TxProof, {kind: 'struct', fields: [['logIndex', 'u64'], ['logEntryData', ['u8']], ['reciptIndex', 'u64'], ['reciptData', ['u8']], ['headerData', ['u8']], ['proof', [['u8']]]]}]])
        const buffer = borsh.serialize(schema, value);
        
        //mint
        // await limitContract.connect(admin).forbiden(keccak256(Web3EthAbi.encodeParameters(['uint', 'uint'], [block.number, event.transactionIndex])))
        await TRC20Contract1.connect(user).mint(buffer, 1)
        await TRC20Contract1.connect(user).burn(100, user1.address)
        const ownerBalance = await TRC20Contract1.balanceOf(user.address);
        expect(await TRC20Contract1.totalSupply())
            .to.equal(ownerBalance)
    })
})