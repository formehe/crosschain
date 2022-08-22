// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract IngressProxy is Initializable{
    struct ProxiedAsset{
        uint256 groupId;
    }

    event ContractGroupBound(
        address asset,
        uint256 contractGroupId
    );

    mapping(address => ProxiedAsset) public assets;
    address public prover;
    address public subContractor;

    constructor(){
    }

    function initialize(address prover_, address subContractor_) external initializer {
        prover = prover_;
        subContractor = subContractor_;
    }

    function bindAssetGroup(
        address asset,
        uint256 contractGroupId
    ) external {
        require(msg.sender == subContractor, "just subcontractor can bind");
        require(Address.isContract(asset), "from proxy address are not to be contract address");
        require(assets[asset].groupId == 0, "can not modify the bind asset");
        require(contractGroupId != 0, "contract group id can not be 0");
        assets[asset] = ProxiedAsset(contractGroupId);
        emit ContractGroupBound(asset, contractGroupId);
    }

    function mint(bytes memory proof) external {

    }

    function burn(uint256 toChainId, address asset, bytes calldata operation) external {
        uint256 groupId = assets[asset].groupId;
        require(groupId != 0, "asset is not bind");
    }
}