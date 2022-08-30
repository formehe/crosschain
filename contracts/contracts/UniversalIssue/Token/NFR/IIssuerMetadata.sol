// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
* @dev Interface for the optional metadata functions from the ERC3721 standard.
*/
interface IIssuerMetadata {
    function issuerName() external view returns (string memory);
    function issuerCertification() external view returns (string memory);
    function issuerAgreement() external view returns (string memory);
    function issuerURI() external view returns (string memory);
}