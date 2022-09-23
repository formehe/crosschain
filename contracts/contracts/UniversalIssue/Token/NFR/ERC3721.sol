// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Issuer.sol";
import "./Right.sol";
import "./ERC721Chunk.sol";
import "../../common/IssueCoder.sol";
import "hardhat/console.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
abstract contract ERC3721 is ERC721Chunk, Right, Issuer {
    event TokenRightBound(uint256 indexed tokenId, uint256 indexed rightKind, uint256 indexed rightId);
    event TokenRightDisbound(uint256 indexed tokenId, uint256 indexed rightKind, uint256 indexed rightId);
    event TokenRightTansfered(uint256 indexed fromTokenId, uint256 toTokenId, uint256 indexed rightKind, uint256 indexed rightId);
    event TokenAttached(uint256 indexed tokenId, bytes additional);
    event TokenRightBurned(uint256 indexed tokenId, uint256 indexed rightKind, uint256 indexed rightId);
    
    mapping(uint256 => bytes) private _tokenExtension;
    // tokenid --- rightKind --- rightId
    mapping(uint256 => mapping(uint256 => uint256)) private _tokenRights;
    mapping(uint256 => uint256[]) private _tokenKinds;
    address minter;

    function initialize(
        address minter_,
        string memory name_, 
        string memory symbol_,
        uint256 totalAmount,
        IssueCoder.IssueRight[] memory rights_, 
        IssueCoder.IssuerDesc memory issuer_, 
        IssueCoder.CirculationRangePerchain memory circulation_
    ) external initializer {
        require(minter_ != address(0), "minter can not be 0");
        minter = minter_;
        ERC721Chunk.initialize(name_, symbol_, issuer_.uri, circulation_.baseIndexOfToken, circulation_.baseIndexOfToken + circulation_.capOfToken, circulation_.issuer, totalAmount);
        Issuer.initialize(issuer_.name, issuer_.certification, issuer_.agreement, issuer_.uri);
        Right.initialize(circulation_.issuer, rights_, circulation_.rangeOfRights);
    }

    function burn(
        uint256 tokenId
    ) external virtual returns(uint256[] memory rightKinds_, uint256[] memory rightIds_, bytes memory additional_) {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        uint256 len = _tokenKinds[tokenId].length;
        rightKinds_ = new uint256[](len);
        rightIds_ = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            uint256 rightKind = _tokenKinds[tokenId][i];
            uint256 rightId = _tokenRights[tokenId][rightKind];
            _tokenRights[tokenId][rightKind] = 0;
            rightKinds_[i] = rightKind;
            rightIds_[i] = rightId;
            _burnRight(rightKind, rightId);
        }
        additional_ = _tokenExtension[tokenId];
        delete _tokenKinds[tokenId];
        delete _tokenExtension[tokenId];

        _burn(tokenId);
    }

    function burnRight(
        uint256 tokenId,
        uint256 rightKind,
        uint256 rightId
    ) external virtual {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        _delRightOfToken(tokenId, rightKind, rightId);
        _burnRight(rightKind, rightId);
        emit TokenRightBurned(tokenId, rightKind, rightId);
    }
    
    /**
    * @dev Transfers Rights type `rightsId` from token type `from` to `to`.
    * msg.sender must be owner of fromToken
    * Emits a {TransferRights} event.
    */
    function transferRight(
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 rightKind,
        uint256 rightId,
        bytes calldata data
    ) external virtual{        
        require(_isApprovedOrOwner(_msgSender(), fromTokenId), "caller is not owner nor approved");
        _delRightOfToken(fromTokenId, rightKind, rightId);
        _addRightOfToken(toTokenId, rightKind, rightId);
        emit TokenRightTansfered(fromTokenId, toTokenId, rightKind, rightId);
    }

    function attachAddtional(uint256 tokenId, bytes memory additional) external virtual {
        require(additional.length != 0, "invalid parameter");
        address owner = ownerOf(tokenId);
        require(owner == issuer(tokenId), "only issuer can add additional of token");
        require(_tokenExtension[tokenId].length == 0, "additional of token has been bound");
        _tokenExtension[tokenId] = additional;
        emit TokenAttached(tokenId, additional);
    }

    function tokenAddtional(uint256 tokenId) external virtual returns(bytes memory){
        return _tokenExtension[tokenId];
    }

    /**
    * @dev Attaches Rights type `rightKind` to `tokenId`.
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

    function tokenRights(uint256 tokenId) external virtual returns(uint256[] memory rightKinds, uint256[] memory rightIds){
        uint256 len = _tokenKinds[tokenId].length;
        rightKinds = new uint256[](len);
        rightIds = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            uint256 rightKind = _tokenKinds[tokenId][i];
            rightKinds[i] = rightKind;
            rightIds[i] = _tokenRights[tokenId][rightKind];
        }
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
        _tokenKinds[tokenId].push(rightKind);
        emit TokenRightBound(tokenId, rightKind, rightId);
    }

    function _delRightOfToken(uint256 tokenId, uint256 rightKind, uint256 rightId) internal {
        require(_tokenRights[tokenId][rightKind] == rightId, "right has not been bound");
        delete _tokenRights[tokenId][rightKind];

        //cancel approved right and modify owner;
        uint256 len = _tokenKinds[tokenId].length;
        for (uint i = 0; i < len; i++) {
            if (rightKind != _tokenKinds[tokenId][i]) {
                continue;
            }

            _tokenKinds[tokenId][i] = _tokenKinds[tokenId][len - 1];
            delete _tokenKinds[tokenId][len - 1];
        }

        emit TokenRightDisbound(tokenId, rightKind, rightId);
    }
}