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

    const Erc20token =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token = await Erc20token.deploy('ERC20Mintable', 'et')

    const Erc20token2 =  await hre.ethers.getContractFactory("ERC20Mintable", wallet, overrides)
    erc20Token2 = await Erc20token2.deploy('ERC20Mintable2', 'et2')

    const Erc20LockerResult =  await hre.ethers.getContractFactory("Erc20LockerTest", wallet, overrides)
    erc20Locker = await Erc20LockerResult.deploy()

    const TopBridge = await hre.artifacts.readArtifact("TopBridge")
    bridge = await deployMockContract(wallet, TopBridge.abi, overrides)

    const TopProver = await hre.ethers.getContractFactory("TopProver", wallet, overrides)
    prover = await TopProver.deploy(bridge.address)

    const Limit = await hre.ethers.getContractFactory("Limit", wallet, overrides)
    limit = await Limit.deploy()

    console.log("wallet>>>> "  + wallet.address)
    console.log("wallet2>>>> "  + wallet2.address)

    console.log("erc20Token>>>> "  + erc20Token.address)
    console.log("erc20Token2>>>> "  + erc20Token2.address)
    console.log("erc20Locker>>>> "  + erc20Locker.address)

    console.log("prover>>>> "  + prover.address)
    console.log("bridge>>>> "  + bridge.address)
    console.log("Limit>>>> "  + limit.address)

    await erc20Locker._ERC20Locker_initialize(prover.address,0,wallet.address,limit.address)

  })

  //bindAssetHash
  describe('bindAssetHash', () => {
    it('It has permissions', async () => {
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
    })

    it('It has no permissions', async () => {
      let msg = 'AccessControl: account ' + wallet2.address.toLowerCase() + ' is missing role 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6'
      await expect(erc20Locker.connect(wallet2).bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address)
      ).to.be.revertedWith(msg)
    })

    it('It is bind empty address', async () => {
      await expect(erc20Locker.bindAssetHash(AddressZero, erc20Token2.address,erc20Token2.address)).to.be.revertedWith('both asset addresses are not to be 0')

    })
  })

  //lockToken
  describe('lockToken', () => {
    it('no have bind token', async () => {
      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('empty illegal toAssetHash')
    })

    it('have bind token but without balance', async () => {
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('ERC20: insufficient allowance')

    })

    it('without approve', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('ERC20: insufficient allowance')
    })

    it('pause and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.adminPause(255)
      expect(await erc20Locker.paused()).to.equal(255);

      await erc20Locker.revokeRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)
      expect(await erc20Locker.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)).to.equal(false);
    
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('has been pause')

    })

    it('pause and have permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

    })
    
    it('pause and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))
    
      await erc20Locker.revokeRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)
      expect(await erc20Locker.hasRole('0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de',wallet.address)).to.equal(false);
     
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('has been pause')

    })
    
    it('settings can pass and have no permissions', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

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
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      await erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)

      expect(await erc20Token.balanceOf(erc20Locker.address)).to.equal(toWei('100'));

    })

    it('There is no set lock amount limit', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

      await erc20Token.approve(erc20Locker.address,toWei('200'))
    
      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      await expect(erc20Locker.lockToken(erc20Token.address,toWei('50'),wallet3.address)).to.be.revertedWith('quota is not exist')

    })

    it('Minimum lock amount limit', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

      await erc20Token.approve(erc20Locker.address,toWei('200'))
    
      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      await limit.bindTransferedQuota(erc20Token.address,toWei('100'),toWei('400'))

      await expect(erc20Locker.lockToken(erc20Token.address,toWei('50'),wallet3.address)).to.be.revertedWith('amount of token is underflow')

    })

    it('Maximum lock amount limit', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);

      await erc20Token.approve(erc20Locker.address,toWei('200'))
    
      await erc20Locker.adminPause(0)

      expect(await erc20Locker.paused()).to.equal(0);

      await limit.bindTransferedQuota(erc20Token.address,toWei('100'),toWei('150'))

      await expect(erc20Locker.lockToken(erc20Token.address,toWei('180'),wallet3.address)).to.be.revertedWith('amount of token is overflow')

    })

    it('account set blacklist', async () => {

      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await limit.bindTransferedQuota(erc20Token.address,toWei('100'),toWei('400'))

      await erc20Locker.grantRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet2.address)
      expect(await erc20Locker.hasRole('0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4',wallet2.address)).to.equal(true);
      await expect(erc20Locker.connect(wallet2).lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.be.revertedWith('has been pause')

    })
   })

   //setConversionDecimalsAssets
  describe('setConversionDecimalsAssets', () => {
    it('It is the owner', async () => {
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)
      let conversionDecimalsAssets = await erc20Locker.conversionDecimalsAssets(erc20Token.address);
      console.log("conversionDecimalsAssets>>>> "  + conversionDecimalsAssets)
      expect(conversionDecimalsAssets.fromDecimals).to.equal(18);
      expect(conversionDecimalsAssets.toDecimals).to.equal(6);
    })

    it('It is not the owner', async () => {
      let msg = 'AccessControl: account ' + wallet2.address.toLowerCase() + ' is missing role 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6'
      await expect(erc20Locker.connect(wallet2).setConversionDecimalsAssets(erc20Token.address,6))
      .to.be.revertedWith(msg)
    })

    it('The accuracy of to is greater than that of FROM', async () => {
      await expect(erc20Locker.setConversionDecimalsAssets(erc20Token.address,20))
      .to.be.revertedWith('invalid the decimals')
          
      })

    it('The accuracy of to is equal to that of FROM', async () => {
        await expect(erc20Locker.setConversionDecimalsAssets(erc20Token.address,18))
        .to.be.revertedWith('invalid the decimals')
            
    })  
        
    it('The accuracy of to is 0', async () => {
      await expect(erc20Locker.setConversionDecimalsAssets(erc20Token.address,0))
      .to.be.revertedWith('invalid the decimals')
          
    })

    it('The accuracy of to is greater than 256', async () => {
      try{
        await expect(erc20Locker.setConversionDecimalsAssets(erc20Token.address,1000))
        .to.be.revertedWith('value out-of-bounds')
      }catch{}
    })
  })
    
  //conversionFromAssetAmount
  describe('conversionFromAssetAmount', () => {
    it('The normal conversion is lock', async () => {
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)
      let returenAmounts = await erc20Locker.conversionFromAssetAmountTest2(erc20Token.address,toWei('100'),true)
      expect(returenAmounts[0]).to.equal(toWei('100'));
      expect(returenAmounts[1]).to.equal(toWei('0.0000000001'));

    })

    it('The normal conversion not is lock', async () => {
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)
      let returenAmounts = await erc20Locker.conversionFromAssetAmountTest2(erc20Token.address,toWei('0.0000000001'),false)
      expect(returenAmounts[0]).to.equal(toWei('100'));
      expect(returenAmounts[1]).to.equal(toWei('0.0000000001'));

    })

    it('Invalid the conversionAmount', async () => {
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)
      await expect(erc20Locker.conversionFromAssetAmountTest1(erc20Token.address,1,true))
      .to.be.revertedWith('invalid the conversionAmount')

    })

    it('Invalid the conversionAmount', async () => {
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)
      await expect(erc20Locker.conversionFromAssetAmountTest1(erc20Token.address,toWei('0.00000001'),true))
      .to.be.revertedWith('invalid the conversionAmount')

    })

  })

   //lockToken
  describe('lockToken', () => {
    it('Set the precision to convert it to an integer', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))

      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));

      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await limit.bindTransferedQuota(erc20Token.address,toWei('10'),toWei('400'))
      
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)

      let conversionDecimalsAssets = await erc20Locker.conversionDecimalsAssets(erc20Token.address);

      expect(conversionDecimalsAssets.fromDecimals).to.equal(18);
      expect(conversionDecimalsAssets.toDecimals).to.equal(6);
      //emit Locked(fromAssetHash, toAssetHash, msg.sender, eventAmount, receiver)
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('100'),wallet3.address)).to.emit(erc20Locker,'Locked')
      .withArgs(erc20Token.address, erc20Token2.address,wallet.address,toWei('0.0000000001'),wallet3.address)
      expect(await erc20Token.balanceOf(erc20Locker.address)).to.equal(toWei('100'));

    })

    it('Set the precision to convert it to a decimal', async () => {
      await erc20Token.mint(wallet.address,toWei('200'))
      await erc20Token.mint(wallet3.address,toWei('200'))
      expect(await erc20Token.balanceOf(wallet3.address)).to.equal(toWei('200'));
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))

      await limit.bindTransferedQuota(erc20Token.address,toWei('0'),toWei('400'))
      
      await erc20Locker.setConversionDecimalsAssets(erc20Token.address,6)

      let conversionDecimalsAssets = await erc20Locker.conversionDecimalsAssets(erc20Token.address);

      expect(conversionDecimalsAssets.fromDecimals).to.equal(18);
      expect(conversionDecimalsAssets.toDecimals).to.equal(6);
      //emit Locked(fromAssetHash, toAssetHash, msg.sender, eventAmount, receiver)
      await expect(erc20Locker.lockToken(erc20Token.address,toWei('1.1234567891'),wallet3.address)).to.emit(erc20Locker,'Locked')
      .withArgs(erc20Token.address, erc20Token2.address,wallet.address,1123456,wallet3.address)

      expect(await erc20Token.balanceOf(wallet.address)).to.equal(toWei('198.876544'));
      expect(await erc20Token.balanceOf(erc20Locker.address)).to.equal(toWei('1.123456'));


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
    it('proxy is not bound', async () => {
      await erc20Locker.bindAssetHash(erc20Token.address, erc20Token2.address,erc20Token2.address);
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.adminPause(0)
      await expect(erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b00000000000000008a02000002f902860182d0b0b9010000000000000000000000000000000000000000000000000000000000000000000000000000001000000000800000000000000000000010000000000000000000000000102000000000000008000000000000000000008000000000000000000000000000020000000000000080000808000000000000000000000010000000000000000000000000000440000000000000000000000000000000000000000000002000000000000000000008000000000020000000000000000000000000000000000002000000000000000000800800000008800000000000000000000020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b9484cccaba72f7daf8c5ad88c3a8e4a8ea3185369cf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1ba00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000186a0f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b4e02000000f9024ab86f00f86c820466158462ce92faa04f55b8a2c7d3d3c524f474b272c78a0ecade82512dd7fbe5be10d58dcd055d4ba0b4d45e986fb132883f397172c71a2544053b0c02d3453a685e15744324bdbf0ca00000000000000000000000000000000000000000000000000000000000000000a03d09a9decdbfcf379018f2c7085027a9c5cc55e5418cc80db8cbd716618d0d83c0f901b4f84601f843a065d9c29094cda5f4e579b3afe271b3d0e2cbeefb7d9ffd55a8ed9c290fbe35a5a057e9d728cf3f3e2be04b1f229d4738ea9ec584c8358fe89029e0f01d02c1a4ff80c180f84601f843a00ae5c205d3613a02176aae416168b6a0217fe3bf0d53caa7a5dff8324757c7f9a05e43f34446edd7862452e71f3eb7f4376b2dc1cb9eb515acf4c5c66244fb422b80f84601f843a0e2dd8a0b26a79dbd7385feac55e340cc2ee9b3e155733f61b8d0f29a36b66b0ba032b67f2a5232fc053057e878b9fd95d3f8a0518d9275ba993516306fe3070f6601f84601f843a056878fbefff1728c310284ad6293a04ad66bcdb4d7727801fac33d8f3313384ea062d4defb75a15cc1df55c49354c072c9727fb6328ef1c5b34528ebadfb4809c980f84601f843a04c21b9d7f30c497ba5ab9c031b7a2b05a6003a4d369b3e48b0aaee4db6b497f4a0131d78cfa9e71a40930a56b93cf4a8ec1e46b12e04ac0745500441ea855b591101f84601f843a0fbf24ba973fddc77c750af2404f5b10859f56df3c8e2049efa714a3270551a81a04e7a9e2dff73c6ec9c038d2533b738e6052261273b357156c81bb3423cde6f7701c1800100000093020000f90290822080b9028a02f902860182d0b0b9010000000000000000000000000000000000000000000000000000000000000000000000000000001000000000800000000000000000000010000000000000000000000000102000000000000008000000000000000000008000000000000000000000000000020000000000000080000808000000000000000000000010000000000000000000000000000440000000000000000000000000000000000000000000002000000000000000000008000000000020000000000000000000000000000000000002000000000000000000800800000008800000000000000000000020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b9484cccaba72f7daf8c5ad88c3a8e4a8ea3185369cf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1ba00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000186a0f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b1400000000000000880400000000000003000000b3000000f8b1a0767d882e816fcccd646a7503fe74bb00e3c8a9b0532ca6c5df5ba564d58b3867a0ac5eccb67f573d59cda9d886c68f58da85ec875cd430fb3f964b455e71734bc7a0320d061fc57a10b3258a415973124cc1c647186a8713325317e71c4244269469a036de099799d6c1d3c2e640f2f6812a5a4e2a377b2043052cdb1990774498e87080808080a08d21fb133dc7426f24eb2537663db37ae078dfddb590fd40b833a5f8c1538dfc808080808080808014020000f90211a038720e0c008fe567669b6cabe7c8c037d112616c1d21fb587f895ecedb4aeae2a080d845b1f1d19cea0cc050a6bd17317fbc097d34188e0c2f4abbee9c3271e90aa046686eb6d466d037ae5f80549993e64cd3b9fa4e062cd74266ac626499f8ce1fa07af8361e02082f5e27982cbfd712be29a8d453d41e6f6ece71c8b33a4bc96518a0b187fccbf3c1d6de06c70231891fc30de9da18d14ed760f6d33805a1845ea759a0223959349899b618a07058d265e727f8df0c4f65b615037c3c28eccfeb91e0f4a093f7ed75cc75efccf50d00c000c6203b49c8284dfd1db28a95d38fe93099b087a0d0ae9f10b8ae72bbcb73ebefcf77ed312945045e96dc63df39532867c3903e23a0839fff0f9d340619460e3870feb92e7c5b9dd71eb8c125c42c90150f6d1e0683a09b73e50a78695d9d20f0d80f138fc3a3c5c175ab0b030cc46241dc9953e6b468a06a917bcfbd1998ebf23e287a584bbaa20280fcfda9f74c88dd6179bf8af2c803a0cf6f3cf0039720593ccbaa2181d6f6337e3d5fe9939ccc025a2c0b79c1b894caa0541b87044bf4ae1b7a40413b8fc8930762c7290c32de603585c1a8c11f9e5819a00332168b4e46280b24bd4d31d44e1735b3c904a5f107cab0c6a20ababd01c5a6a0ce276f3ad8ee607022ef6e1082b036cb1b9027598072c6e55425771ffda1120fa0cf9d1822561e5739bf0d537105405badb6dcaaf06c5c9cd49e16099dfeec02c28023000000e220a03c40acf657ea10ed386d6a7068f15d7d428b75482e2f22df6ed0c713ca076d6e',0)).to.be.revertedWith('proxy is not bound')
    })

    it('unlockToken success', async () => {
      await erc20Locker.bindAssetHash('0x88Fe23d733cA1552266bed3864514D06888aBC40','0x84cCCaba72F7daf8C5ad88c3A8e4a8eA3185369c','0x7Bf32bFB875E1210282CD8E54b1BE16436bB9E79');
      await erc20Token.approve(erc20Locker.address,toWei('200'))
      await erc20Locker.adminPause(0)
      //blockHashes(bytes32)
      await bridge.mock.blockMerkleRoots.withArgs(1160).returns('0x0b15887d969a94116155d2a05d67463590fe22669d74f3281e538376bac62422')
      await bridge.mock.blockHeights.withArgs(1160).returns(1)
      await erc20Locker.unlockTokenRuleOutSafeTransfer('0x0100000000000000df000000f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b00000000000000008a02000002f902860182d0b0b9010000000000000000000000000000000000000000000000000000000000000000000000000000001000000000800000000000000000000010000000000000000000000000102000000000000008000000000000000000008000000000000000000000000000020000000000000080000808000000000000000000000010000000000000000000000000000440000000000000000000000000000000000000000000002000000000000000000008000000000020000000000000000000000000000000000002000000000000000000800800000008800000000000000000000020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b9484cccaba72f7daf8c5ad88c3a8e4a8ea3185369cf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1ba00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000186a0f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b4e02000000f9024ab86f00f86c820466158462ce92faa04f55b8a2c7d3d3c524f474b272c78a0ecade82512dd7fbe5be10d58dcd055d4ba0b4d45e986fb132883f397172c71a2544053b0c02d3453a685e15744324bdbf0ca00000000000000000000000000000000000000000000000000000000000000000a03d09a9decdbfcf379018f2c7085027a9c5cc55e5418cc80db8cbd716618d0d83c0f901b4f84601f843a065d9c29094cda5f4e579b3afe271b3d0e2cbeefb7d9ffd55a8ed9c290fbe35a5a057e9d728cf3f3e2be04b1f229d4738ea9ec584c8358fe89029e0f01d02c1a4ff80c180f84601f843a00ae5c205d3613a02176aae416168b6a0217fe3bf0d53caa7a5dff8324757c7f9a05e43f34446edd7862452e71f3eb7f4376b2dc1cb9eb515acf4c5c66244fb422b80f84601f843a0e2dd8a0b26a79dbd7385feac55e340cc2ee9b3e155733f61b8d0f29a36b66b0ba032b67f2a5232fc053057e878b9fd95d3f8a0518d9275ba993516306fe3070f6601f84601f843a056878fbefff1728c310284ad6293a04ad66bcdb4d7727801fac33d8f3313384ea062d4defb75a15cc1df55c49354c072c9727fb6328ef1c5b34528ebadfb4809c980f84601f843a04c21b9d7f30c497ba5ab9c031b7a2b05a6003a4d369b3e48b0aaee4db6b497f4a0131d78cfa9e71a40930a56b93cf4a8ec1e46b12e04ac0745500441ea855b591101f84601f843a0fbf24ba973fddc77c750af2404f5b10859f56df3c8e2049efa714a3270551a81a04e7a9e2dff73c6ec9c038d2533b738e6052261273b357156c81bb3423cde6f7701c1800100000093020000f90290822080b9028a02f902860182d0b0b9010000000000000000000000000000000000000000000000000000000000000000000000000000001000000000800000000000000000000010000000000000000000000000102000000000000008000000000000000000008000000000000000000000000000020000000000000080000808000000000000000000000010000000000000000000000000000440000000000000000000000000000000000000000000002000000000000000000008000000000020000000000000000000000000000000000002000000000000000000800800000008800000000000000000000020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b9484cccaba72f7daf8c5ad88c3a8e4a8ea3185369cf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1ba00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000186a0f8dd947bf32bfb875e1210282cd8e54b1be16436bb9e79f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a000000000000000000000000084cccaba72f7daf8c5ad88c3a8e4a8ea3185369ca000000000000000000000000088fe23d733ca1552266bed3864514d06888abc40a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1bb84000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000bc471a6a2616efebc8d635b64526bfe829ea7c1b1400000000000000880400000000000003000000b3000000f8b1a0767d882e816fcccd646a7503fe74bb00e3c8a9b0532ca6c5df5ba564d58b3867a0ac5eccb67f573d59cda9d886c68f58da85ec875cd430fb3f964b455e71734bc7a0320d061fc57a10b3258a415973124cc1c647186a8713325317e71c4244269469a036de099799d6c1d3c2e640f2f6812a5a4e2a377b2043052cdb1990774498e87080808080a08d21fb133dc7426f24eb2537663db37ae078dfddb590fd40b833a5f8c1538dfc808080808080808014020000f90211a038720e0c008fe567669b6cabe7c8c037d112616c1d21fb587f895ecedb4aeae2a080d845b1f1d19cea0cc050a6bd17317fbc097d34188e0c2f4abbee9c3271e90aa046686eb6d466d037ae5f80549993e64cd3b9fa4e062cd74266ac626499f8ce1fa07af8361e02082f5e27982cbfd712be29a8d453d41e6f6ece71c8b33a4bc96518a0b187fccbf3c1d6de06c70231891fc30de9da18d14ed760f6d33805a1845ea759a0223959349899b618a07058d265e727f8df0c4f65b615037c3c28eccfeb91e0f4a093f7ed75cc75efccf50d00c000c6203b49c8284dfd1db28a95d38fe93099b087a0d0ae9f10b8ae72bbcb73ebefcf77ed312945045e96dc63df39532867c3903e23a0839fff0f9d340619460e3870feb92e7c5b9dd71eb8c125c42c90150f6d1e0683a09b73e50a78695d9d20f0d80f138fc3a3c5c175ab0b030cc46241dc9953e6b468a06a917bcfbd1998ebf23e287a584bbaa20280fcfda9f74c88dd6179bf8af2c803a0cf6f3cf0039720593ccbaa2181d6f6337e3d5fe9939ccc025a2c0b79c1b894caa0541b87044bf4ae1b7a40413b8fc8930762c7290c32de603585c1a8c11f9e5819a00332168b4e46280b24bd4d31d44e1735b3c904a5f107cab0c6a20ababd01c5a6a0ce276f3ad8ee607022ef6e1082b036cb1b9027598072c6e55425771ffda1120fa0cf9d1822561e5739bf0d537105405badb6dcaaf06c5c9cd49e16099dfeec02c28023000000e220a03c40acf657ea10ed386d6a7068f15d7d428b75482e2f22df6ed0c713ca076d6e',0)
    })

  })
  
})

  
