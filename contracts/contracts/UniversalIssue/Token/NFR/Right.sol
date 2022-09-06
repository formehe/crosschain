// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IRightMetadata.sol";
import "../../common/IssueCoder.sol";

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
        IssueCoder.RightDescWithId[] memory rigthKinds_,
        IssueCoder.RightRange[] memory rightRanges_
    ) public onlyInitializing {
        require(owner_ != address(0), "opertion can not be 0");
        _owner = owner_;

        for (uint256 i = 0; i < rigthKinds_.length; i++) {
            uint256 rightKind = rigthKinds_[i].id;
            _rightKindIndexes.push(rightKind);
            _rightKinds[rightKind] = RightInfo(rigthKinds_[i].right.name, rigthKinds_[i].right.uri, rigthKinds_[i].right.agreement);
        }

        for (uint256 i = 0; i < rightRanges_.length; i++) {
            uint256 rightKind = rightRanges_[i].id;
            require(bytes(_rightKinds[rightKind].name).length != 0, "invalid right");
            _rightRanges[rightKind] = RightScope(rightRanges_[i].baseIndex, rightRanges_[i].baseIndex + rightRanges_[i].cap);
        }
    }

    function _attachRight(address owner, uint256 rightKind, uint256 rightId) internal virtual{
        require(rightId != 0, "rightId can not be 0");
        require(_owner == owner, "just owner can attach");
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
        require(_stateOfRights[rightKind][rightId] == State.UNATTACHED, "token right has been bound");
        RightScope memory range = _rightRanges[rightKind];
        require((rightId >= range.minId) && (rightId < range.maxId), "token right id is out of range");
        _stateOfRights[rightKind][rightId] = State.ATTACHED;
        emit RightAttached(rightKind, rightId);
    }

    function _mintRight(uint256 rightKind, uint256 rightId) internal {
        require(rightId != 0, "invalid token right id");
        require(bytes(_rightKinds[rightKind].name).length != 0, "token right kind is not exist");
        require(_stateOfRights[rightKind][rightId] != State.ATTACHED, "right");
        _stateOfRights[rightKind][rightId] = State.ATTACHED;
        emit RightMinted(rightKind, rightId);
    }

    function _burnRight(uint256 rightKind, uint256 rightId) internal {
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
        require(_stateOfRights[rightKind][rightId] == State.ATTACHED, "right is unattched");
        _stateOfRights[rightKind][rightId] = State.BURNED;
        emit RightBurned(rightKind, rightId);
    }

    //======================== IERC3721Metadata =================================
    /** @dev Returns the Name of the Rights. */
    function rightsName(uint256 rightKind) external view override returns (string memory) {
        return _rightKinds[rightKind].name;
    }
    
    /** @dev Returns the Agreement of the Rights.*/
    function rightsAgreement(uint256 rightKind) external view override returns (string memory) {
        return _rightKinds[rightKind].agreement;
    }
    
    /** @dev Returns the Uniform Resource Identifier (URI) for `rightsId` Rights.*/
    function rightsURI(uint256 rightKind) external view override returns (string memory) {
        return _rightKinds[rightKind].uri;
    }
}