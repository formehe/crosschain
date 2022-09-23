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

describe('EthProver', () => {
    let wallet, wallet2,wallet3
    beforeEach(async () => {
        [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+wallet.address)
        console.log("wallet2 "+wallet2.address)
        console.log("wallet3 "+wallet3.address)
    })

    describe('', () => {
        it('', async () => {
        })
    })
})

describe('TopProver', () => {
    let wallet, wallet2,wallet3
    beforeEach(async () => {
        [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
        provider = hardhat.ethers.provider
        console.log("wallet "+wallet.address)
        console.log("wallet2 "+wallet2.address)
        console.log("wallet3 "+wallet3.address)
    })
    
    describe('', () => {
        it('', async () => {
        })
    })
})