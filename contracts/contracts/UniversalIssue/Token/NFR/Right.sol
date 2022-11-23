// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IRightMetadata.sol";
import "../../common/IssueCoder.sol";

/**
* @dev Required interface of an ERC3721 compliant contract.
*/
abstract contract Right is Initializable, IRightMetadata {
    event RightAttached(uint256 indexed rightKind, uint256 amount);
    
    struct RightInfo {
        string name;
        string uri;
        string agreement;
        uint256 totalAmount;
    }

    enum State{UNATTACHED, ATTACHED, BURNED}

    //store the id of right kind
    uint256[] private _rightKindIndexes;
    mapping(uint256 => RightInfo) private _rightKinds;
    mapping(uint256 => uint256) public _rightRemains;
    
    function initialize(
        IssueCoder.IssueRight[] calldata rigthKinds_,
        IssueCoder.CirculationPerRight[] calldata rightRanges_
    ) internal onlyInitializing {
        for (uint256 i = 0; i < rigthKinds_.length; i++) {
            uint256 rightKind = rigthKinds_[i].id;
            require(bytes(rigthKinds_[i].right.name).length != 0, "right name can not be zero");
            _rightKindIndexes.push(rightKind);
            _rightKinds[rightKind] = RightInfo(rigthKinds_[i].right.name, rigthKinds_[i].right.uri, rigthKinds_[i].right.agreement, rigthKinds_[i].totalAmount);
        }

        for (uint256 i = 0; i < rightRanges_.length; i++) {
            uint256 rightKind = rightRanges_[i].id;
            require(bytes(_rightKinds[rightKind].name).length != 0, "invalid right");
            _rightRemains[rightKind] = rightRanges_[i].amount;
        }
    }

    function _checkRight(
        uint256 rightKind
    ) internal virtual view{
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
    }

    function _attachRight(
        uint256 rightKind
    ) internal virtual{
        require(bytes(_rightKinds[rightKind].name).length != 0, "right kind is not exist");
        require(_rightRemains[rightKind] != 0, "no right");
        _rightRemains[rightKind]--;
        emit RightAttached(rightKind, 1);
    }

    function rightKinds() internal view returns(uint256[] memory) {
        return _rightKindIndexes;
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
}