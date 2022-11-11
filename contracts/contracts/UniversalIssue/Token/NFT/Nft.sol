// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../NFR/Issuer.sol";
import "../NFR/ERC721Chunk.sol";
import "../../common/IssueCoder.sol";
import "../ProxyRegistry.sol";

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
 * the Metadata extension, but not including the Enumerable extension, which is available separately as
 * {ERC721Enumerable}.
 */
contract NFT is ERC721Chunk, Issuer {
    address minter;

    function initialize(
        address minter_,
        string memory name_,
        string memory symbol_,
        uint256 totalAmount,
        IssueCoder.IssuerDesc calldata issuer_,
        IssueCoder.CirculationRangePerchain calldata circulation_
    ) external initializer {
        require(minter_ != address(0), "minter can not be 0");
        minter = minter_;
        ERC721Chunk.initialize(name_, symbol_, issuer_.uri, circulation_.baseIndexOfToken, circulation_.baseIndexOfToken + circulation_.capOfToken, circulation_.issuer, totalAmount);
        Issuer.initialize(issuer_.name, issuer_.certification, issuer_.agreement, issuer_.uri);
    }

    function mint(
        uint256 tokenId_,
        address owner_
    ) external virtual {
        require(_msgSender() == ProxyRegistry(minter).proxy(), "only for minter");
        require(owner_ != address(0), "invalid owner");
        _safeMint(owner_, tokenId_);
    }

    function burn(
        uint256 tokenId
    ) external virtual {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        _burn(tokenId);
    }
}