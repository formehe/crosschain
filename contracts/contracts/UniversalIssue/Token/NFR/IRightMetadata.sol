// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
    * @dev Interface for the optional right metadata functions from the ERC3721 standard.
*/
interface IERC3721RightMetadata {
    
    /** @dev Returns the Name of the Rights. */
    function rightsName(uint256 rightkind) external view returns (string memory);

    /** @dev Returns the Agreement of the Rights.*/
    function rightsAgreement(uint256 rightkind) external view returns (string memory);

    /** @dev Returns the Uniform Resource Identifier (URI) for `rightsId` Rights.*/
    function rightsURI(uint256 rightkind) external view returns (string memory);
}