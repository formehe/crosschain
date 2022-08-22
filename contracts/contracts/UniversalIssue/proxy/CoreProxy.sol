// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract CoreProxy is Initializable{
    event ContractGroupProxyBound(
        address asset,
        uint256 contractGroupId,
        uint256 chainId
    );

    mapping(uint256 => address) public provers;
    // groupId --- chainId --- asset
    mapping(uint256 => mapping(uint256 => address)) contractGroupMember;
    address public generalContractor;

    constructor(){
    }

    function initialize(address generalContractor_) external initializer {
        generalContractor = generalContractor_;
    }

    function bindProver(uint256 chainId_, address prover_) external {
        require (provers[chainId_] == address(0), "chain had bind prove");
        require (prover_ != address(0), "address of prover can not be 0");
        provers[chainId_] = prover_;
    }

    function bindAssetProxyGroup(
        address asset, 
        uint256 chainId,
        uint256 contractGroupId
    ) external {
        require(msg.sender == generalContractor, "just general contractor can bind");
        require(asset != address(0), "from proxy address are not to be contract address");
        require(contractGroupId != 0, "contract group id can not be 0");

        require(contractGroupMember[contractGroupId][chainId] == address(0), "asset has been bound");
        contractGroupMember[contractGroupId][chainId] = asset;
        emit ContractGroupProxyBound(asset, contractGroupId, chainId);
    }

    function proxy(bytes memory proof) external{
    }

    function mint(bytes memory proof) external {
    }

    function burn(uint256 toChainId, address asset, bytes calldata operation) external{
    }
}