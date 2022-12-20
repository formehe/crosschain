const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants
const { keccak256 } = require('@ethersproject/keccak256')
const Web3EthAbi = require('web3-eth-abi')
const toWei = ethers.utils.parseEther
const { MaxUint256  } = require("ethers").constants

describe('NFRFactory', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+deployer.address)
        console.log("wallet2 "+admin.address)
        console.log("wallet3 "+miner.address)

        const {issueInfos} = require('./helpers/testnfrfactoryconfig')

        issueCoderCon = await ethers.getContractFactory("testIssueCoder");
        issueCoder = await issueCoderCon.deploy();
        await issueCoder.deployed();
    
        console.log("testIssueCoder "  + issueCoder.address)
    
        erc20TokenSampleCon = await ethers.getContractFactory("ERCTemplate");
        erc20TokenSample = await erc20TokenSampleCon.deploy();
        await erc20TokenSample.deployed();
    
        console.log("erc20TokenSample "  + erc20TokenSample.address)

        testNFRFactoryCon = await ethers.getContractFactory("TestNFRFactory");
        testNFRFactory = await testNFRFactoryCon.deploy();
        await testNFRFactory.deployed();
        console.log("testNFRFactory "  + testNFRFactory.address)
    
        nfrFactoryCon = await ethers.getContractFactory("NFRFactory");
        await expect(nfrFactoryCon.deploy(user.address, testNFRFactory.address)).
        to.be.revertedWith('invalid address');
        await expect(nfrFactoryCon.deploy(AddressZero, testNFRFactory.address)).
        to.be.revertedWith('invalid address');
        await expect(nfrFactoryCon.deploy(erc20TokenSample.address, user.address)).
        to.be.revertedWith('invalid address');
        await expect(nfrFactoryCon.deploy(erc20TokenSample.address, AddressZero)).
        to.be.revertedWith('invalid address');
        nfrFactory = await nfrFactoryCon.deploy(erc20TokenSample.address, testNFRFactory.address);
        await nfrFactory.deployed();

        await testNFRFactory.initialize(nfrFactory.address)

        //==========================================================
        erc20TokenSampleCon1 = await ethers.getContractFactory("ERC20TokenSample");
        erc20TokenSample1 = await erc20TokenSampleCon1.deploy();
        await erc20TokenSample1.deployed();
    
        console.log("erc20TokenSample "  + erc20TokenSample1.address)
    
        nfrFactory1 = await nfrFactoryCon.deploy(erc20TokenSample1.address, testNFRFactory.address);
        await nfrFactory1.deployed();
        console.log("nfrFactory1"  + nfrFactory1.address)

        nfrFactory2 = await nfrFactoryCon.deploy(erc20TokenSample.address, testNFRFactory.address);
        await nfrFactory2.deployed();
        console.log("nfrFactory2"  + nfrFactory2.address)
    })

    describe('issue', () => {
        it('issue', async () => {
            let bytesOfIssue
            let tx
            for (i in issueInfos) {
                bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfos[i].content)
                if (issueInfos[i].expect .length != 0) {
                    await expect(testNFRFactory.issue(bytesOfIssue)).to.be.revertedWith(issueInfos[i].expect)
                } else {
                    tx = await testNFRFactory.callStatic.issue(bytesOfIssue)
                    //await testNFRFactory.clone(1, tx.issueInfo, 0, user.address)
                }
            }

            await expect(nfrFactory.clone(1, tx.issueInfo, 1, user.address)).
            to.be.revertedWith('caller is not permit')

            await expect(testNFRFactory.clone(3, tx.issueInfo, 1, user.address)).
            to.be.revertedWith('not issue on this chain')
            await testNFRFactory.clone(0, tx.issueInfo, 0, user.address)
            await testNFRFactory.clone(1, tx.issueInfo, 0, user.address)
            await testNFRFactory.clone(MaxUint256, tx.issueInfo, 0, user.address)
            await testNFRFactory.clone(MaxUint256.sub(1), tx.issueInfo, 0, user.address)
            
            await testNFRFactory.clone(1, tx.issueInfo, 1, user.address)
            await testNFRFactory.clone(1, tx.issueInfo, MaxUint256, user.address)
            await testNFRFactory.clone(1, tx.issueInfo, MaxUint256.sub(1), user.address)

            await testNFRFactory.clone(1, tx.issueInfo, 1, nfrFactory.address)
            await expect(testNFRFactory.clone(1, tx.issueInfo, 1, AddressZero)).to.be.revertedWith('fail to initialize template code')

            await testNFRFactory.initialize(nfrFactory1.address)
            await expect(testNFRFactory.clone(1, tx.issueInfo, 1, user.address)).
            to.be.revertedWith('fail to initialize template code')
            await testNFRFactory.initialize(nfrFactory.address)
        })

        it('expand', async () => {
            let bytesOfIssue
            let tx1
            for (i in issueInfos) {
                bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfos[i].content)
                if (issueInfos[i].expect .length == 0) {
                    tx1 = await testNFRFactory.callStatic.issue(bytesOfIssue)
                }
            }
            
            let tx = await testNFRFactory.clone(1, tx1.issueInfo, 1, user.address)
            let rc = await tx.wait()
            templateAddr = "0x"+ (rc.events[50].topics[3]).substring(26)
            await expect(testNFRFactory.expand(testNFRFactory.address, 1, admin.address)).
            to.be.revertedWith('rights interface is not exist')

            await expect(testNFRFactory.expand(AddressZero, 1, admin.address)).
            to.be.revertedWith('Transaction reverted without a reason string')
            await expect(testNFRFactory.expand(user.address, 1, admin.address)).
            to.be.revertedWith('Transaction reverted without a reason string')

            await testNFRFactory.expand(templateAddr, 0, admin.address)
            await testNFRFactory.expand(templateAddr, 1, admin.address)
            await testNFRFactory.expand(templateAddr, 1, AddressZero)
            await testNFRFactory.expand(templateAddr, 1, testNFRFactory.address)
            await testNFRFactory.expand(templateAddr, MaxUint256, AddressZero)
            await testNFRFactory.expand(templateAddr, MaxUint256.sub(1), AddressZero)
        })

        it('construct', async () => {
            let bytesOfIssue
            let tx1
            for (i in issueInfos) {
                bytesOfIssue = await issueCoder.callStatic.encodeIssueInfo(issueInfos[i].content)
                if (issueInfos[i].expect.length == 0) {
                    tx1 = await testNFRFactory.callStatic.issue(bytesOfIssue)
                }
            }
            
            let tx = await testNFRFactory.clone(1, tx1.issueInfo, 1, user.address)
            let rc = await tx.wait()
            templateAddr = "0x"+ (rc.events[50].topics[3]).substring(26)

            erc20TokenSample = await erc20TokenSampleCon.attach(templateAddr)
            tx1 = await erc20TokenSample.connect(miner).callStatic.burn(55)
            let abiOfBurn = Web3EthAbi.encodeParameters(['uint256[]', 'uint256[]', 'bytes'], [tx1.rightKinds_, tx1.rightQuantities_, tx1.additional_])
            burnInfo = await nfrFactory.callStatic.constructBurn(abiOfBurn, user.address, 55)
            mintInfo = await nfrFactory.callStatic.constructMint(burnInfo)
        })
    })
})