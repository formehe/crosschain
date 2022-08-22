// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

/**
* @dev Interface for the optional metadata functions from the ERC3721 standard.
*/
interface IERC3721Metadata is IERC721Metadata {
    /** @dev Returns the Name of the Rights.*/
    function rightsName(uint256 rightType) external view returns (string memory);
    
    /** @dev Returns the Agreement of the Rights.*/
    function rightsAgreement(uint256 rightType) external view returns (string memory);
    
    /** @dev Returns the Uniform Resource Identifier (URI) for `rightsId` Rights.*/
    function rightsURI(uint256 rightType) external view returns (string memory);
    
    ////////////////////////////////////////////////////////////////////////////
    /**@dev Returns the Name of the Publisher.*/
    function issuerName() external view returns (string memory);
    
    /**@dev Returns the Certification of the Publisher.*/
    function issuerCertification() external view returns (string memory);
    
    /**@dev Returns the Agreement of the Publisher.*/
    function issuerAgreement() external view returns (string memory);
    
    /**@dev Returns the Uniform Resource Identifier (URI) for Publisher.*/
    function issuerURI() external view returns (string memory);
}