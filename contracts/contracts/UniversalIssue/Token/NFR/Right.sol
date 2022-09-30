// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IRightMetadata.sol";
import "../../common/IssueCoder.sol";
import "hardhat/console.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
abstract contract Right is Initializable, IRightMetadata {
    event RightAttached(uint256 indexed rightKind, uint256 indexed rightId);
    event RightBurned(uint256 indexed rightKind, uint256 indexed rightId);
    event RightMinted(uint256 indexed rightKind, uint256 indexed rightId);
    
    struct RightInfo {
        string name;
        string uri;
        string agreement;
        uint256 totalAmount;
    }

    struct RightScope {
        uint256 minId;
        uint256 maxId;
    }

    enum State{UNATTACHED, ATTACHED, BURNED}

    //store the id of right kind
    uint256[] private _rightKindIndexes;
    // rightKind id ---- right
    mapping(uint256 => RightInfo) private _rightKinds;
    mapping(uint256 => RightScope) private _rightRanges;
    address private _owner;

    mapping(uint256 => mapping(uint256 => State)) private _stateOfRights;
    
    function initialize(
        address owner_,
        IssueCoder.IssueRight[] memory rigthKinds_,
        IssueCoder.RightRange[] memory rightRanges_
    ) internal onlyInitializing {
        require(owner_ != address(0), "opertion can not be 0");
        _owner = owner_;

        for (uint256 i = 0; i < rigthKinds_.length; i++) {
            uint256 rightKind = rigthKinds_[i].id;
            _rightKindIndexes.push(rightKind);
            _rightKinds[rightKind] = RightInfo(rigthKinds_[i].right.name, rigthKinds_[i].right.uri, rigthKinds_[i].right.agreement, rigthKinds_[i].totalAmount);
        }

        for (uint256 i = 0; i < rightRanges_.length; i++) {
            uint256 rightKind = rightRanges_[i].id;
            require(bytes(_rightKinds[rightKind].name).length != 0, "invalid right");
            require(rightRanges_[i].baseIndex != 0, "right id cannot be 0");
            _rightRanges[rightKind] = RightScope(rightRanges_[i].baseIndex, rightRanges_[i].baseIndex + rightRanges_[i].cap);
        }
    }

    function _attachRight(
        address owner,
        uint256 rightKind,
        uint256 rightId
    ) internal virtual{
        require(rightId != 0, "rightId can not be 0");
        require(_owner == owner, "just owner can attach");
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
        require(rightId <= _rightKinds[rightKind].totalAmount, "right id is overflow");
        require(_stateOfRights[rightKind][rightId] == State.UNATTACHED, "token right has been bound");
        RightScope memory range = _rightRanges[rightKind];
        require((rightId >= range.minId) && (rightId < range.maxId), "token right id is out of range");
        _stateOfRights[rightKind][rightId] = State.ATTACHED;
        emit RightAttached(rightKind, rightId);
    }

    function _mintRight(
        uint256 rightKind,
        uint256 rightId
    ) internal {
        require(rightId != 0, "rightId can not be 0");
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
        require(rightId <= _rightKinds[rightKind].totalAmount, "right id is overflow");
        require(_stateOfRights[rightKind][rightId] != State.ATTACHED, "right is not attached");
        _stateOfRights[rightKind][rightId] = State.ATTACHED;
        emit RightMinted(rightKind, rightId);
    }

    function _burnRight(
        uint256 rightKind,
        uint256 rightId
    ) internal {
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
        require(_stateOfRights[rightKind][rightId] == State.ATTACHED, "right is not attached");
        _stateOfRights[rightKind][rightId] = State.BURNED;
        emit RightBurned(rightKind, rightId);
    }

    //======================== IERC3721Metadata =================================
    /** @dev Returns the Name of the Rights. */
    function rightsName(
        uint256 rightKind
    ) external view override returns (string memory) {
        return _rightKinds[rightKind].name;
    }
    
    /** @dev Returns the Agreement of the Rights.*/
    function rightsAgreement(
        uint256 rightKind
    ) external view override returns (string memory) {
        return _rightKinds[rightKind].agreement;
    }
    
    /** @dev Returns the Uniform Resource Identifier (URI) for `rightsId` Rights.*/
    function rightsURI(
        uint256 rightKind
    ) external view override returns (string memory) {
        return _rightKinds[rightKind].uri;
    }

    function rights() external view returns (IssueCoder.IssueRight[] memory rigthKinds_) {
        uint256 len = _rightKindIndexes.length;
        rigthKinds_ = new IssueCoder.IssueRight[](len);
        for (uint256 i = 0; i < len; i++) {
            uint256 id = _rightKindIndexes[i];
            RightInfo memory rightInfo = _rightKinds[id];
            IssueCoder.IssueRight memory rightDescWithId;
            rightDescWithId.id = id;
            rightDescWithId.totalAmount = rightInfo.totalAmount;
            rightDescWithId.right.name = rightInfo.name;
            rightDescWithId.right.uri = rightInfo.uri;
            rightDescWithId.right.agreement = rightInfo.agreement;
            rigthKinds_[i] = rightDescWithId;
        }
    }
    
    function rightIssueRange(
        uint256 rightkind
    ) external view returns (uint256 minId, uint256 maxId){
        return (_rightRanges[rightkind].minId, _rightRanges[rightkind].maxId);
    }
}