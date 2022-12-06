const { AddressZero } = require("ethers").constants
bindPeersOfCore = [
    {
        caller: deployer.address,
        chainId: 2,
        prover: ethLikeProver.address,
        proxy: edgeProxy.address,
        expect: "prover is bound"
    },
    {
        caller: admin.address,
        chainId: 2,
        prover: ethLikeProver.address,
        proxy: edgeProxy.address,
        expect: "prover is bound"
    },
    {
        caller: deployer.address,
        chainId: 23,
        prover: user.address,
        proxy: edgeProxy.address,
        expect: "invalid prover"
    },
    {
        caller: deployer.address,
        chainId: 23,
        prover: ethLikeProver.address,
        proxy: AddressZero,
        expect: "invalid prover"
    }
]

burnOfEdge = [
    {
        caller: miner.address,
        chainId: 2,
        groupId: contractGroupId,
        receiver: AddressZero,
        tokenId: 51,
        expect: "invalid receiver"
    },
    {
        caller: miner.address,
        chainId: 2,
        groupId: 0,
        receiver: user1.address,
        tokenId: 51,
        expect: "invalid contract group id"
    },
    {
        caller: miner.address,
        chainId: 2,
        groupId: contractGroupId,
        receiver: user1.address,
        tokenId: 51,
        expect: "only support cross chain tx"
    },
    {
        caller: miner.address,
        chainId: 1,
        groupId: 100,
        receiver: user1.address,
        tokenId: 51,
        expect: "asset is not bound"
    },
    {
        caller: miner.address,
        chainId: 3,
        groupId: contractGroupId,
        receiver: user1.address,
        tokenId: 48,
        expect: "fail to burn"
    }
]

bindAssetOfCore = [
    {
        caller:admin,
        asset:AddressZero,
        chainId: 1,
        groupId: 1,
        template: coreProxy1.address,
        expect: "from proxy address are not to be contract address"
    },
    {
        caller:admin,
        asset:coreProxy1.address,
        chainId: 1,
        groupId: 0,
        template: coreProxy1.address,
        expect: "contract group id can not be 0"
    },
    {
        caller:admin,
        asset:coreProxy1.address,
        chainId: 1,
        groupId: 1,
        template: coreProxy1.address,
        expect: ""
    },
    {
        caller:admin,
        asset:coreProxy1.address,
        chainId: 1,
        groupId: 1,
        template: coreProxy1.address,
        expect: "asset has been bound"
    },
    {
        caller:admin,
        asset:coreProxy1.address,
        chainId: 1,
        groupId: 100,
        template: user.address,
        expect: "invalid template code"
    },
]

bindAssetOfEdge = [
    {
        caller:admin,
        asset:user.address,
        groupId: 1,
        template: edgeProxy1.address,
        expect: "from proxy address are not to be contract address"
    },
    {
        caller:admin,
        asset:edgeProxy1.address,
        groupId: 0,
        template: edgeProxy1.address,
        expect: "contract group id can not be 0"
    },
    {
        caller:admin,
        asset:edgeProxy1.address,
        groupId: 1,
        template: edgeProxy1.address,
        expect: ""
    },
    {
        caller:admin,
        asset:edgeProxy1.address,
        groupId: 1,
        template: edgeProxy1.address,
        expect: "can not modify the bind asset"
    }
]

burnOfCore = [
    {
        caller: miner.address,
        chainId: 1,
        groupId: contractGroupId,
        receiver: user1.address,
        tokenId: 1,
        expect: "only support cross chain tx"
    },
    {
        caller: miner.address,
        chainId: 2,
        groupId: contractGroupId,
        receiver: AddressZero,
        tokenId: 1,
        expect: "invalid receiver"
    },
    {
        caller: miner.address,
        chainId: 2,
        groupId: 0,
        receiver: user1.address,
        tokenId: 1,
        expect: "invalid contract group id"
    },
    {
        caller: miner.address,
        chainId: 2,
        groupId: 100,
        receiver: user1.address,
        tokenId: 1,
        expect: "from asset can not be 0"
    },
    {
        caller: miner.address,
        chainId: 3,
        groupId: contractGroupId,
        receiver: user1.address,
        tokenId: 1,
        expect: "to asset can not be 0"
    },
    {
        caller: miner.address,
        chainId: 2,
        groupId: contractGroupId,
        receiver: user1.address,
        tokenId: 101,
        expect: "fail to burn"
    }
]