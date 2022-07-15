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

    const TopBridge = await hre.artifacts.readArtifact("TopBridge")
    topBridge = await deployMockContract(wallet, TopBridge.abi, overrides)

    deserializeCon = await hre.ethers.getContractFactory("Deserialize", wallet)
    deserializeContract = await deserializeCon.deploy()
    console.log("+++++++++++++DeserializeContract+++++++++++++++ ", deserializeContract.address)
    
    const TopProver =  await hre.ethers.getContractFactory("TopProverTest", wallet, overrides)
    topProver = await TopProver.deploy(topBridge.address, deserializeContract.address)

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
       await topProver.verifyReceiptProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae') 
    })

    it('There is receipt verify,fail', async () => {
       await expect(topProver.verifyReceiptProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af814a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af814a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae')
      ).to.be.revertedWith('verifyTrieProof root node hash invalid')
    })

    it('There is block verify,success', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(16).returns('0x90b396afdd76b76c5f3d782e3fbf081dfba987dc1bcb5b4d34e9fc1beb5f6316')
      await topProver.verifyBlockProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae') 
    })

    it('There is block verify,fail,Failed to data', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(16).returns('0x90b396afdd76b76c5f3d782e3fbf081dfba987dc1bcb5b4d34e9fc1beb5f6316')
      await expect(topProver.verifyBlockProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812a1') 
      ).to.be.revertedWith('verifyTrieProof root node hash invalid')
    })
    
    it('There is block verify,fail,Failed to blockMerkleRoots', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(16).returns('0x7f330795266f55fa8f87f25bf2c391ae22a417459b6bf2eea596b1dbc9441a01')
      await expect(topProver.verifyBlockProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae') 
      ).to.be.revertedWith('verifyTrieProof root node hash invalid')
    })

    it('There is block verify,fail,Failed to blockMerkleRoots', async () => {
      await topBridge.mock.blockMerkleRoots.withArgs(16).returns('0x0000000000000000000000000000000000000000000000000000000000000000')
      await expect(topProver.verifyBlockProof('0x0100000000000000df000000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b0000000000000000008a02000002f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b004c02000000f90248b86d00f86a0f068462c69884a019819a3f107859aa3534ff109a3bc5c0cbf989ab9bdbfd23b740c15c0a45c228a03733cea8868d8aec8cdf23b0a86318c3564d27177983f1799926dc00869fab8ea00000000000000000000000000000000000000000000000000000000000000000a086463ad70f3bb948a7ddcc4089b799d4bec50e55634937e9ce4e8d33ba599a24c0f901b4f84601f843a0de8e05361a60bd44d465910ec44faab3e2ac3010abf06bc860119f9ea0d38301a07ebd17671307abf57a0ac0ef38f4c364939475dcacdb3d1f416d78f73185399f80c180f84601f843a0ac761c26516d2550bc193407d93d56c63ec384148faca251e767b60dbd3804dda00b6ca0bac1f42818bc2eae0c8480a759818ae794dc64c4df54c0ae14fbd1696501f84601f843a02c57c1f211abda7a1ed5e10ccf41e84fe3b26ed0f80666e679156bcae8998f51a0262b6baf2a4430c3c4cb3941c00483f47a85d5a48c8acb48323100386061ea3580f84601f843a0b71fdcc18a9aad503fba2b0ef90e31004132948e094bfa3023dcca8b26e298f6a037e9ca9759e8550bd8138e2acc4729acf833178164fa5ae43432f5bf960680dc80f84601f843a0f9933cbc9b79cb255004ff575de2ec9f19db49474eacc598e81ddb1fddebecd7a0695218777f318b3f9140b68ef79898d2d2b340692dada59a8c283229bf653e7801c180f84601f843a0967a51fef357b84ab4a43979c771d789ada2741b58ad7699d99e066c6153f9d8a019d4e018d5094780dcc6596c27be70afb729ab7d3175edd1b2113d2d184cb687800100000093020000f90290822080b9028a02f902860182d137b9010000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000008000000004000000040008000000000000000000000400000020000000000200000000800000000000000000000000010000000000000000000000000000000000000000000000002000000000000000000000000000000204000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000008011000000000000000080020000000000000000000000000000000000000000000000000000000000000000000f9017cf89b94c64f939ef413b4dd4bb61c0664d9384177c9d3dcf863a0ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075a00000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000002c68af0bb140000f8dd943b79e91a2bc2bc57ebd61b626eac8f410475748af884a04f89ece0f576ba3986204ba19a44d94601604b97cf3baa922b010a758d303842a0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000c64f939ef413b4dd4bb61c0664d9384177c9d3dca0000000000000000000000000a08bf2943629ecc1f1796405fb4f3a4a7daf7075b84000000000000000000000000000000000000000000000000002c68af0bb1400000000000000000000000000005710d43f700e8292ce83e688273029f6359d1b000f0000000000000010000000000000000100000025000000e4822080a06d6d698d1d0cbf9f525c81e6b1c6bbdc3d4d3018c7c8fc2b0a9c2828f1b812ae') 
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
