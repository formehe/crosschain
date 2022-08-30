// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../common/IssueCoder.sol";
import "./IERC3721Metadata.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
abstract contract NFRToken is ERC721, Initializable {
    struct RightsOfToken {
        //rightKind---rightId
        mapping(uint256 => uint256[]) partialRights;
    }

    struct RightsOwnership {
        bool    attached;
        address owner;
        address approval;
    }

    IssueCoder.IssuerDesc private issuer;
    
    //rights information
    uint256 rightNums;
    mapping(uint256 => IssueCoder.RightDesc) private rightKinds;
    
    // tokenid --- rightsOwnership
    mapping(uint256 => RightsOfToken) private tokenRights;
    mapping(uint256 => mapping(uint256 => RightsOwnership)) public rights;

    /**@dev Emitted when transferToken fired*/
    event TransferToken(address indexed from, address indexed to, uint256 indexed tokenId);
    
    /**@dev Emitted when transferRights fired*/
    event TransferRight(uint256 indexed from, uint256 indexed to, uint256 indexed rightId); 
    
    /**@dev Emitted when approveRights fired*/
    event ApprovalRight(address indexed from, address indexed to, uint256 indexed tokenId, uint256 rightId);
    
    /**@dev Emitted when createRights fired*/
    event CreateRight(address indexed issuer, uint256 indexed rightId, string name, string agreement, string uri);
    
    /*** @dev Emitted when attachRights fired*/
    event AttachRight(address indexed from, address indexed to, uint256 indexed tokenId, uint256 rightId);
    
    /** @dev Emitted when burnRights fired*/
    event BurnRight(address indexed owner, uint256 indexed tokenId, uint256 indexed rightId);

    function initialize(
        string memory name_, 
        string memory symbol_, 
        IssueCoder.RightDescWithId[] memory rights_, 
        IssueCoder.IssuerDesc memory issuer_, 
        IssueCoder.CirculationRangePerchain memory circulation_
    ) external initializer {
        // name = name_;
        // symbol = symbol_;
        issuer = issuer_;
        for (uint256 i = 0; i < rights_.length; i++) {
            rightKinds[rights_[i].id] = rights_[i].right;
        }

        if (circulation_.capOfToken != 0) {
            _mintToken(issuer_.issuer, circulation_.baseIndexOfToken, circulation_.capOfToken);
        }

        for (uint256 i = 0; i < circulation_.rangeOfRights.length; i++) {
            if ( circulation_.rangeOfRights[i].cap != 0 ) {
                _mintRight(issuer_.issuer, circulation_.rangeOfRights[i].rightId, circulation_.rangeOfRights[i].baseIndex, circulation_.rangeOfRights[i].cap);
            }
        }
    }

    // constructor(string memory name_, string memory symbol_, uint256 baseTokenIndex, uint256 amountOfToken) ERC721(name_, symbol_) {
    //     for (uint256 i = baseTokenIndex; i < baseTokenIndex + amountOfToken; i++) {
    //         _safeMint(issuer.issuer, i);
    //     }
    // }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(false, "unsupport transferFrom method");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(false, "unsupport safeTransferFrom method");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public override {
        require(false, "unsupport safeTransferFrom method");
    }
    
    /**
    * @dev Transfers Token type `tokenId` from address `from` to `to`.
    * @dev Transfers Token type `tokenId` from address `from` to `to`.
    * Emits a {TransferToken} event.
    * 注：要重载 ERC721的safeTransferFrom/transferFrom，并调⽤transferToken 来实现
    */
    function transferToken(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, data);
        
        //cancel approved right and modify owner;
        uint256 len = 0;
        for (uint i = 0; i < rightNums; i++) {
            len = tokenRights[tokenId].partialRights[i].length;
            for (uint j = 0; j < len; j++) {
                _transferRight(to, i, tokenRights[tokenId].partialRights[i][j]);
            }
        }
    }

    function burn(
        address from,
        uint256 tokenId
    ) external returns(uint256[] memory rightKinds_, uint256[] memory rightIds_) {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _burn(tokenId);
        uint256 len = 0;
        rightKinds_ = new uint256[](rightNums);
        rightIds_ = new uint256[](rightNums);
        for (uint i = 0; i < rightNums; i++) {
            len = tokenRights[tokenId].partialRights[i].length;
            for (uint j = 0; j < len; j++) {
                _burnRight(i, tokenRights[tokenId].partialRights[i][j]);
            }
            rightKinds_[i] = i;
            rightIds_[i] = tokenRights[tokenId].partialRights[i][0];
        }
    }
    
    /**
    * @dev Transfers Rights type `rightsId` from token type `from` to `to`.
    * msg.sender must be owner of fromToken
    * Emits a {TransferRights} event.
    */
    function transferRight(
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 rightkind,
        uint256 rightId,
        bytes calldata data
    ) external {
        require(_isRightApprovedOrOwner(_msgSender(), rightkind, rightId), "no right ownership");
        _transferRight(ownerOf(toTokenId), rightkind, rightId);
        _delRightOfToken(fromTokenId, rightkind, rightId);
        _addRightOfToken(toTokenId, rightkind, rightId);
    }

    /**
    * @dev Approve Rights type `rightsId` of token to Operator.
    * Emits an {RightsApproval} event.
    */
    function approveRight(
        address approver,
        uint256 rightkind,
        uint256 rightId
    ) external {
        require(_isOwnerOfRight(_msgSender(), rightkind, rightId), "not owner of right");
        rights[rightkind][rightId].approval = approver;
    }

    /**
    * @dev Attaches Rights type `rightsId` to `tokenId`.
    * Only Publisher allow attach Rights to specific NFT Token
    * Emits an {AttachRights} event.
    */
    function attachRight(
        uint256 tokenId,
        uint256 rightkind,
        uint256 rightId
    ) external {
        require(!_isRightAttached(rightkind, rightId), "right has been attached");
        require(_isRightApprovedOrOwner(_msgSender(), rightkind, rightId), "can not attach");
        _transferRight(ownerOf(tokenId), rightkind, rightId);
        _addRightOfToken(tokenId, rightkind, rightId);
    }
    
    /**
    * @dev Attaches Rights type `rightsId` to `tokenId`.
    * Only Owner of Token allow to burn rights
    * Emits an {BurnRights} event.
    */
    function burnRights(
        uint256 tokenId,
        uint256 rightkind,
        uint256 rightId,
        bytes calldata data
    ) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "no right to burn rights");
        _delRightOfToken(tokenId, rightkind, rightId);
        _burnRight(rightkind, rightId);
    }

    function _isOwnerOfRight(address spender, uint256 rightkind, uint256 rightId) internal view returns (bool) {
        RightsOwnership memory ownership = rights[rightkind][rightId];
        require(ownership.owner != address(0), "right is not existed");

        return (spender == ownership.owner);
    }

    function _isRightApprovedOrOwner(address spender, uint256 rightkind, uint256 rightId) internal view returns (bool) {     
        RightsOwnership memory ownership = rights[rightkind][rightId];
        require(ownership.owner != address(0), "right is not existed");
        address approver = ownership.approval;
        address owner = ownership.owner;

        return ((ownership.approval == spender) || (ownership.owner == spender));
    }

    function _isRightAttached(uint256 rightkind, uint256 rightId) internal view returns (bool) {
        RightsOwnership memory ownership = rights[rightkind][rightId];
        require(ownership.owner != address(0), "right is not existed");
        return ownership.attached;
    }

    function _delRightOfToken(uint256 tokenId, uint256 rightkind, uint256 rightId) internal {
        //cancel approved right and modify owner;
        uint256 len = 0;
        len = tokenRights[tokenId].partialRights[rightkind].length;
        for (uint i = 0; i < len; i++) {
            if (rightId != tokenRights[tokenId].partialRights[rightkind][i]) {
                continue;
            }

            tokenRights[tokenId].partialRights[rightkind][i] = tokenRights[tokenId].partialRights[rightkind][len - 1];
            delete tokenRights[tokenId].partialRights[rightkind][len - 1];
            return;
        }

        require(false, "right is not belong to token");
    }

    function mint(uint256 tokenId_, uint256[] memory rightKinds_, uint256[] memory rightIds_, address owner_) external {
        // check
        _mintToken(owner_, tokenId_);
        for (uint256 i = 0; i < rightKinds_.length; i++) {
            _addRightOfToken(tokenId_, rightKinds_[i], rightIds_[i]);    
        }
    }

    function _addRightOfToken(uint256 tokenId, uint256 rightkind, uint256 rightId) internal {
        //cancel approved right and modify owner;
        tokenRights[tokenId].partialRights[rightkind].push(rightId);
    }

    function _mintToken(address owner, uint256 baseIndex, uint256 amount) internal {
        for (uint i = baseIndex; i <= baseIndex + amount; i++)
        {
            _mintToken(owner, i);
        }
    }

    function _mintToken(address owner, uint256 tokenId) internal {
        _safeMint(owner, tokenId);
    }

    function _burnToken(uint256 tokenId) internal {
        _burn(tokenId);
    }

    function _mintRight(address owner, uint256 rightkind, uint256 baseIndex, uint256 amount) internal {
        for (uint i = baseIndex; i <= baseIndex + amount; i++)
        {
            _mintRight(owner, rightkind, i);
        }
    }

    function _transferRight(address newOwner, uint256 rightkind, uint256 rightId) internal {
        rights[rightkind][rightId] = RightsOwnership({
            attached: true,
            owner: newOwner,
            approval: address(0)
        });
    }

    function _mintRight(address owner, uint256 rightkind, uint256 rightId) internal {
        RightsOwnership memory ownership = rights[rightkind][rightId];
        require(ownership.owner == address(0), "right is exist");
        rights[rightkind][rightId] = RightsOwnership({
            attached: false,
            owner: owner,
            approval: address(0)
        });
    }

    function _burnRight(uint256 rightkind, uint256 rightId) internal {
        RightsOwnership memory ownership = rights[rightkind][rightId];
        require(ownership.owner != address(0), "right is not existed");
        rights[rightkind][rightId] = RightsOwnership({
            attached: false,
            owner: address(0),
            approval: address(0)
        });
    }

    //======================== IERC3721Metadata =================================
    /** @dev Returns the Name of the Rights. */
    function rightsName(uint256 rightkind) external view returns (string memory) {
        return rightKinds[rightkind].name;
    }
    
    /** @dev Returns the Agreement of the Rights.*/
    function rightsAgreement(uint256 rightkind) external view returns (string memory) {
        return rightKinds[rightkind].agreement;
    }
    
    /** @dev Returns the Uniform Resource Identifier (URI) for `rightsId` Rights.*/
    function rightsURI(uint256 rightkind) external view returns (string memory) {
        return rightKinds[rightkind].uri;
    }
    
    ////////////////////////////////////////////////////////////////////////////
    /**@dev Returns the Name of the Publisher.*/
    function issuerName() external view returns (string memory) {
        return issuer.name;
    }
    
    /**@dev Returns the Certification of the Publisher.*/
    function issuerCertification() external view returns (string memory) {
        return issuer.certification;
    }
    
    /**@dev Returns the Agreement of the Publisher.*/
    function issuerAgreement() external view returns (string memory) {
        return issuer.agreement;
    }
    
    /**@dev Returns the Uniform Resource Identifier (URI) for Publisher.*/
    function issuerURI() external view returns (string memory) {
        return issuer.uri;
    }
}