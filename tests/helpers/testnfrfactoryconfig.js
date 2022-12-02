const { BigNumber } = require('ethers')
const bigAmount = BigNumber.from(1).shl(129)

issueInfos = [
    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:0, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: "rights id is repeat"
    },

    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: "chains id is repeated"
    },
    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 0,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 0,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: "none token issue"
    },

    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:0
                        },
                        {
                            id:1,
                            amount:0
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:0
                        },
                        {
                            id:1,
                            amount:0
                        }
                    ]
                }
            ]
        },
        expect: "no right issue"
    },

    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:2,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: "right kind is not exist"
    },

    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: bigAmount,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: "token amount is overflow"
    },

    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:bigAmount
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: "right amount is overflow"
    },

    {
        content: {
            name: "nfr",
            symbol: "nfr",
            issuer: {
                name: "test user",
                certification: "test certification",
                agreement: "test agreement",
                uri:"test uri"
            },
            rights: [
                {
                    id:0, 
                    right: {
                        name: "right1",
                        uri: "right uri",
                        agreement: "right agreement"
                    }
                },
                {
                    id:1, 
                    right: {
                        name: "right2",
                        uri: "right uri",
                        agreement: "right agreement"
                    },
                }
            ],
            issueOfChains:[
                {
                    issuer: miner.address,
                    chainId: 1,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                },
                {
                    issuer: miner.address,
                    chainId: 2,
                    amountOfToken: 50,
                    circulationOfRights: [
                        {
                            id:0,
                            amount:50
                        },
                        {
                            id:1,
                            amount:50
                        }
                    ]
                }
            ]
        },
        expect: ""
    },
]