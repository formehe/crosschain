// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/Borsh.sol";

library LogExtractor {
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;

    function decode(Borsh.Data memory data) internal pure returns (bytes memory log) {
        data.decodeU64();
        log = data.decodeBytes();
    }
}
