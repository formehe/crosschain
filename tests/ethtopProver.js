const { expect } = require("chai");
const { call } = require('./helpers/call')
const hardhat = require('hardhat')
const { deployMockContract } = require('./helpers/deployMockContract')
const { AddressZero } = require("ethers").constants

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 9500000 }

describe('TopProver', () => {

  let wallet, wallet2,wallet3
  let topProver
  let topBridge

  beforeEach(async () => {
    [wallet, wallet2,wallet3] = await hardhat.ethers.getSigners()
    provider = hardhat.ethers.provider

    console.log("wallet>>>> "  + wallet.address)

    deserializeCon = await ethers.getContractFactory("Deserialize");
    deserialize = await deserializeCon.deploy();
    await deserialize.deployed();

    const TopBridge = await hre.artifacts.readArtifact("TopBridge")
    topBridge = await deployMockContract(wallet, TopBridge.abi, overrides)
    
    const TopProver =  await hre.ethers.getContractFactory("TopProverTest", {
      gasLimit: 9500000,
      signer: wallet,
      libraries: {
        Deserialize:deserialize.address
      }
    })
    topProver = await TopProver.deploy(topBridge.address)

  })

  describe('verifyHash', () => {
    it('There is no hash', async () => {
        await expect(topProver.verifyHash('0x0000000000000000000000000000000000000000000000000000000000000001')
        ).to.be.revertedWith('Height is not confirmed')
    })

    it('There is hash', async () => {
      await topBridge.mock.blockHashes.withArgs('0x0000000000000000000000000000000000000000000000000000000000000001').returns(true)
      let{valid,reason} = await topProver.verifyHash('0x0000000000000000000000000000000000000000000000000000000000000001');
    })

  })

  describe('getAddLightClientTime', () => {
    it('There is no height', async () => {
        await expect(topProver.getAddLightClientTime(2)
        ).to.be.revertedWith('Height is not confirmed')
    })

    it('There is height', async () => {
      await topBridge.mock.blockHeights.withArgs(2).returns(100)
      expect(await call(topProver,"getAddLightClientTime",2)).to.equal(100)
    })

  })

  describe('verify', () => {
    it('There is receipt verify,success', async () => {
       await topProver.verifyReceiptProof('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed') 
    })

    it('There is receipt verify,fail', async () => {
       await expect(topProver.verifyReceiptProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af814a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af814a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae')
      ).to.be.revertedWith('verifyTrieProof root node hash invalid')
    })

    it('There is block verify,success', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(275).returns('0xc76d68b4b9aefd69d08b5a937859625c165bb4e8d57c862f956fe9867b8a50a9')
      await topProver.verifyBlockProof('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed') 
    })

    // it('There is block verify,fail,Failed to data', async () => {
    //   await topBridge.mock.blockMerkleRoots.withArgs(16).returns('0x90b396afdd76b76c5f3d782e3fbf081dfba987dc1bcb5b4d34e9fc1beb5f6316')
    //   await expect(topProver.verifyBlockProof('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed') 
    //   ).to.be.revertedWith('verifyTrieProof root node hash invalid')
    // })
    
    it('There is block verify,fail,Failed to blockMerkleRoots', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(275).returns('0x7f330795266f55fa8f87f25bf2c391ae22a417459b6bf2eea596b1dbc9441a01')
      await expect(topProver.verifyBlockProof('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed') 
      ).to.be.revertedWith('verifyTrieProof root node hash invalid')
    })

    it('There is block verify,fail,Failed to blockMerkleRoots', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(275).returns('0x0000000000000000000000000000000000000000000000000000000000000000')
      await expect(topProver.verifyBlockProof('0x0100000000000000df000000f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b00000000000000008b02000002f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b6f02000000f9026bf88d82010c8405117b46a0b50a733bd3034050edcb90f412491e03ed4fff55e466f8c033be87e17f15a9baa0910121805eb975ab80c3cf962bf08f420b48bb932fa917c794dc72422c2b9f44a00000000000000000000000000000000000000000000000000000000000000000a02d5d402d56135f57ff0b815aed1bcabf0967754e9e13f618044554ff08b73e96c0f901b854f901b4f84601f843a066944a8287932aba27bc41675cb8d6fe1cf9ee7a01b017541c8d7468fbe448e8a06f72a01394b29d1066856d98c43e573ac7597ed07a70ba039e3055edcaa65f5f80c180f84601f843a0e74b113be48dd64a1175acc079e02c233db3ada6420b4500e8aee14351a5983ca04c5a4eb9ad6a2aeb0a37a3173aa0b30dee103558fc7b29bf6e14015c5256645101f84601f843a0d9c183b1f39ea771504dfc9b408a6d5dd05734c6cb462ad7d92c7058120dd004a0762d103af537f1ebe71d20d5461c42485ba4d9d4e22dbf69ddfe44cf50ff7faa80f84601f843a030fbec9f6cbad09621947bc462c7c5dc188cdf2f7f1a50411bd63cf7e2c93616a0262221bf3fdc163a34a449989efffe2425ae3502797294142caee4d9e68c799b01c180f84601f843a0d51747d4829561b034ef816a11cd2ee77d037a8e71d3e47041b8296a5cc25fe2a0471239e3c249f4b1c7c91b61686e371e78d8f61f1e89afd8919cb5637ce5f51e01f84601f843a0272c2f7649a37e86e7fa3b96001729b5f7d244119f5bf813133d97ab5716f7c6a062cd2872fcb73c9a173d6da6eba31b9ad2f34b1776e2c98115697dbce6d6aff280a0b1675be58f5e5b8b3fc4e2bca4408708f57d85d603be338b2c7b942566f0ab850200000053000000f851a079ba7c809291ca4b9827fe24e598511f2d372ed47981a5d30fa460aba7e3f5cd80808080808080a07b8b5d7508b1d679bf9922830be88c3ef0ed7edcd929e568e41fc5b1a47080b7808080808080808092020000f9028f30b9028b02f9028701830a2fd3b9010000000000100000000000000000000000000000000000000000000100000000000000000080101000010000000000000000000000000000000000000000000002000000000000000000000008000000000100040000008000000000000000000000000000020000000000000000020800000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000002000000000000000900002000000000000000000000000000008000000000000000000000020800000000000000000000000000000000000000010000000000000000000000000f9017cf89b945a29872525901e632cbfd0c4671263af2ca52b25f863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2ba00000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000001dcd6500f8dd94e29c68247a43b402e3d2b95f122c9a1f2e1e86a4f884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a00000000000000000000000005a29872525901e632cbfd0c4671263af2ca52b25a0000000000000000000000000b997a782f36256355206d928aaa217058d07a7a2a00000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2bb840000000000000000000000000000000000000000000000000000000001dcd65000000000000000000000000006980001470ed6af6fd40f69d9e90036bb4be8e2b020000000000000013010000000000000300000053000000f851a036989e98420cef671fff62f33c318204921195de24b5f5e2dec12704b110bc3080808080808080a0119de8ef07cff9c08afa68e37301d0f43fdf2c1659da22764c84ad739c3638d0808080808080808014010000f9011180a04437668d7160e9ad9abb6b9dcf76470a1ba2ab9cf7a12d70537fffeb9015fac0a0d016f6205d5a5a5337e6ba4ba8a851bf3b8da67892b9267835e801bdc4922161a04cb9ed5ac882498c32ad18dd95da4bb5eca2aa7563d6e79d07960e9f21f2d287a0f7ac24b16c03bf465d1ebb6de65392eb56b0709c154a5e14b26453d77dbfdc57a071fd8f4c9b2fb492407fc182bdf60ef692d66b34ffe500e390f7c5e52602596ea0e2989709a786465753519d72fae034fac43e05232da41afb308d131a3fd2f79ba09c0fc6a1aa9a54aeba54e684d4ea048bc4e30f19ea90b9d23ace7a00115dd366a0d46e6b17ade6df8b1afc39f2fece35ca6306fb7564066b2435c772b59dd4ee11808080808080808023000000e220a0cd344b865b43e73007a7443d882b0eeab1fe1b5527bedff0e8221d9a98697aed') 
      ).to.be.revertedWith('Height is not confirmed4')    
    })

  })

  describe('decode', () => {
    it('There is decode', async () => {
        let data = await topProver.decodeProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae')
        console.log(JSON.stringify(data))

    })
  })

})
