// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IIssuerMetadata.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
abstract contract ERC3721IssuerMetadata is IERC3721IssuerMetadata, Initializable {
    string  name;
    string  certification; 
    string  agreement;
    string  uri;

    function initialize(
        string  memory name_,
        string  memory certification_,
        string  memory agreement_,
        string  memory uri_
    ) internal onlyInitializing {
        name = name_;
        certification = certification_;
        agreement = agreement_;
        uri = uri_;
    }
        
    ////////////////////////////////////////////////////////////////////////////
    /**@dev Returns the Name of the Publisher.*/
    function issuerName() external view override returns (string memory) {
        return name;
    }
    
    /**@dev Returns the Certification of the Publisher.*/
    function issuerCertification() external view override returns (string memory) {
        return certification;
    }
    
    /**@dev Returns the Agreement of the Publisher.*/
    function issuerAgreement() external view override returns (string memory) {
        return agreement;
    }
    
    /**@dev Returns the Uniform Resource Identifier (URI) for Publisher.*/
    function issuerURI() external view override returns (string memory) {
        return uri;
    }

    function issuer() external view returns (string memory name_, string memory certification_, string memory agreement_, string memory uri_) {
        name_ = name;
        certification_ = certification;
        agreement_ = agreement;
        uri_ = uri;
    }
}