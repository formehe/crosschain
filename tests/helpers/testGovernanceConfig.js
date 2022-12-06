const { AddressZero } = require("ethers").constants
bindEdgeGovernances = [
    {
        caller: deployer,
        chainId: 1,
        contractor: edgeGovernance.address,
        prover: ethLikeProver.address,
        expect: "not support bind myself"
    },
    {
        caller: deployer,
        chainId: 2,
        contractor: edgeGovernance.address,
        prover: ethLikeProver.address,
        expect: ""
    },
    {
        caller: deployer,
        chainId: 2,
        contractor: edgeGovernance.address,
        prover: ethLikeProver.address,
        expect: "chain has been bound"
    },
    {
        caller: admin,
        chainId: 2,
        contractor: subContractor.address,
        prover: ethLikeProver.address,
        expect: "is missing role"
    },
    {
        caller: deployer,
        chainId: 3,
        contractor: edgeGovernance.address,
        prover: AddressZero,
        expect: "invalid prover"
    }    
]

bindGovernedContractsOfEdge = [
    {
        caller: deployer,
        governed: subContractor.address,
        expect: ""
    },
    {
        caller: deployer,
        governed: edgeGovernance.address,
        expect: "not myself"
    },
    {
        caller: deployer,
        governed: AddressZero,
        expect: "invalid governed contract"
    },
    {
        caller: admin,
        governed: subContractor.address,
        expect: "is missing role"
    },
    {
        caller: deployer,
        governed: subContractor.address,
        expect: "contract is existed"
    }    
]

bindGovernedContractsOfCore = [
    {
        caller: deployer,
        governed: generalContractor.address,
        expect: ""
    },
    {
        caller: deployer,
        governed: coreGovernance.address,
        expect: "not myself"
    },
    {
        caller: deployer,
        governed: AddressZero,
        expect: "invalid governed contract"
    },
    {
        caller: admin,
        governed: coreGovernance.address,
        expect: "is missing role"
    },
    {
        caller: deployer,
        governed: generalContractor.address,
        expect: "contract is existed"
    }  
]