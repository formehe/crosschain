// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

contract UsdcErc20Wrapper {
    address constant TopErc20 = 0xFF00000000000000000000000000000000000008;

    string public name = "Wrapped USD Coin";
    string public symbol = "tUSDC";
    bytes1 public chain_uuid;

    constructor(bytes1 chain_uuid_) {
        chain_uuid = chain_uuid_;
    }

    fallback() external {
        bytes memory call_data = abi.encodePacked(chain_uuid, msg.data);
        (bool success, bytes memory result) = TopErc20.delegatecall(call_data);

        require(success, string(result));

        assembly {
            return(add(result, 0x20), mload(result))
        }
    }
}
