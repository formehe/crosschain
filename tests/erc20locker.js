const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 9500000 }

describe('ERC20Locker', () => {

  let wallet, wallet2,wallet3
  let erc20Token,erc20Token2
  
  let erc20Locker
  
  let prover,bridge,limit

  beforeEach(async () => {
    [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
    provider = hardhat.ethers.provider

    deserializeCon = await ethers.getContractFactory("Deserialize");
    deserialize = await deserializeCon.deploy();
    await deserialize.deployed();

    const Erc20token =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token = await Erc20token.deploy('ERC20Mintable', 'et')

    const Erc20token2 =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token2 = await Erc20token2.deploy('ERC20Mintable2', 'et2')

    const Erc20LockerResult =  await hre.ethers.getContractFactory("Erc20LockerTest", {
      gasLimit: 9500000,
      signer: wallet,
      // libraries: {
      //   Deserialize:deserialize.address
      // }
    })
    erc20Locker = await Erc20LockerResult.deploy()

    // const TopBridge = await hre.artifacts.readArtifact("TopBridge", {
    //   libraries: {
    //     Deserialize:deserialize.address
    //   }
    // })

    const TopBridge = await hre.artifacts.readArtifact("TopBridge")
    bridge = await deployMockContract(wallet, TopBridge.abi, overrides)

    const TopProver = await hre.ethers.getContractFactory("TopProver", wallet, overrides)
    prover = await TopProver.deploy()
    await prover._TopProver_initialize(bridge.address)
    await expect(prover._TopProver_initialize(bridge.address)).to.be.revertedWith("Initializable: contract is already initialized")

    const Limit = await hre.ethers.getContractFactory("Limit", wallet, overrides)
    limit = await Limit.deploy()

    await limit._Limit_initialize(wallet.address)

    console.log("wallet>>>> "  + wallet.address)
    console.log("wallet2>>>> "  + wallet2.address)

    console.log("erc20Token>>>> "  + erc20Token.address)
    console.log("erc20Token2>>>> "  + erc20Token2.address)
    console.log("erc20Locker>>>> "  + erc20Locker.address)

    console.log("prover>>>> "  + prover.address)
    console.log("bridge>>>> "  + bridge.address)
    console.log("Limit>>>> "  + limit.address)

    //deploy time lock controller
    timelockcontrollerCon = await ethers.getContractFactory("TimeController", wallet)
    timelockcontroller = await timelockcontrollerCon.deploy(1)
    await timelockcontroller.deployed()
    console.log("+++++++++++++timelockcontroller+++++++++++++++ ", timelockcontroller.address)

    //deploy TVotes
    votesCon = await ethers.getContractFactory("ImmutableVotes", wallet)
    votes = await votesCon.deploy([wallet.address, wallet2.address, wallet3.address])
    await votes.deployed()
    console.log("+++++++++++++ImmutableVotes+++++++++++++++ ", votes.address)

    //deploy TDao
    tdaoCon = await ethers.getContractFactory("TDao", wallet)
    tdao = await tdaoCon.deploy(votes.address, 2, 3, 70, timelockcontroller.address, wallet2.address, 1,5,1,7)
    await tdao.deployed()
    console.log("+++++++++++++TDao+++++++++++++++ ", tdao.address)

    await erc20Locker._ERC20Locker_initialize(prover.address, 0, wallet.address, limit.address, erc20Token2.address, [erc20Token.address, "0xb997a782f36256355206d928aAA217058d07A7a2"], [erc20Token2.address, "0x5A29872525901E632CBfd0c4671263AF2ca52b25"])

    await timelockcontroller._TimeController_initialize(tdao.address, 1, 100)

    await erc20Locker.connect(wallet).grantRole("0xba89994fffa21b6259d0e98b52260f21bc06a07249825a4125b51c20e48d06ff", timelockcontroller.address)
    await erc20Locker.adminPause(0)
  })

  //bindAssetHash
  describe('bindAssetHash', () => {
    it('It has permissions', async () => {
      let transferCalldata = erc20Locker.interface.encodeFunctionData('bindAssetHash', [timelockcontroller.address, limit.address])
      let tx = await tdao.connect(wallet).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
      await tdao.connect(wallet)["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await expect(tdao.connect(wallet2).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await tdao.connect(wallet2).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet3).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet2)["queue(uint256)"](tx.toBigInt())
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await new Promise(r => setTimeout(r, 1000));
      await tdao.connect(wallet)["execute(uint256)"](tx.toBigInt())

      transferCalldata = erc20Locker.interface.encodeFunctionData('bindAssetHash', [timelockcontroller.address, limit.address])
      tx = await tdao.connect(wallet).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #2: Give grant to team")
      await tdao.connect(wallet)["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #2: Give grant to team")
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await expect(tdao.connect(wallet2).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await tdao.connect(wallet2).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet3).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet2)["queue(uint256)"](tx.toBigInt())
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await new Promise(r => setTimeout(r, 1000));
      await expect(tdao.connect(wallet)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
      // // await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address);
    })

    it('It has no permissions', async () => {
      let msg = 'AccessControl: account ' + wallet2.address.toLowerCase() + ' is missing role 0xba89994fffa21b6259d0e98b52260f21bc06a07249825a4125b51c20e48d06ff'
      await expect(erc20Locker.connect(wallet2).bindAssetHash(erc20Token.address, erc20Token2.address)
      ).to.be.revertedWith(msg)
    })

    it('It is bind empty address', async () => {
      let transferCalldata = erc20Locker.interface.encodeFunctionData('bindAssetHash', [AddressZero, limit.address])
      let tx = await tdao.connect(wallet).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
      await tdao.connect(wallet)["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await expect(tdao.connect(wallet2).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await tdao.connect(wallet2).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet3).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet2)["queue(uint256)"](tx.toBigInt())
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await new Promise(r => setTimeout(r, 1000));
      await expect(tdao.connect(wallet)["execute(uint256)"](tx.toBigInt())).to.be.revertedWith("TimelockController: underlying transaction reverted")
    })
  })

  //lockToken
  describe('lockToken', () => {
    it('no have bind token', async () => {
      await limit.bindTransferedQuota(erc20Token2.address, toWei('10'), toWei('400'))
      await erc20Locker.adminPause(0)
      await expect(erc20Locker.lockToken(erc20Token2.address, toWei('100'), wallet3.address)).to.be.revertedWith('empty illegal toAssetHash')
    })

    it('have bind token but without balance', async () => {
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await erc20Locker.adminPause(0)
      await expect(erc20Locker.lockToken(erc20Token.address, toWei('100'), wallet3.address)).to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('without approve', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('pause and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.adminPause(255)
      expect(await erc20Locker.paused()).to.equal(255);

      await erc20Locker.revokeRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)
      expect(await erc20Locker.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)).to.equal(false);
    
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('no permit')

    })

    it('pause and have permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

    })
    
    it('pause and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.grantRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet.address)
        
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('no permit')

    })

    it('modify owner role', async () => {
      await erc20Locker.grantRole('0xa8a2e59f1084c6f79901039dbbd994963a70b36ee6aff99b7e17b2ef4f0e395c',wallet.address)
      try {
        result = await erc20Locker.grantRole('0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6',wallet.address)
      } catch (error) {
        expect(
          error.message.indexOf('missing role') > -1
        ).to.equal(true)
      }
      // .to.be.revertedWith('missing role')
    })
    
    it('settings can pass and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))

      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.revokeRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)
      expect(await erc20Locker.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)).to.equal(false);
      
      erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

    })

    it('settings can pass and have permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

      expect(await erc20Token.balanceOf(erc20Locker.address)).to.equal(toWei('100'));

    })

    // it('There is no set lock amount limit', async () => {
    //   await erc20Token.mint(wallet.address,toWei('200'))
    //   await erc20Token.mint(wallet3.address,toWei('200'))

    //   expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
    //   await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

    //   await erc20Token.approve(erc20Locker.address,toWei('200'))
    
    //   await erc20Locker.adminPause(0)

    //   expect(await erc20Locker.paused()).to.equal(0);

    //   await expect(erc20Locker.lockToken(erc20Token.address,toWei('50'),wallet3.address)).to.be.revertedWith('quota is not exist')

    // })

    // it('Minimum lock amount limit', async () => {

    //   await erc20Token.mint(wallet.address,toWei('200'))
    //   await erc20Token.mint(wallet3.address,toWei('200'))

    //   expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
    //   await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

    //   await erc20Token.approve(erc20Locker.address,toWei('200'))
    
    //   await erc20Locker.adminPause(0)

    //   expect(await erc20Locker.paused()).to.equal(0);

    //   await limit.bindTransferedQuota(erc20Token.address,toWei('100'),toWei('400'))

    //   await expect(erc20Locker.lockToken(erc20Token.address,toWei('50'),wallet3.address)).to.be.revertedWith('amount of token is underflow')

    // })

    // it('Maximum lock amount limit', async () => {

    //   await erc20Token.mint(wallet.address,toWei('200'))
    //   await erc20Token.mint(wallet3.address,toWei('200'))

    //   expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
    //   await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

    //   await erc20Token.approve(erc20Locker.address,toWei('200'))
    
    //   await erc20Locker.adminPause(0)

    //   expect(await erc20Locker.paused()).to.equal(0);

    //   await limit.bindTransferedQuota(erc20Token.address,toWei('100'),toWei('150'))

    //   await expect(erc20Locker.lockToken(erc20Token.address,toWei('180'),wallet3.address)).to.be.revertedWith('amount of token is overflow')

    // })

    it('account set blacklist', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await limit.bindTransferedQuota(erc20Token.address,toWei('100'),toWei('400'))

      await erc20Locker.grantRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet2.address)
      expect(await erc20Locker.hasRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet2.address)).to.equal(true);
      await expect(erc20Locker.connect(wallet2).lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('no permit')

    })
   })


   //lockToken
  describe('lockToken', () => {
    it('Set the precision to convert it to an integer', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      
      //emit Locked(fromAssetHash, toAssetHash, msg.sender, eventAmount, receiver)
      decimal = await erc20Token.decimals()
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.emit(erc20Locker,'Locked')
      .withArgs(erc20Token.address, erc20Token2.address,wallet.address,toWei('100'),wallet3.address, decimal)
      expect(await erc20Token.balanceOf(erc20Locker.address)).to.equal(toWei('100'));

    })

    it('Set the precision to convert it to a decimal', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))
      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await limit.bindTransferedQuota(erc20Token.address,toWei('0'),toWei('400'))
      
      //emit Locked(fromAssetHash, toAssetHash, msg.sender, eventAmount, receiver)
      decimal = await erc20Token.decimals()
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('1.1234567891'),wallet3.address)).to.emit(erc20Locker,'Locked')
      .withArgs(erc20Token.address, erc20Token2.address,wallet.address,toWei('1.1234567891'),wallet3.address, decimal)

      expect(await erc20Token.balanceOf(wallet.address)).to.equal(toWei('198.8765432109'));
      expect(await erc20Token.balanceOf(erc20Locker.address)).to.equal(toWei('1.1234567891'));


    })
   })
 
   //unlockToken
   //test1
   /**
    * erc20
      +++++++++++++ERC20TokenSample+++++++++++++++  0x717395aA760819A4EF9023bB4ca0c73f6C886c4f
      +++++++++++++ERC20Locker+++++++++++++++  0xB596a8BFbB0f52b5355b20Eb32051E69b5195AC3
      +++++++++++++LimitResult+++++++++++++++  0x45a70Ef72c6CB42E8159114Db65c049165091fdb
      +++++++++++++TopBridge+++++++++++++++  0x3DB1a16518b9cd4e7E8128C5B5684bE433e5fbde
      +++++++++++++TopProver+++++++++++++++  0xb7EC0276Bd7eaC4B93E45FaA852729327468E57E

      top
      +++++++++++++ERC20TokenSample+++++++++++++++  0xA3F5a3af9Fd0243c54a263C2ACB4B400673Ea7c6
      +++++++++++++ERC20Locker+++++++++++++++  0x242dFD130f39268F8b1b5Dc760406a4Cf90b1b73
      +++++++++++++LimitResult+++++++++++++++  0x465370F902bAe111204D56F5bDb825369b6b0Ba4
      +++++++++++++TopProver+++++++++++++++  0xB5E47E0D05f249db17B9e26e854F2349695656A5
      burn proof 0x0100000000000000df000000f8dd94242dfd130f39268f8b1b5dc760406a4cf90b1b73f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000a3f5a3af9fd0243c54a263c2acb4b400673ea7c6a0000000000000000000000000717395aa760819a4ef9023bb4ca0c73f6c886c4fa00000000000000000000000001ba30ee006f456615044415c5c84b2fd430525e2b840000000000000000000000000000000000000000000000000000000000bebc2000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d0dbb9010000000000000400008000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000200000000000000000000001000000000000000008000000000000000000008000000000000000000800000001020000000000000000000800000000000008000000000010000000000000000000800000000000000000800000000000000000000000000000000008000000000000000000000000000000000000000000000000800400000000000000000003000000000000000000000000000008000000000000000000000020000000000000000000000000000000000000100000000000000000000000000020f9017cf89b94a3f5a3af9fd0243c54a263c2acb4b400673ea7c6f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000001ba30ee006f456615044415c5c84b2fd430525e2a00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000bebc200f8dd94242dfd130f39268f8b1b5dc760406a4cf90b1b73f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000a3f5a3af9fd0243c54a263c2acb4b400673ea7c6a0000000000000000000000000717395aa760819a4ef9023bb4ca0c73f6c886c4fa00000000000000000000000001ba30ee006f456615044415c5c84b2fd430525e2b840000000000000000000000000000000000000000000000000000000000bebc2000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a4e0f8462bd045ba014c8e3a89c62b9cf69d66479bcc0a35452ebf33b83b3ee020cf7585965167c92a0f3317b97799e8ba0be6cb4ef34217949ea4c9aafa84d51eb42d066496eaebb4da00000000000000000000000000000000000000000000000000000000000000000a07d4100be49a9c62236193f41bfcbc0e3338295be7e84e038b732be7aa440be6ec0f901b4f84601f843a01bf2dfafca69535970e88d6394eb6277bb222dd633954b7f7a33f9a3ce217d6da070fc959c973320183385cda94638fdeb57061823bca66de0d34b7a506c643f7d80f84601f843a0c739ed6bb257820ec8ee127b3ded5b2ed2de37b20d98e780873c2ad31333f963a02ba8eb3846660d204b9cbb858e9e4ce9b5b46f7dbc3746d1bd8dad229ca53a2180c180f84601f843a076af34067a65b50954a8eda97c69c7ce4c3ba9294961f154a0e4c7e32c1d55a8a0245b69089d9c96637c0fcbd7fb8530bee74dbf539ed3062f3501cd9baa6a031801c180f84601f843a0f1b3d8be0e2c1eeef87f1908b5068a37d9fe3a26abc9c0542ce733e11b074992a069fab8baae3986b296b58bb9f875a3f0a4242a9cb5113f2d819ebb170aba0b3f01f84601f843a0c1d1c87720785177e8c5929994f5ba9c03a471b1e3aa3e433fe968cbbf012746a036fffc34e1c61681da50fe91fa3e87b7a33d340a5aedd5a14dea22217cc9f4b880f84601f843a02cd6ffd6b43a5c64e4eb34b6f475642a00642378e8be55beae296d0702b2b2a3a029161e5cfa18b5290dc96a32fd859155bdc8d2448a495bd6076f1a96db1d1054010100000093020000f90290822080b9028a02f902860182d0dbb9010000000000000400008000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000200000000000000000000001000000000000000008000000000000000000008000000000000000000800000001020000000000000000000800000000000008000000000010000000000000000000800000000000000000800000000000000000000000000000000008000000000000000000000000000000000000000000000000800400000000000000000003000000000000000000000000000008000000000000000000000020000000000000000000000000000000000000100000000000000000000000000020f9017cf89b94a3f5a3af9fd0243c54a263c2acb4b400673ea7c6f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000001ba30ee006f456615044415c5c84b2fd430525e2a00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000bebc200f8dd94242dfd130f39268f8b1b5dc760406a4cf90b1b73f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000a3f5a3af9fd0243c54a263c2acb4b400673ea7c6a0000000000000000000000000717395aa760819a4ef9023bb4ca0c73f6c886c4fa00000000000000000000000001ba30ee006f456615044415c5c84b2fd430525e2b840000000000000000000000000000000000000000000000000000000000bebc2000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b00
    * 
    * 
    * 
    */

  describe('unlockToken', () => {
    // it('proxy is not bound', async () => {
    //   await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
    //   await erc20Token.approve(erc20Locker.address,toWei('200'))
    //   await erc20Locker.adminPause(0)
    //   await expect(erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b00000000000000008a02000002f902860182d0b0b9010000000000000000000000000000000000000000000000000000000000000000000000000000001000000000800000000000000000000010000000000000000000000000102000000000000008000000000000000000008000000000000000000000000000020000000000000080000808000000000000000000000010000000000000000000000000000440000000000000000000000000000000000000000000002000000000000000000008000000000020000000000000000000000000000000000002000000000000000000800800000008800000000000000000000020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b9484cccaba72f7daf8c5ad88c3a8e4a8ea3185369cf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1ba00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000186a0f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b4e02000000f9024ab86f00f86c820466158462ce92faa04f55b8a2c7d3d3c524f474b272c78a0ecade82512dd7fbe5be10d58dcd055d4ba0b4d45e986fb132883f397172c71a2544053b0c02d3453a685e15744324bdbf0ca00000000000000000000000000000000000000000000000000000000000000000a03d09a9decdbfcf379018f2c7085027a9c5cc55e5418cc80db8cbd716618d0d83c0f901b4f84601f843a065d9c29094cda5f4e579b3afe271b3d0e2cbeefb7d9ffd55a8ed9c290fbe35a5a057e9d728cf3f3e2be04b1f229d4738ea9ec584c8358fe89029e0f01d02c1a4ff80c180f84601f843a00ae5c205d3613a02176aae416168b6a0217fe3bf0d53caa7a5dff8324757c7f9a05e43f34446edd7862452e71f3eb7f4376b2dc1cb9eb515acf4c5c66244fb422b80f84601f843a0e2dd8a0b26a79dbd7385feac55e340cc2ee9b3e155733f61b8d0f29a36b66b0ba032b67f2a5232fc053057e878b9fd95d3f8a0518d9275ba993516306fe3070f6601f84601f843a056878fbefff1728c310284ad6293a04ad66bcdb4d7727801fac33d8f3313384ea062d4defb75a15cc1df55c49354c072c9727fb6328ef1c5b34528ebadfb4809c980f84601f843a04c21b9d7f30c497ba5ab9c031b7a2b05a6003a4d369b3e48b0aaee4db6b497f4a0131d78cfa9e71a40930a56b93cf4a8ec1e46b12e04ac0745500441ea855b591101f84601f843a0fbf24ba973fddc77c750af2404f5b10859f56df3c8e2049efa714a3270551a81a04e7a9e2dff73c6ec9c038d2533b738e6052261273b357156c81bb3423cde6f7701c1800100000093020000f90290822080b9028a02f902860182d0b0b9010000000000000000000000000000000000000000000000000000000000000000000000000000001000000000800000000000000000000010000000000000000000000000102000000000000008000000000000000000008000000000000000000000000000020000000000000080000808000000000000000000000010000000000000000000000000000440000000000000000000000000000000000000000000002000000000000000000008000000000020000000000000000000000000000000000002000000000000000000800800000008800000000000000000000020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b9484cccaba72f7daf8c5ad88c3a8e4a8ea3185369cf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1ba00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000186a0f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b1400000000000000880400000000000003000000b3000000f8b1a0767d882e816fcccd646a7503fe74bb00e3c8a9b0532ca6c5df5ba564d58b3867a0ac5eccb67f573d59cda9d886c68f58da85ec875cd430fb3f964b455e71734bc7a0320d061fc57a10b3258a415973124cc1c647186a8713325317e71c4244269469a036de099799d6c1d3c2e640f2f6812a5a4e2a377b2043052cdb1990774498e87080808080a08d21fb133dc7426f24eb2537663db37ae078dfddb590fd40b833a5f8c1538dfc808080808080808014020000f90211a038720e0c008fe567669b6cabe7c8c037d112616c1d21fb587f895ecedb4aeae2a080d845b1f1d19cea0cc050a6bd17317fbc097d34188e0c2f4abbee9c3271e90aa046686eb6d466d037ae5f80549993e64cd3b9fa4e062cd74266ac626499f8ce1fa07af8361e02082f5e27982cbfd712be29a8d453d41e6f6ece71c8b33a4bc96518a0b187fccbf3c1d6de06c70231891fc30de9da18d14ed760f6d33805a1845ea759a0223959349899b618a07058d265e727f8df0c4f65b615037c3c28eccfeb91e0f4a093f7ed75cc75efccf50d00c000c6203b49c8284dfd1db28a95d38fe93099b087a0d0ae9f10b8ae72bbcb73ebefcf77ed312945045e96dc63df39532867c3903e23a0839fff0f9d340619460e3870feb92e7c5b9dd71eb8c125c42c90150f6d1e0683a09b73e50a78695d9d20f0d80f138fc3a3c5c175ab0b030cc46241dc9953e6b468a06a917bcfbd1998ebf23e287a584bbaa20280fcfda9f74c88dd6179bf8af2c803a0cf6f3cf0039720593ccbaa2181d6f6337e3d5fe9939ccc025a2c0b79c1b894caa0541b87044bf4ae1b7a40413b8fc8930762c7290c32de603585c1a8c11f9e5819a00332168b4e46280b24bd4d31d44e1735b3c904a5f107cab0c6a20ababd01c5a6a0ce276f3ad8ee607022ef6e1082b036cb1b9027598072c6e55425771ffda1120fa0cf9d1822561e5739bf0d537105405badb6dcaaf06c5c9cd49e16099dfeec02c28023000000e220a03c40acf657ea10ed386d6a7068f15d7d428b75482e2f22df6ed0c713ca076d6e',0)).to.be.revertedWith('proxy is not bound')
    // })

    it('withdraw quota is not bind', async () => {
      // await erc20Locker.bindAssetHash('0xb997a782f36256355206d928aAA217058d07A7a2','0x5A29872525901E632CBfd0c4671263AF2ca52b25','0xE29C68247a43B402e3d2b95F122c9a1f2E1e86A4');
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.adminPause(0)
      //blockHashes(bytes32)
      await bridge.mock.blockMerkleRoots.withArgs(275).returns('0xc76d68b4b9aefd69d08b5a937859625c165bb4e8d57c862f956fe9867b8a50a9')
      await bridge.mock.blockHeights.withArgs(275).returns(1)
      //todo
      //await expect(erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed',0))
      //.to.be.revertedWith("withdraw quota is not bound")
    })

    it('withdraw quota is not enough', async () => {
      // await erc20Locker.bindAssetHash('0xb997a782f36256355206d928aAA217058d07A7a2','0x5A29872525901E632CBfd0c4671263AF2ca52b25','0xE29C68247a43B402e3d2b95F122c9a1f2E1e86A4');
      await erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 1)
      await expect(erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 1)).to.be.revertedWith("not modify the quota of withdraw")
      await expect(erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 2)).to.be.revertedWith("Only dao admin can expand the quota of withdraw")
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.adminPause(0)
      //blockHashes(bytes32)
      await bridge.mock.blockMerkleRoots.withArgs(275).returns('0xc76d68b4b9aefd69d08b5a937859625c165bb4e8d57c862f956fe9867b8a50a9')
      await bridge.mock.blockHeights.withArgs(275).returns(1)
      //todo
      //await expect(erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed',0))
      //.to.be.revertedWith("withdraw quota is not enough")

      let transferCalldata = erc20Locker.interface.encodeFunctionData('bindWithdrawQuota', ['0xb997a782f36256355206d928aAA217058d07A7a2', 2])
      let tx = await tdao.connect(wallet).callStatic["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
      await tdao.connect(wallet)["propose(address[],uint256[],bytes[],string)"]([erc20Locker.address], [0], [transferCalldata], "Proposal #1: Give grant to team")
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await expect(tdao.connect(wallet2).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await tdao.connect(wallet2).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet3).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet).castVote(tx.toBigInt(), 1)
      await tdao.connect(wallet2)["queue(uint256)"](tx.toBigInt())
      await expect(tdao.connect(wallet3).castVote(tx.toBigInt(), 1)).to.be.revertedWith("Governor: vote not currently active")
      await new Promise(r => setTimeout(r, 1000));
      await tdao.connect(wallet)["execute(uint256)"](tx.toBigInt())
      await erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 1)
    })

    it('unlockToken success', async () => {
      // await erc20Locker.bindAssetHash('0xb997a782f36256355206d928aAA217058d07A7a2','0x5A29872525901E632CBfd0c4671263AF2ca52b25','0xE29C68247a43B402e3d2b95F122c9a1f2E1e86A4');
      // await erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 500000000)
      await erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 500)
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.adminPause(0)
      //blockHashes(bytes32)
      await bridge.mock.blockMerkleRoots.withArgs(275).returns('0xc76d68b4b9aefd69d08b5a937859625c165bb4e8d57c862f956fe9867b8a50a9')
      await bridge.mock.blockHeights.withArgs(275).returns(1)
      //todo
      //await erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed',0)
    })

    // it('unlockToken success', async () => {
    //   await erc20Locker.bindAssetHash('0xb997a782f36256355206d928aAA217058d07A7a2','0x5A29872525901E632CBfd0c4671263AF2ca52b25','0xE29C68247a43B402e3d2b95F122c9a1f2E1e86A4');
    //   await erc20Locker.bindWithdrawQuota('0xb997a782f36256355206d928aAA217058d07A7a2', 1200000000)
    //   await erc20Token.approve(erc20Locker.address,toWei('200'))
    //   await erc20Locker.adminPause(0)
    //   //blockHashes(bytes32)
    //   await bridge.mock.blockMerkleRoots.withArgs(275).returns('0xc76d68b4b9aefd69d08b5a937859625c165bb4e8d57c862f956fe9867b8a50a9')
    //   await bridge.mock.blockHeights.withArgs(275).returns(1)
    //   await erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed',0)
    //   await erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed',0)
    //   const sleep = ms => new Promise(res => setTimeout(res, ms));
    //   await sleep(6000);
    //   await erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed',0)
    // })
  })
  
})