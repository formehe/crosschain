// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
* @dev Interface for the optional metadata functions from the ERC3721 standard.
*/
interface IRightMetadata {
    //======================== IERC3721Metadata =================================
    /** @dev Returns the Name of the Rights. */
    function rightsName(uint256 rightkind) external view returns (string memory);
    function rightsAgreement(uint256 rightkind) external view returns (string memory); 
    function rightsURI(uint256 rightkind) external view returns (string memory);
}