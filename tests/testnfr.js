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
        const {testNfrMintCases, testNfrBurnCases} = require('./helpers/testnfrconfig')
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
            name: "test user",
            certification: "test certification",
            agreement: "test agreement",
            uri:"test uri"
        }

        perChain = {
            issuer: admin.address,
            rangeOfRights: [
                {
                    id:0,
                    amount:5
                },
                {
                    id:1,
                    amount:5
                }
            ],
            baseIndexOfToken:1,
            capOfToken:50,
            chainId: 1
        }

        proxyRegistryCon = await ethers.getContractFactory("ProxyRegistry");
        proxyRegistry = await proxyRegistryCon.deploy(deployer.address, deployer.address);
        await proxyRegistry.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry.address)

        await nfrContract.initialize(proxyRegistry.address, "nfr token", "nfr symbol", 100, rightWithIds, issuerInfo, perChain)
    })

    describe('initialize', () => {
        it('initialize', async () => {
            await expect(nfrContract1.initialize(AddressZero, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)).
            to.be.revertedWith('minter can not be 0')
            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 49, rightWithIds, issuerInfo, perChain)).
            to.be.revertedWith('invalid totalAmount')
            let perChain1 = {
                issuer: AddressZero,
                rangeOfRights: [
                    {
                        id:0,
                        amount:5
                    },
                    {
                        id:1,
                        amount:5
                    }
                ],
                baseIndexOfToken:1,
                capOfToken:50,
                chainId: 1
            }
            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain1)).
            to.be.revertedWith('invalid owner')
            perChain1 = {
                issuer: admin.address,
                rangeOfRights: [
                    {
                        id:0,
                        amount:5
                    },
                    {
                        id:2,
                        amount:5
                    }
                ],
                baseIndexOfToken:1,
                capOfToken:50,
                chainId: 1
            }
            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain1)).
            to.be.revertedWith('invalid right')

            perChain1 = {
                issuer: admin.address,
                rangeOfRights: [
                    {
                        id:0,
                        amount:5
                    },
                    {
                        id:1,
                        amount:5
                    }
                ],
                baseIndexOfToken:0,
                capOfToken:50,
                chainId: 1
            }
            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain1)).
            to.be.revertedWith('minId can not be 0')

            rightWithIds1 = [
                {
                    id: 0,
                    totalAmount: 50,
                    right : {
                        name: "",
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
            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds1, issuerInfo, perChain)).
            to.be.revertedWith('right name can not be zero')
            await nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)
            await expect(nfrContract1.initialize(miner.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)).
            to.be.revertedWith('Initializable: contract is already initialized')
        })
    })

    describe('mint', () => {
        it('mint ', async () => {
            for (i in testNfrMintCases) {
                if (testNfrMintCases[i].expect.length != 0) {
                    await expect(nfrContract.connect(testNfrMintCases[i].caller).mint(testNfrMintCases[i].tokenId, testNfrMintCases[i].rightKinds, testNfrMintCases[i].rightAmounts, '0x1111', testNfrMintCases[i].owner.address))
                    .to.be.revertedWith(testNfrMintCases[i].expect)   
                } else {
                    await nfrContract.connect(testNfrMintCases[i].caller).mint(testNfrMintCases[i].tokenId, testNfrMintCases[i].rightKinds, testNfrMintCases[i].rightAmounts, '0x1111', testNfrMintCases[i].owner.address)
                }
            }
        })

        // it('mint only for minter', async () => {
        //     await expect(nfrContract.connect(miner).mint(51, [0,1], [1,1], '0x1111', user.address))
        //     .to.be.revertedWith('only for minter')
        // })

        // it('mint token id overflow', async () => {
        //     await expect(nfrContract.mint(101, [0,1], [1,1], '0x1111', user.address))
        //     .to.be.revertedWith('ERC721: token id is overflow')
        // })

        // it('mint token id downflow', async () => {
        //     await expect(nfrContract.mint(0, [0,1], [1,1], '0x1111', user.address))
        //     .to.be.revertedWith('token id can not be 0')
        // })

        // it('mint right of token id is not exist', async () => {
        //     await expect(nfrContract.mint(51, [0,2], [1,1], '0x1111', user.address))
        //     .to.be.revertedWith('right kind is not exist')
        // })

        // it('mint quality of right is overflow', async () => {
        //     await expect(nfrContract.mint(51, [0,1], [50,101], '0x1111', user.address))
        //     .to.be.revertedWith('only for minter')
        // })

        // it('mint success', async () => {
        //     await nfrContract.mint(100, [0,1], [1,1], '0x1111', user.address)
        // })

        it('burn and mint', async () => {
            await expect(nfrContract.mint(1, [0,1], [1,1], '0x1111', AddressZero)).
            to.be.revertedWith('ERC721: mint to the zero address')
            await nfrContract.connect(admin).burn(1)
            await nfrContract.mint(1, [0,1], [1,1], '0x1111', user.address)
            await expect(nfrContract.mint(1, [0,1], [1,1], '0x1111', user.address)).
            to.be.revertedWith('ERC721: token already minted')
        })
    })

    describe('burn token', () => {
        it('burn token', async () => {
            for (i in testNfrBurnCases) {
                if (testNfrBurnCases[i].expect.length != 0) {
                    await expect(nfrContract.connect(testNfrBurnCases[i].caller).burn(testNfrBurnCases[i].tokenId))
                    .to.be.revertedWith(testNfrBurnCases[i].expect)   
                } else {
                    await nfrContract.connect(testNfrBurnCases[i].caller).burn(testNfrBurnCases[i].tokenId)
                }
            }
        })
        

        // it('burn token success', async () => {
        //     await nfrContract.connect(admin).burn(1)
        // })

        // it('not approve', async () => {
        //     await expect(nfrContract.burn(1)).
        //     to.be.revertedWith('caller is not owner nor approved')
        // })

        // it('burn token id is overflow', async () => {
        //     await expect(nfrContract.burn(51)).
        //     to.be.revertedWith('ERC721: operator query for nonexistent token')
        // })

        // it('burn token id is downflow', async () => {
        //     await expect(nfrContract.burn(0)).
        //     to.be.revertedWith('ERC721: operator query for nonexistent token')
        // })

        it('approve and burn token success', async () => {
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).burn(1)

            await nfrContract.connect(admin).attachAdditional(2, "0x1111")
            await nfrContract.connect(admin).approve(user1.address, 2)
            await nfrContract.connect(user1).burn(2)

            await nfrContract.mint(51, [0,1], [1,1], '0x1111', admin.address)
            await nfrContract.connect(admin).approve(user1.address, 51)
            await nfrContract.connect(user1).burn(51)
        })

        it('repeat burn', async () => {
            await nfrContract.connect(admin).approve(user1.address, 50)
            await nfrContract.connect(user1).burn(50)
            await expect(nfrContract.connect(user1).burn(50)).
            to.be.revertedWith('ERC721: operator query for nonexistent token')
        })
    })

    describe('attach token additional', () => {
        it('repeat attach', async () => {
            await nfrContract.connect(admin).attachAdditional(1, "0x1111")
            await expect(nfrContract.connect(admin).attachAdditional(1, "0x1111")).
            to.be.revertedWith('additional of token has been bound')
        })

        it('not approver', async () => {
            await expect(nfrContract.connect(user).attachAdditional(1, "0x1111")).
            to.be.revertedWith('not owner or approver')
        })

        it('not issuer', async () => {
            await nfrContract.mint(100, [0,1], [1,1], '0x1111', user.address)
            await expect(nfrContract.connect(user).attachAdditional(100, "0x1111")).
            to.be.revertedWith('only issuer can add additional of token')
        })

        it('token id is not exist', async () => {
            await expect(nfrContract.connect(user).attachAdditional(51, "0x1111")).
            to.be.revertedWith('ERC721: owner query for nonexistent token on this chain')
            await expect(nfrContract.connect(user).attachAdditional(0, "0x1111")).
            to.be.revertedWith('invalid token id')
        })

        it('invalid parameter', async () => {
            await expect(nfrContract.connect(admin).attachAdditional(1, "0x")).to.be.revertedWith('invalid parameter')
        })

        it('approver', async () => {
            await nfrContract.connect(admin).approve(user.address, 1)
            await nfrContract.connect(user).attachAdditional(1, "0x1111")
        })

        it('attach success', async () => {
            await nfrContract.connect(admin).attachAdditional(1, "0x1111")
        })
    })

    describe('safe transfer token', () => {
        it('safe transfer token', async () => {
            await nfrContract.connect(admin).attachRight(1,0)
            await expect(nfrContract.connect(user)["safeTransferFrom(address,address,uint256)"](admin.address, user.address, 1)).
            to.be.revertedWith('ERC721: transfer caller is not owner nor approved')
            await expect(nfrContract.connect(admin)["safeTransferFrom(address,address,uint256)"](admin.address, nfrContract.address, 1)).
            to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer')

            callbackFunCon = await ethers.getContractFactory("TestCallBackUser");
            callbackFun = await callbackFunCon.deploy(nfrContract.address);
            await callbackFun.deployed();
    
            await expect(nfrContract.connect(admin)["safeTransferFrom(address,address,uint256)"](admin.address, callbackFun.address, 1)).
            to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer')
            await nfrContract.connect(admin)["safeTransferFrom(address,address,uint256)"](admin.address, user.address, 1)
        })
    })

    describe('balance Of', () => {
        it('ERC721: balance query for the zero address', async () => {
            await expect(nfrContract.connect(admin).balanceOf(AddressZero)).
            to.be.revertedWith('missing revert data')
        })

        it('balance Of success', async () => {
            expect(await nfrContract.balanceOf(admin.address)).to.equal(50)
            expect(await nfrContract.balanceOf(user1.address)).to.equal(0)
            await nfrContract.connect(admin).transferFrom(admin.address, user1.address, 1)
            expect(await nfrContract.balanceOf(admin.address)).to.equal(49)
            expect(await nfrContract.balanceOf(user1.address)).to.equal(1)
        })
    })

    describe('owner Of', () => {
        it('invalid token id', async () => {
            await expect(nfrContract.connect(admin).ownerOf(0)).
            to.be.revertedWith('missing revert data')
            await expect(nfrContract.connect(admin).ownerOf(1000)).
            to.be.revertedWith('missing revert data')
        })

        it('own Of success', async () => {
            expect(await nfrContract.ownerOf(1)).to.equal(admin.address)
            await nfrContract.connect(admin).transferFrom(admin.address, user1.address, 1)
            expect(await nfrContract.ownerOf(1)).to.equal(user1.address)
        })
    })

    describe('tokenURI', () => {
        it('invalid token id', async () => {
            await expect(nfrContract.tokenURI(10000)).
            to.be.revertedWith('missing revert data')
        })

        it('tokenURI success', async () => {
            expect(await nfrContract.tokenURI(1)).to.equal('test uri1')
            await nfrContract.connect(admin).transferFrom(admin.address, user1.address, 1)
            expect(await nfrContract.tokenURI(1)).to.equal('test uri1')
        })
    })

    describe('getApproved', () => {
        it('invalid token id', async () => {
            await expect(nfrContract.getApproved(10000)).
            to.be.revertedWith('missing revert data')
        })

        it('getApproved success', async () => {
            await nfrContract.connect(admin).approve(user1.address, 1)
            expect(await nfrContract.getApproved(1)).to.equal(user1.address)
            await nfrContract.connect(admin).transferFrom(admin.address, user1.address, 1)
            expect(await nfrContract.getApproved(1)).to.equal(AddressZero)
        })
    })

    describe('approve', () => {
        it('approval to current owner', async () => {
            await expect(nfrContract.approve(admin.address, 1)).
            to.be.revertedWith('ERC721: approval to current owner')
        })

        it('approve caller is not owner', async () => {
            await expect(nfrContract.approve(user1.address, 1)).
            to.be.revertedWith('ERC721: approve caller is not owner nor approved for all')
        })

        it('approved success', async () => {
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(admin).approve(user1.address, 1)
        })
    })

    describe('attach token right', () => {
        it('token is not approved', async () => {
            await nfrContract.connect(admin).transferFrom(admin.address, user.address, 1)
            await expect(nfrContract.connect(user).attachRight(1,0)).
            to.be.revertedWith('only issuer can attach right of token')

            await expect(nfrContract.connect(admin).attachRight(1,0)).
            to.be.revertedWith('only issuer can attach right of token')
            
            await expect(nfrContract.attachRight(2, 0)).
            to.be.revertedWith('not owner or approver')
        })

        it('not token owner attach token id and right', async () => {
            await expect(nfrContract.connect(user).attachRight(1, 0)).
            to.be.revertedWith('not owner or approver')
        })

        it('not token issuer attach token id and right', async () => {
            await nfrContract.mint(100, [0,1], [1,1], '0x1111', user.address)
            await expect(nfrContract.attachRight(100, 0)).
            to.be.revertedWith('only issuer can attach right of token')
        })

        it('token owner attach token id and right', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(1, 1)
        })

        it('right is not exist', async () => {
            await expect(nfrContract.connect(admin).attachRight(1, 2)).
            to.be.revertedWith('right kind is not exist')
        })

        it('right id is overflow', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(1, 0)
            await expect(nfrContract.connect(admin).attachRight(1, 0)).
            to.be.revertedWith('no right')
        })

        it('attach for approve', async () => {
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).attachRight(1, 0)
            await expect(nfrContract.connect(user1).attachRight(1, 0)).
            to.be.revertedWith('not owner or approver')
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).attachRight(1, 0)
        })

        it('attach burned token', async () => {
            await nfrContract.connect(admin).burn(1)
            await expect(nfrContract.connect(admin).attachRight(1, 0)).
            to.be.revertedWith('ERC721: owner query for nonexistent token')
        })
    })

    describe('burn right', () => {
        it('has no right', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await expect(nfrContract.burnRights(1, 0)).
            to.be.revertedWith('caller is not owner nor approved')
            await expect(nfrContract.connect(user1).burnRights(1,2)).
            to.be.revertedWith('has no right')
            await expect(nfrContract.connect(user1).burnRights(1,1)).
            to.be.revertedWith('has no right')
        })
        
        it('burn right of none exist token', async () => {
            await expect(nfrContract.connect(user1).burnRights(51,0)).
            to.be.revertedWith('ERC721: operator query for nonexistent token')
        })

        it('burn right success', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).burnRights(1,0)
        })

        it('burn right overflow', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await nfrContract.connect(user1).burnRights(1,0)
            await expect(nfrContract.connect(user1).burnRights(1,0)).
            to.be.revertedWith('caller is not owner nor approved')
            await nfrContract.connect(admin).approve(user1.address, 1)
            await expect(nfrContract.connect(user1).burnRights(1,0)).
            to.be.revertedWith('has no right')
        })

        it('burn not attach right of token', async () => {
            await nfrContract.connect(admin).attachRight(2, 0)
            await nfrContract.connect(admin).approve(user1.address, 1)
            await expect(nfrContract.connect(user1).burnRights(1,0)).
            to.be.revertedWith('has no right')
        })
    })

    describe('transfer right', () => {
        it('transfer right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(2, 1)
            await nfrContract.connect(admin).transferRights(1, 2, 0)
            await expect(nfrContract.connect(user1).transferRights(1, 2, 0)).
            to.be.revertedWith('caller is not owner nor approved')
            await expect(nfrContract.connect(admin).transferRights(2, 51, 1)).
            to.be.revertedWith('to token is not exist')
            await nfrContract.mint(51, [], [], '0x1111', user1.address)
            await expect(nfrContract.connect(user1).transferRights(51, 1, 0)).
            to.be.revertedWith('has no right')
            await expect(nfrContract.connect(admin).transferRights(2, 2, 1)).
            to.be.revertedWith('from token and to token can not equal')
        })

        it('burn transfer-out right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(2, 1)
            await nfrContract.connect(admin).transferRights(1, 2, 0)
            await expect(nfrContract.connect(admin).burnRights(1, 0)).
            to.be.revertedWith('has no right')
        })

        it('burn transfered in right of token', async () => {
            await nfrContract.connect(admin).attachRight(1, 0)
            await nfrContract.connect(admin).attachRight(2, 1)
            await nfrContract.connect(admin).transferRights(1, 2, 0)
            await nfrContract.connect(admin).burnRights(2, 0)
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
            name: "test user",
            certification: "test certification",
            agreement: "test agreement",
            uri:"test uri"
        }

        perChain = {
            issuer: admin.address,
            rangeOfRights: [
                {
                    id:0,
                    amount:50
                },
                {
                    id:1,
                    amount:50
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

        proxyRegistryCon = await ethers.getContractFactory("ProxyRegistry");
        proxyRegistry = await proxyRegistryCon.deploy(deployer.address, deployer.address);
        await proxyRegistry.deployed();
    
        console.log("proxyRegistry "  + proxyRegistry.address)	

        await nfrContract.initialize(proxyRegistry.address, "nfr token", "nfr symbol", 50, rightWithIds, issuerInfo, perChain)
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
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri: "test uri"
            }
    
            perChain1 = {
                issuer: admin.address,
                rangeOfRights: [
                    {
                        id:0,
                        amount:50
                    },
                    {
                        id:2,
                        amount:50
                    }
                ],
                baseIndexOfToken:1,
                capOfToken:50,
                chainId: 1
            }

            await expect(nfrContract1.initialize(proxyRegistry.address, "nfr token", "nfr symbol", 50, rightWithIds1, issuerInfo1, perChain1))
            .to.be.revertedWith('invalid right')
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
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            }
    
            perChain1 = {
                issuer: admin.address,
                rangeOfRights: [
                    {
                        id:0,                        
                        amount:50
                    },
                    {
                        id:2,
                        amount:50
                    }
                ],
                baseIndexOfToken:1,
                capOfToken:50,
                chainId: 1
            }

            // await nfrContract.connect(miner).initialize(51, [0,1], [1,1], '0x1111', user.address)

            await expect(nfrContract1.initialize(proxyRegistry.address, "nfr token", "nfr symbol", 50, rightWithIds1, issuerInfo1, perChain1))
            .to.be.revertedWith('invalid right')
        })
    })
})