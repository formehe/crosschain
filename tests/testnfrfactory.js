const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants
const { keccak256 } = require('@ethersproject/keccak256')
const Web3EthAbi = require('web3-eth-abi')
const toWei = ethers.utils.parseEther

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
        await expect(nfrFactoryCon.deploy(erc20TokenSample.address, AddressZero)).
        to.be.revertedWith('invalid address');
        await expect(nfrFactoryCon.deploy(user1.address, erc20TokenSample.address)).
        to.be.revertedWith('invalid address');
        nfrFactory = await nfrFactoryCon.deploy(erc20TokenSample.address, testNFRFactory.address);
        await nfrFactory.deployed();

        await testNFRFactory.initialize(nfrFactory.address)

        //==========================================================
        erc20TokenSampleCon1 = await ethers.getContractFactory("ERC20TokenSample");
        erc20TokenSample1 = await erc20TokenSampleCon1.deploy();
        await erc20TokenSample1.deployed();
    
        console.log("erc20TokenSample "  + erc20TokenSample1.address)
    
        nfrFactoryCon1 = await ethers.getContractFactory("NFRFactory");
        nfrFactory1 = await nfrFactoryCon1.deploy(erc20TokenSample1.address, testNFRFactory.address);
        await nfrFactory1.deployed();
        
        nfrFactoryCon2 = await ethers.getContractFactory("NFRFactory");
        nfrFactory2 = await nfrFactoryCon2.deploy(erc20TokenSample.address, testNFRFactory.address);
        await nfrFactory2.deployed();
    
        console.log("nfrFactory "  + nfrFactory1.address)
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
                }
            }

            await expect(nfrFactory.clone(1, tx.issueInfo, 1, user.address)).
            to.be.revertedWith('caller is not permit')
            await expect(testNFRFactory.clone(3, tx.issueInfo, 1, user.address)).
            to.be.revertedWith('not issue on this chain')
            await testNFRFactory.initialize(nfrFactory1.address)        
            await expect(testNFRFactory.clone(1, tx.issueInfo, 1, user.address)).
            to.be.revertedWith('fail to initialize template code')
            testNFRFactory.initialize(nfrFactory.address)
            
            // await expect(nfrFactory.clone(3, tx.issueInfo, 1, user.address)).
            // to.be.revertedWith('not issue on this chain')
        })
    })
})