// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8;

import "../../lib/lib/MPT.sol";
import "./AdminControlled.sol";

interface IMintByProof {
    function burn(uint256 amount) external payable returns (bool);
    function mint(bytes memory proofData, uint64 proofBlockHeight) external payable returns (bool);
}