// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../common/Deserialize.sol";
import "../prover/IProver.sol";
import "../factory/ITokenFactory.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/AdminControlledUpgradeable.sol";
import "hardhat/console.sol";

contract SubContractor is AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;
    
    struct VerifiedEvent {
        uint256 templateId;
        uint256 contractGroupId;
        uint256 saltId;
        bytes   generalIssueInfo;
    }

    struct VerifiedReceipt {
        bytes32 proofIndex;
        VerifiedEvent data;
    }

    event SubContractorIssue(
        uint256  indexed chainId,
        uint256  indexed contractGroupId,
        address  indexed asset
    );

    event UsedGeneralContractProof(
        bytes32 proofIndex
    );

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_SUBISSUE = 1 << 0;

    bytes32 constant BLACK_SUBISSUE_ROLE = 0x087a187a71e9e5b54c3383aee32fc61034bba2d99b832059c9b4af6707503c43;//keccak256("BLACK.SUBISSUE.ROLE")

    // groupid --- templateid
    mapping(uint256 => address) localContractGroupAsset;
    uint256 chainId;
    address proxy;
    address generalContractor;
    IProver public prover;
    
    //templateId --- address
    mapping(uint256 => address) templateCodes;
    mapping(bytes32 => bool) public usedProofs;

    function initialize(address generalContractor_, uint256 chainId_, address localProxy_, IProver prover_, address owner_) external initializer {
        require(owner_ != address(0), "invalid owner");
        require(Address.isContract(generalContractor_), "invalid general contractor");
        require(Address.isContract(localProxy_), "invalid local proxy");

        generalContractor = generalContractor_;
        chainId = chainId_;
        proxy = localProxy_;
        prover = prover_;

        _AdminControlledUpgradeable_init(_msgSender(), 0);
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        
        _setRoleAdmin(CONTROLLED_ROLE, ADMIN_ROLE);
        
        _setRoleAdmin(BLACK_SUBISSUE_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, owner_);
        _grantRole(ADMIN_ROLE, _msgSender());
    }

    function bindTemplate(uint256 templateId, address code) external onlyRole(ADMIN_ROLE){
        require(templateCodes[templateId] == address(0), "template has been bound");
        require(Address.isContract(code), "address is not contract");
        templateCodes[templateId] = code;
    }

    function subIssue(bytes memory proof) external accessable_and_unpauseable(BLACK_SUBISSUE_ROLE, PAUSED_SUBISSUE){
        VerifiedReceipt memory result= _verify(proof);
        address code =  templateCodes[result.data.templateId];
        require(code != address(0), "template is not exist");
        address asset = ITokenFactory(code).clone(chainId, result.data.generalIssueInfo, result.data.saltId, proxy);
        bytes memory payload = abi.encodeWithSignature("bindAssetGroup(address,uint256)", asset, result.data.contractGroupId);
        (bool success,) = proxy.call(payload);
        require(success, "fail to bind contract group");
        localContractGroupAsset[result.data.contractGroupId] = asset;
        emit SubContractorIssue(chainId, result.data.contractGroupId, asset);
    }

    function _saveProof(
        bytes32 proofIndex
    ) internal {
        require(!usedProofs[proofIndex], "proof is reused");
        usedProofs[proofIndex] = true;
        emit UsedGeneralContractProof(proofIndex);
    }

    /// verify
    function _verify( bytes memory proofData) internal returns (VerifiedReceipt memory receipt_){
        receipt_ = _parseAndConsumeProof(proofData);
        _saveProof(receipt_.proofIndex);
        return receipt_;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal returns (VerifiedReceipt memory _receipt) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        bytes memory log = borshData.decode();
        // borshData.done();

        address contractAddress;
        (_receipt.data, contractAddress) = _parseLog(log);
        require(contractAddress != address(0), "general contractor address is zero");
        require(contractAddress == generalContractor, "general contractor address is error");

        // require(limit.forbiddens(proofIndex) == false, "tx is forbidden");
        (bool success, bytes32 proofIndex) = prover.verify(proofData);
        require(success, "proof is invalid");
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) private pure returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "wrong number of topic");

        //GeneralContractorIssue    
        require(logInfo.topics[0] == 0x8dfe5a421d6022c8b67da5c0acc654ce179fa7c7ba0ddda3fabd5f126d9198e9, "invalid signature");
        (receipt_.generalIssueInfo) = abi.decode(logInfo.data, (bytes));
        receipt_.templateId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        receipt_.saltId = abi.decode(abi.encodePacked(logInfo.topics[3]), (uint256));
        contractAddress_ = logInfo.contractAddress;
    }
}