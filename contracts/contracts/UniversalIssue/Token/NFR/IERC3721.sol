// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
interface IERC3721 is IERC721{
    /** @dev Emitted when burnRights fired*/
    event BurnTokenRights(uint256 indexed tokenId, uint256 indexed rightKind);

    /*** @dev Emitted when attachRights fired*/
    event AttachTokenRights(uint256 indexed tokenId, uint256 indexed rightKind);

    /**@dev Emitted when transferRights fired*/
    event TransferTokenRights(uint256 indexed fromTokenId, uint256 toTokenId, uint256 indexed rightKind);

    /**
    * @dev Attaches Rights type `rightKind` to `tokenId`.
    * Only Issuer allow attach Rights to specific NFT Token
    * Quantity of `rightKind` belongs to `tokenId` is reduced by one
    * Emits an {AttachTokenRights} event.
    */
    function attachRight(uint256 tokenId, uint256 rightKind) external;

    /**
    * @dev Transfers Rights type `rightKind` from token type `from` to `to`.
    * msg.sender must be owner of fromToken
    * Quantity of `rightKind` belongs to `tokenId` is increased by one
    * Emits a {TransferTokenRights} event.
    */
    function transferRights(uint256 fromTokenId, uint256 toTokenId, uint256 rightKind) external;
    
    /**
    * @dev Attaches Rights type `rightKind` to `tokenId`.
    * Only Owner of Token allow to burn rights
    * Emits an {BurnRights} event.
    */
    function burnRights(uint256 tokenId, uint256 rightKind) external;

    /** @dev Returns all Righths of owned by `tokenId`.*/
    function tokenRights(uint256 tokenId) external view returns(uint256[] memory, uint256[] memory);
}