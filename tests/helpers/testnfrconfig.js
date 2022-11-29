testNfrMintCases = [
    {
        caller: miner,
        tokenId: 51,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user,
        expect: "only for minter"
    },
    {
        caller: deployer,
        tokenId: 101,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user,
        expect: "ERC721: token id is overflow"
    },
    {
        caller: deployer,
        tokenId: 0,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user,
        expect: "token id can not be 0"
    },
    {
        caller: deployer,
        tokenId: 51,
        rightKinds: [0,2],
        rightAmounts: [1,1],
        owner: user,
        expect: "right kind is not exist"
    },
    {
        caller: deployer,
        tokenId: 100,
        rightKinds: [0,1],
        rightAmounts: [1,1],
        owner: user,
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