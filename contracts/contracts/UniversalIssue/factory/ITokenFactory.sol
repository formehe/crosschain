// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

abstract contract ITokenFactory is Initializable {
    event ContractCreated(
        uint256  indexed chainId,
        uint256  indexed saltId,
        address  indexed asset,
        address  templateCode,
        address  minter
    );
    address templateCode;
    address contractor;
    uint128 nonce2;

    constructor(address code_, address contractor_) {
        require(Address.isContract(code_), "invalid address");
        require(Address.isContract(contractor_), "invalid address");
        templateCode = code_;
        contractor = contractor_;
    }

    function clone(
        uint256 chainId,
        bytes calldata rangeOfIssue,
        uint256 saltId,
        address minter
    ) external returns(address asset){
        require(msg.sender == contractor, "caller is not permit");
        
        for (uint256 i = 0; i < 20; i ++) {
            bytes32 salt = _saltId(keccak256(rangeOfIssue), saltId);
            address predictAddr = Clones.predictDeterministicAddress(templateCode, salt);
            if (Address.isContract(predictAddr)) {
                continue;
            }

            asset = Clones.cloneDeterministic(templateCode, salt);
            initialize(chainId, asset, rangeOfIssue, minter);
            emit ContractCreated(chainId, saltId, asset, templateCode, minter);
            return asset;
        }

        require(false, "fail to clone");
    }

    function _exist(
        uint256[] memory dataSet,
        uint256 count,
        uint256 expectData
    ) internal pure returns (bool) {
        require(dataSet.length >= count, "data overflow");
        for (uint256 i = 0; i < count; i++) {
            if (dataSet[i] == expectData) {
                return true;
            }
        }

        return false;
    }

    function _saltId(bytes32 key, uint256 nonce1) internal returns(bytes32){
        uint256 number = block.number;
        if (number > 0) {
            number = number - 1;
        }

        uint256 nonce = (nonce1 << 128) + (nonce2++);
        return keccak256(abi.encode(tx.origin, key, address(this), blockhash(number), nonce));
    }

    function initialize(uint256 chainId, address code, bytes calldata rangeOfIssue, address minter) internal virtual;
    function issue(bytes calldata issueInfo) external pure virtual returns(bytes memory, uint256[] memory);
    function expand(address contractCode, uint256 peerChainId, address issuer) external view virtual returns(bytes memory);
    function constructMint(bytes calldata info) external pure virtual returns(bytes memory);
    function constructBurn(bytes calldata info, address to, uint256 asset) external pure virtual returns(bytes memory);
}