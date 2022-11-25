// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Issuer.sol";
import "./Right.sol";
import "./ERC721Chunk.sol";
import "../../common/IssueCoder.sol";
import "../ProxyRegistry.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
contract ERC3721 is ERC721Chunk, Right, Issuer {
    event IncreaseTokenRights(uint256 indexed tokenId, uint256 indexed rightKind, uint256 amount);
    event DecreaseTokenRights(uint256 indexed tokenId, uint256 indexed rightKind, uint256 amount);
    event TransferTokenRights(uint256 indexed fromTokenId, uint256 toTokenId, uint256 indexed rightKind, uint256 amount);
    event AttachTokenAdditional(uint256 indexed tokenId, bytes additional);
    event BurnTokenRights(uint256 indexed tokenId, uint256 indexed rightKind, uint256 amount);
    event AttachTokenRight(uint256 indexed tokenId, uint256 indexed rightKind, uint256 amount);
    event BurnToken(uint256 indexed tokenId);
    event MintToken(uint256 indexed tokenId);
    
    mapping(uint256 => bytes) private _tokenExtension;
    mapping(uint256 => mapping(uint256 => uint256)) private _tokenRights;
    address minter;

    function initialize(
        address minter_,
        string memory name_,
        string memory symbol_,
        uint256 totalAmount,
        IssueCoder.IssueRight[] calldata rights_,
        IssueCoder.IssuerDesc calldata issuer_,
        IssueCoder.CirculationRangePerchain calldata circulation_
    ) external initializer {
        require(minter_ != address(0), "minter can not be 0");
        minter = minter_;
        ERC721Chunk.initialize(name_, symbol_, issuer_.uri, circulation_.baseIndexOfToken, circulation_.baseIndexOfToken + circulation_.capOfToken, circulation_.issuer, totalAmount);
        Issuer.initialize(issuer_.name, issuer_.certification, issuer_.agreement, issuer_.uri);
        Right.initialize(rights_, circulation_.rangeOfRights);
    }

    function burn(
        uint256 tokenId
    ) external virtual returns(uint256[] memory rightKinds_, uint256[] memory rightQuantities_, bytes memory additional_) {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        rightKinds_ = rightKinds();
        uint256 len = rightKinds_.length;
        rightQuantities_ = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            uint256 rightKind = rightKinds_[i];
            uint256 amount = _tokenRights[tokenId][rightKind];
            rightQuantities_[i] = amount;
            if (amount != 0) {
                delete _tokenRights[tokenId][rightKind];
            }
        }
        additional_ = _tokenExtension[tokenId];
        delete _tokenExtension[tokenId];

        _burn(tokenId);
        emit BurnToken(tokenId);
    }

    function burnRights(
        uint256 tokenId,
        uint256 rightKind
    ) external virtual {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "caller is not owner nor approved");
        _delRightOfToken(tokenId, rightKind, 1);
        _approve(address(0), tokenId);
        emit BurnTokenRights(tokenId, rightKind, 1);
    }
    
    /**
    * @dev Transfers Rights type `rightsId` from token type `from` to `to`.
    * msg.sender must be owner of fromToken
    * Emits a {TransferRights} event.
    */
    function transferRights(
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 rightKind,
        bytes calldata data
    ) external virtual{      
        require(fromTokenId != toTokenId, "from token and to token can not equal");
        require(_exists(toTokenId), "to token is not exist");
        require(_isApprovedOrOwner(_msgSender(), fromTokenId), "caller is not owner nor approved");
        _delRightOfToken(fromTokenId, rightKind, 1);
        _addRightOfToken(toTokenId, rightKind, 1);
        _approve(address(0), fromTokenId);
        emit TransferTokenRights(fromTokenId, toTokenId, rightKind, 1);
    }

    function attachAdditional(
        uint256 tokenId,
        bytes memory additional
    ) external virtual {
        require(additional.length != 0, "invalid parameter");
        address owner = ownerOf(tokenId);
        require(owner == issuer(tokenId), "only issuer can add additional of token");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "not owner or approver");
        require(_tokenExtension[tokenId].length == 0, "additional of token has been bound");
        _tokenExtension[tokenId] = additional;
        _approve(address(0), tokenId);
        emit AttachTokenAdditional(tokenId, additional);
    }

    function tokenAdditional(
        uint256 tokenId
    ) external virtual view returns(bytes memory){
        return _tokenExtension[tokenId];
    }

    /**
    * @dev Attaches Rights type `rightKind` to `tokenId`.
    * Only Publisher allow attach Rights to specific NFT Token
    * Emits an {AttachRights} event.
    */
    function attachRight(
        uint256 tokenId,
        uint256 rightKind
    ) external virtual{
        address owner = ownerOf(tokenId);
        require(owner == issuer(tokenId), "only issuer can attach right of token");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "not owner or approver");
        _attachRight(rightKind);
        _addRightOfToken(tokenId, rightKind, 1);
        _approve(address(0), tokenId);
        emit AttachTokenRight(tokenId, rightKind, 1);
    }

    function tokenRights(
        uint256 tokenId
    ) external virtual returns(uint256[] memory rightKinds_, uint256[] memory rightQuantities_) {
        rightKinds_ = rightKinds();
        uint256 len = rightKinds_.length;
        rightQuantities_ = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            uint256 rightKind = rightKinds_[i];
            rightQuantities_[i] = _tokenRights[tokenId][rightKind];
        }
    }

    function mint(
        uint256 tokenId_,
        uint256[] memory rightKinds_,
        uint256[] memory rightQuantities_,
        bytes memory additional,
        address owner_
    ) external virtual {
        require(_msgSender() == ProxyRegistry(minter).proxy(), "only for minter");
        require(rightKinds_.length == rightQuantities_.length, "invalid right kind numbers");
        require(owner_ != address(0), "invalid owner");
        require(tokenId_ != 0, "token id can not be 0");
        _safeMint(owner_, tokenId_);
        for (uint256 i = 0; i < rightKinds_.length; i++) {
            uint256 rightKind = rightKinds_[i];
            uint256 amount = rightQuantities_[i];
            _checkRight(rightKind);
            if (amount != 0) {
                _addRightOfToken(tokenId_, rightKind, amount);
            }
        }
        _tokenExtension[tokenId_] = additional;
        emit MintToken(tokenId_);
    }

    function _addRightOfToken(
        uint256 tokenId,
        uint256 rightKind,
        uint256 amount
    ) internal virtual{
        _tokenRights[tokenId][rightKind] += amount;
        emit IncreaseTokenRights(tokenId, rightKind, amount);
    }

    function _delRightOfToken(
        uint256 tokenId,
        uint256 rightKind,
        uint256 amount
    ) internal virtual{
        require(amount != 0, "amount cant not be 0");
        require(_tokenRights[tokenId][rightKind] >= amount, "has no right");
        _tokenRights[tokenId][rightKind] -= amount;
        emit DecreaseTokenRights(tokenId, rightKind, amount);
    }
}