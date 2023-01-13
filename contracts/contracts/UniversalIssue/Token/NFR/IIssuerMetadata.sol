// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
    * @dev Interface for the optional issuer metadata functions from the ERC3721 standard.
*/
interface IERC3721IssuerMetadata {
    /**@dev Returns the Name of the Issuer.*/
    function issuerName() external view returns (string memory);

    /**@dev Returns the Certification of the Issuer.*/
    function issuerCertification() external view returns (string memory);

    /**@dev Returns the Agreement of the Issuer.*/
    function issuerAgreement() external view returns (string memory);

    /**@dev Returns the Uniform Resource Identifier (URI) for Issuer.*/
    function issuerURI() external view returns (string memory);
}