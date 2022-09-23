const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const borsh = require("borsh")

const buffer = require('safe-buffer').Buffer;
const rpc = require('isomorphic-rpc')
const { RobustWeb3, JSONreplacer } = require('rainbow-bridge-utils')

const { GetAndVerify, GetProof, VerifyProof } = require('eth-proof')
const {rlp,bufArrToArr} = require('ethereumjs-util')
const { keccak256 } = require('@ethersproject/keccak256')
const { Account, Header, Log, Proof, Receipt, Transaction } = require("eth-object")
const Web3EthAbi = require('web3-eth-abi')

const toWei = ethers.utils.parseEther

describe('ERC3721', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+ deployer.address)
        console.log("wallet2 "+ admin.address)
        console.log("wallet3 "+ miner.address)

        nfrCon = await ethers.getContractFactory("ERCTemplate");
        nfrContract = await nfrCon.deploy();
        await nfrContract.deployed();

        nfrCon1 = await ethers.getContractFactory("ERCTemplate");
        nfrContract1 = await nfrCon1.deploy();
        await nfrContract1.deployed();

        rightWithIds = [
            {
                id: 0,
                totalAmount: 50,
                right : {
                    name: "testRight1",
                    uri: "uri of testRight1",
                    agreement: "agreement of testRight1"
                }
            },
            {
                id: 1,
                totalAmount: 100,
                right : {
                    name: "testRight2",
                    uri: "uri of testRight2",
                    agreement: "agreement of testRight2"
                }
            }
        ]

        issuerInfo = {
            name: "forme",
            certification: "test certification",
            agreement: "test agreement",
            uri:"test uri"
        }

        perChain = {
            issuer: admin.address,
            rangeOfRights: [
                {
                    id:0,
                    baseIndex: 1,
                    cap:50
                },
                {
                    id:1,
                    baseIndex: 50,
                    cap:50
                }
            ],
            baseIndexOfToken:1,
            capOfToken:50,
            chainId: 1
        }

        await nfrContract.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)
    })

    describe('initialize', () => {
        it('initialize', async () => {
            await nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)
        })
    })

    describe('mint', () => {
        it('mint only for minter', async () => {
            await expect(nfrContract.mint(51, [0,1], [1,1], '0x1111', user.address))
            .to.be.revertedWith('only for minter')
        })

        it('burn and mint', async () => {
            await expect(nfrContract.connect(miner).mint(51, [0,1], [1,1], '0x1111', user.address)).to.be.revertedWith('ERC721: token id is overflow')
            await nfrContract.connect(admin).burn(1)
            await nfrContract.connect(miner).mint(1, [0,1], [1,1], '0x1111', user.address)
        })
    })

    describe('burn token', () => {
        it('burn token success', async () => {
            await nfrContract.connect(admin).burn(1)
        })

        it('burn token success', async () => {
            await expect(nfrContract.burn(1)).
            to.be.revertedWith('caller is not owner nor approved')
        })

        it('approve and burn token success', async () => {
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).burn(1)
        })
    })

    describe('attach token', () => {
        it('token is not approved', async () => {
            await expect(nfrContract.attachRight(1, 0, 1)).
            to.be.revertedWith('not owner or approver')
        })

        it('token owner attach token id and right', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await nfrContract.connect(admin).attachRight(1, 1, 50)
        })

        it('right is not exist', async () => {
            await expect(nfrContract.connect(admin).attachRight(1, 2, 1)).
            to.be.revertedWith('right kind is not exist')
        })

        it('right id is overflow', async () => {
            await expect(nfrContract.connect(admin).attachRight(1, 1, 49)).
            to.be.revertedWith('token right id is out of range')
            await expect(nfrContract.connect(admin).attachRight(1, 0, 51)).
            to.be.revertedWith('right id is overflow')
        })

        it('reapt attach', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await expect(nfrContract.connect(admin).attachRight(1, 0, 1)).
            to.be.revertedWith('token right has been bound')
        })

        it('attach for approve', async () => {
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).attachRight(1, 0, 1)
        })

        it('attach used right', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await expect(nfrContract.connect(admin).attachRight(2, 0, 1)).
            to.be.revertedWith('token right has been bound')
        })

        it('attach burned token', async () => {
            await nfrContract.connect(admin).burn(1)
            await expect(nfrContract.connect(admin).attachRight(1, 0, 1)).
            to.be.revertedWith('ERC721: owner query for nonexistent token')
        })
    })

    describe('transfer token', () => {
        it('transfer token', async () => {
            await nfrContract.connect(admin).attachRight(1,0,1)
            await nfrContract.connect(admin).transferFrom(admin.address, user1.address, 1)
        })

        it('approve transfered token', async () => {
            await nfrContract.connect(admin).attachRight(1,0,1)
            await nfrContract.connect(admin).transferFrom(admin.address, user1.address, 1)
            await expect(nfrContract.connect(admin).approve(user1.address, 1)).
            to.be.revertedWith('ERC721: approval to current owner')
        })

        it('approve transfer token', async () => {
            await nfrContract.connect(admin).attachRight(1,0,1)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).transferFrom(admin.address, user1.address, 1)
        })

        it('not approve user to transfer token', async () => {
            await nfrContract.connect(admin).attachRight(1,0,1)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await expect(nfrContract.connect(user).transferFrom(admin.address, user1.address, 1)).
            to.be.revertedWith('ERC721: transfer caller is not owner nor approved')
        })

        it('burn transfered token', async () => {
            await nfrContract.connect(admin).attachRight(1,0,1)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).transferFrom(admin.address, user1.address, 1)
            await expect(nfrContract.connect(user).burnRight(1, 0, 1)).
            to.be.revertedWith('caller is not owner nor approved')
            await expect(nfrContract.connect(admin).burnRight(1, 0, 1)).
            to.be.revertedWith('caller is not owner nor approved')
            await nfrContract.connect(user1).burnRight(1, 0, 1)
        })
    })

    describe('burn right', () => {
        it('burn right success', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).burnRight(1,0,1)
        })

        it('burn not attach right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await nfrContract.connect(admin).attachRight(2, 0, 2)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await expect(nfrContract.connect(user1).burnRight(1,0,2)).
            to.be.revertedWith('right has not been bound')
        })
    })

    describe('transfer right', () => {
        it('transfer right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await nfrContract.connect(admin).attachRight(2, 1, 51)
            await nfrContract.connect(admin).transferRight(1, 2, 0, 1, '0x0111')
        })

        it('burn transfer-out right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await nfrContract.connect(admin).attachRight(2, 1, 51)
            await nfrContract.connect(admin).transferRight(1, 2, 0, 1, '0x0111')
            await expect(nfrContract.connect(admin).burnRight(1, 0, 1)).
            to.be.revertedWith('right has not been bound')
        })

        it('burn transfered in right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0, 1)
            await nfrContract.connect(admin).attachRight(2, 1, 51)
            await nfrContract.connect(admin).transferRight(1, 2, 0, 1, '0x0111')
            await nfrContract.connect(admin).burnRight(2, 0, 1)
        })
    })
})

describe('Right', () => {
    beforeEach(async () => {
        [deployer, admin, miner, user, user1, redeemaccount] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+ deployer.address)
        console.log("wallet2 "+ admin.address)
        console.log("wallet3 "+ miner.address)

        rightWithIds = [
            {
                id: 0,
                totalAmount: 50,
                right : {
                    name: "testRight1",
                    uri: "uri of testRight1",
                    agreement: "agreement of testRight1"
                }
            },
            {
                id: 1,
                totalAmount: 100,
                right : {
                    name: "testRight2",
                    uri: "uri of testRight2",
                    agreement: "agreement of testRight2"
                }
            }
        ]

        issuerInfo = {
            name: "forme",
            certification: "test certification",
            agreement: "test agreement",
            uri:"test uri"
        }

        perChain = {
            issuer: admin.address,
            rangeOfRights: [
                {
                    id:0,
                    baseIndex: 1,
                    cap:50
                },
                {
                    id:1,
                    baseIndex: 50,
                    cap:50
                }
            ],
            baseIndexOfToken:1,
            capOfToken:50,
            chainId: 1
        }

        nfrCon = await ethers.getContractFactory("ERCTemplate");
        nfrContract = await nfrCon.deploy();
        await nfrContract.deployed();

        nfrCon1 = await ethers.getContractFactory("ERCTemplate");
        nfrContract1 = await nfrCon1.deploy();
        await nfrContract1.deployed();

        await nfrContract.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)
    })

    describe('initialize', () => {
        it('right id cannot be 0', async () => {
            rightWithIds1 = [
                {
                    id: 0,
                    totalAmount: 50,
                    right : {
                        name: "testRight1",
                        uri: "uri of testRight1",
                        agreement: "agreement of testRight1"
                    }
                },
                {
                    id: 1,
                    totalAmount: 100,
                    right : {
                        name: "testRight2",
                        uri: "uri of testRight2",
                        agreement: "agreement of testRight2"
                    }
                }
            ]
    
            issuerInfo1 = {
                name: "forme",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            }
    
            perChain1 = {
                issuer: admin.address,
                rangeOfRights: [
                    {
                        id:0,
                        baseIndex: 0,
                        cap:50
                    },
                    {
                        id:2,
                        baseIndex: 50,
                        cap:50
                    }
                ],
                baseIndexOfToken:0,
                capOfToken:50,
                chainId: 1
            }

            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds1, issuerInfo1, perChain1))
            .to.be.revertedWith('right id cannot be 0')
        })

        it('right id is not exist', async () => {
            rightWithIds1 = [
                {
                    id: 0,
                    totalAmount: 50,
                    right : {
                        name: "testRight1",
                        uri: "uri of testRight1",
                        agreement: "agreement of testRight1"
                    }
                },
                {
                    id: 1,
                    totalAmount: 100,
                    right : {
                        name: "testRight2",
                        uri: "uri of testRight2",
                        agreement: "agreement of testRight2"
                    }
                }
            ]
    
            issuerInfo1 = {
                name: "forme",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            }
    
            perChain1 = {
                issuer: admin.address,
                rangeOfRights: [
                    {
                        id:0,
                        baseIndex: 1,
                        cap:50
                    },
                    {
                        id:2,
                        baseIndex: 50,
                        cap:50
                    }
                ],
                baseIndexOfToken:1,
                capOfToken:50,
                chainId: 1
            }

            // await nfrContract.connect(miner).initialize(51, [0,1], [1,1], '0x1111', user.address)

            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds1, issuerInfo1, perChain1))
            .to.be.revertedWith('invalid right')
        })
    })

    describe('mint', () => {
        it('mint right cannot be 0', async () => {
            await nfrContract.connect(admin).burn(50)
            await expect(nfrContract.connect(miner).mint(50, [0,1], [0,1], '0x1111', user.address))
            .to.be.revertedWith('rightId can not be 0')
            await expect(nfrContract.connect(miner).mint(50, [0,1], [51,1], '0x1111', user.address))
            .to.be.revertedWith('right id is overflow')
        })

        it('mint right is not exist', async () => {
            await nfrContract.connect(admin).burn(50)
            await expect(nfrContract.connect(miner).mint(50, [0,2], [1,1], '0x1111', user.address))
            .to.be.revertedWith('right kind is not exist')
        })
    })
})