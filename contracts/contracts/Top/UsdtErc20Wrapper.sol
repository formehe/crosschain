// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

contract UsdtErc20Wrapper {
    address constant TopErc20 = 0xfF00000000000000000000000000000000000007;

    string public name = "Wrapped Tether USD";
    string public symbol = "tUSDT";
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
