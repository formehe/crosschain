// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Issuer.sol";
import "./Right.sol";
import "./ERC721Chunk.sol";
import "../../common/IssueCoder.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
abstract contract ERC3721 is ERC721Chunk, Right, Issuer {
    event RightTokenBound(uint256 indexed from, uint256 indexed rightKind, uint256 indexed rightId);
    event RightTokenDisbound(uint256 indexed from, uint256 indexed rightKind, uint256 indexed rightId);
    
    mapping(uint256 => bytes) private _tokenExtension;
    // tokenid --- rightKind --- rightId
    mapping(uint256 => mapping(uint256 => uint256)) private _tokenRights;
    mapping(uint256 => uint256[]) private _tokenKindIndexes;
    address minter;

    function initialize(
        address minter_,
        string memory name_, 
        string memory symbol_, 
        IssueCoder.RightDescWithId[] memory rights_, 
        IssueCoder.IssuerDesc memory issuer_, 
        IssueCoder.CirculationRangePerchain memory circulation_
    ) external initializer {
        minter = minter_;
        ERC721Chunk.initialize(name_, symbol_, issuer_.uri, circulation_.baseIndexOfToken, circulation_.baseIndexOfToken + circulation_.capOfToken, circulation_.issuer);
        Issuer.initialize(issuer_.name, issuer_.certification, issuer_.agreement, issuer_.uri);
        Right.initialize(circulation_.issuer, rights_, circulation_.rangeOfRights);
    }

    function burn(
        uint256 tokenId
    ) external virtual returns(uint256[] memory rightKinds_, uint256[] memory rightIds_, bytes memory additional_) {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        uint256 len = _tokenKindIndexes[tokenId].length;
        rightKinds_ = new uint256[](len);
        rightIds_ = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            uint256 rightKind = _tokenKindIndexes[tokenId][i];
            uint256 rightId = _tokenRights[tokenId][rightKind];
            _tokenRights[tokenId][rightKind] = 0;
            rightKinds_[i] = rightKind;
            rightIds_[i] = rightId;
            _burnRight(rightKind, rightId);
        }
        additional_ = _tokenExtension[tokenId];
        delete _tokenKindIndexes[tokenId];
        delete _tokenExtension[tokenId];

        _burn(tokenId);
    }

    function burnRight(
        uint256 tokenId,
        uint256 rightkind,
        uint256 rightId
    ) external virtual {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        _burnRight(rightkind, rightId);
        _delRightOfToken(tokenId, rightkind, rightId);
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
    ) external virtual{        
        require(_isApprovedOrOwner(_msgSender(), fromTokenId), "caller is not owner nor approved");
        _delRightOfToken(fromTokenId, rightkind, rightId);
        _addRightOfToken(toTokenId, rightkind, rightId);
    }

    function attachAddtional(uint256 tokenId, bytes memory additional) external virtual {
        require(additional.length != 0, "invalid parameter");
        address owner = ownerOf(tokenId);
        require(owner == issuer(tokenId), "only issuer can add additional of token ");
        require(_tokenExtension[tokenId].length == 0, "additional of token has been bound");
        _tokenExtension[tokenId] = additional;
    }

    /**
    * @dev Attaches Rights type `rightsId` to `tokenId`.
    * Only Publisher allow attach Rights to specific NFT Token
    * Emits an {AttachRights} event.
    */
    function attachRight(
        uint256 tokenId,
        uint256 rightKind,
        uint256 rightId
    ) external virtual{
        address owner = ownerOf(tokenId); 
        require(_isApprovedOrOwner(_msgSender(), tokenId), "not owner or approver");
        _attachRight(owner, rightKind, rightId);
        _addRightOfToken(tokenId, rightKind, rightId);
    }

    function mint(uint256 tokenId_, uint256[] memory rightKinds_, uint256[] memory rightIds_, bytes memory additional, address owner_) external {
        require(_msgSender() == minter, "only for minter");
        require(rightKinds_.length == rightIds_.length, "invalid right kinds or right ids");
        require(owner_ != address(0), "invalid owner");
        _safeMint(owner_, tokenId_);
        for (uint256 i = 0; i < rightKinds_.length; i++) {
            uint256 rightKind = rightKinds_[i];
            uint256 rightId = rightIds_[i];
            _mintRight(rightKind, rightId);
            _addRightOfToken(tokenId_, rightKind, rightId);
            _tokenExtension[tokenId_] = additional;
        }
    }

    function _addRightOfToken(uint256 tokenId, uint256 rightKind, uint256 rightId) internal virtual{
        //cancel approved right and modify owner;
        require(_tokenRights[tokenId][rightKind] == 0, "right has been bound");
        _tokenRights[tokenId][rightKind] = rightId;
        _tokenKindIndexes[tokenId].push(rightKind);
        emit RightTokenBound(tokenId, rightKind, rightId);
    }

    function _delRightOfToken(uint256 tokenId, uint256 rightKind, uint256 rightId) internal {
        require(_tokenRights[tokenId][rightKind] != 0, "right has not been bound");
        delete _tokenRights[tokenId][rightKind];

        //cancel approved right and modify owner;
        uint256 len = _tokenKindIndexes[tokenId].length;
        for (uint i = 0; i < len; i++) {
            if (rightKind != _tokenKindIndexes[tokenId][i]) {
                continue;
            }

            _tokenKindIndexes[tokenId][i] = _tokenKindIndexes[tokenId][len - 1];
            delete _tokenKindIndexes[tokenId][len - 1];
        }

        emit RightTokenDisbound(tokenId, rightKind, rightId);
    }

    //  function _beforeTokenTransfer(
    //     address from,
    //     address to,
    //     uint256 tokenId
    // ) internal override virtual{
    //     if (to != address(0)) {
    //         return;
    //     }

    //     uint256 len = _tokenKindIndexes[tokenId].length;
    //     for (uint i = 0; i < len; i++) {
    //         uint256 rightKind = _tokenKindIndexes[tokenId][i];
    //         uint256 rightId = _tokenRights[tokenId][rightKind];
    //         _tokenRights[tokenId][rightKind] = 0;
    //         _burnRight(rightKind, rightId);
    //     }

    //     delete _tokenKindIndexes[tokenId];
    // }
}