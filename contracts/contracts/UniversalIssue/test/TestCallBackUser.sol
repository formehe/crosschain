// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../prover/IProver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract TestCallBackUser is IProver, IERC721Receiver{
    constructor(address bridge_) IProver(bridge_) {}
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IProver.verify.selector;
    }

    function verify(
        bytes calldata proofData
    ) external override view returns(bool valid, bytes32 blockHash, uint256 receiptIndex, uint256 time) {

    }
}