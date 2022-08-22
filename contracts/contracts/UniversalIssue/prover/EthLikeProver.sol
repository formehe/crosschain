// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./IProver.sol";
contract EthLikeProver is IProver {
    function verify( bytes calldata proof) external override returns(bool valid, string memory reason) {
    }
}