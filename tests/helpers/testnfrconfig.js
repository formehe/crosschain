const { AddressZero } = require("ethers").constants
testNfrMintCases = [
    {
        caller: miner,
        tokenId: 51,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user.address,
        expect: "only for minter"
    },
    {
        caller: deployer,
        tokenId: 101,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user.address,
        expect: "ERC721: token id is overflow"
    },
    {
        caller: deployer,
        tokenId: 0,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user.address,
        expect: "token id can not be 0"
    },
    {
        caller: deployer,
        tokenId: 51,
        rightKinds: [0,2],
        rightAmounts: [1,1],
        owner: user.address,
        expect: "right kind is not exist"
    },
    {
        caller: deployer,
        tokenId: 51,
        rightKinds: [0],
        rightAmounts: [1,1],
        owner: user.address,
        expect: "invalid right kind numbers"
    },
    {
        caller: deployer,
        tokenId: 1,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: AddressZero,
        expect: "ERC721: mint to the zero address"
    },
    {
        caller: deployer,
        tokenId: 51,
        rightKinds: [],
        rightAmounts: [],
        owner: user.address,
        expect: ""
    },
    {
        caller: deployer,
        tokenId: 100,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user.address,
        expect: ""
    },
]

testNfrBurnCases = [
    {
        caller: deployer,
        tokenId: 1,
        expect: "caller is not owner nor approved"
    },
    {
        caller: deployer,
        tokenId: 51,
        expect: "ERC721: operator query for nonexistent token"
    },
    {
        caller: deployer,
        tokenId: 0,
        expect: "ERC721: operator query for nonexistent token"
    },
    {
        caller: admin,
        tokenId: 1,
        expect: ""
    },
]

attachAdditional = [
    {
        caller: admin,
        tokenId: 1,
        additional: "0x1111",
        expect: ""
    },
    {
        caller: user,
        tokenId: 1,
        additional: "0x1111",
        expect: "not owner or approver"
    },
    {
        caller: user,
        tokenId: 51,
        additional: "0x1111",
        expect: "ERC721: owner query for nonexistent token on this chain"
    },
    {
        caller: user,
        tokenId: 0,
        additional: "0x1111",
        expect: "invalid token id"
    },
    {
        caller: admin,
        tokenId: 1,
        additional: "0x",
        expect: "invalid parameter"
    }
]

approve = [
    {
        caller: deployer,
        approver: admin.address,
        tokenId: 1,
        expect: "ERC721: approval to current owner"
    },
    {
        caller: deployer,
        approver: user1.address,
        tokenId: 1,
        expect: "ERC721: approve caller is not owner nor approved for all"
    },
    {
        caller: admin,
        approver: user1.address,
        tokenId: 1,
        expect: ""
    }
]

attachRights = [
    {
        caller: user,
        tokenId: 1,
        rightKind: 0,
        expect: "not owner or approver"
    },
    {
        caller: admin,
        tokenId: 1,
        rightKind: 2,
        expect: "right kind is not exist"
    },
    {
        caller: admin,
        tokenId: 1,
        rightKind: 0,
        expect: ""
    },
]