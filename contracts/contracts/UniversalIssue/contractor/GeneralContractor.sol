// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../../Top/prover/IEthProver.sol";
import "../factory/ITokenFactory.sol";

contract GeneralContractor is Initializable{
    using Borsh for Borsh.Data;
    using EthProofDecoder for Borsh.Data;

    event SubContractorIssue(
        uint256  indexed chainId,
        uint256  indexed contractGroupId,
        address  indexed asset
    );
    
    struct VerifiedEvent {
        uint256 chainId;
        uint256 contractGroupId;
        address asset;
    }

    struct VerifiedReceipt {
        bytes32 proofIndex;
        VerifiedEvent data;
    }

    struct SubContractorInfo {
        address subContractor;
        IEthProver prover;
    }

    // address --- chainid
    mapping(uint256 => SubContractorInfo) subContractors;
    mapping(uint256 => address[]) contractGroupMember;
    mapping(uint256 => address) templateCodes;

    uint256 public chainId;
    uint256 public saltId;
    uint256 contractGroupId;
    address proxy;
    mapping(uint256 => mapping(bytes32 => bool)) public usedProofs;
    //templateId --- address

    event GeneralContractorIssue(
        uint256 indexed templateId,
        uint256 indexed contractGroupId,
        uint256 indexed saltId,
        bytes issue
    );

    event SubContractorBound(
        uint256 indexed chainId,
        address indexed subContractor,
        address indexed prover
    );

    event CodeTemplateBound(
        uint256 indexed templateId,
        address indexed template
    );

    constructor() {
    }

    function initialize(address localProxy_, uint256 chainId_) external initializer {
        proxy = localProxy_;
        chainId = chainId_;
    }

    function bindSubContractor(uint256 chainId_, address subContractor_, IEthProver prover_) external {
        require(subContractors[chainId_].subContractor == address(0), "chain has been bound");
        require(subContractor_ != address(0), "zero subcontractor address");
        subContractors[chainId_] = SubContractorInfo(subContractor_, prover_);
        emit SubContractorBound(chainId_, subContractor_, address(prover_));
    }

    function bindTemplate(uint256 templateId, address code) external {
        require(templateCodes[templateId] == address(0), "template has been bound");
        require(Address.isContract(code), "address is not contract");
        templateCodes[templateId] = code;
        emit CodeTemplateBound(templateId, code);
    }

    function bindContractGroup(bytes memory proof) external {
        VerifiedReceipt memory receipt = _parseAndConsumeProof(proof);
        contractGroupMember[receipt.data.contractGroupId].push(receipt.data.asset);
        _saveProof(receipt.data.chainId, receipt.proofIndex);

        emit SubContractorIssue(receipt.data.chainId, receipt.data.contractGroupId, receipt.data.asset);
    }

    function issue(uint256 templateId, bytes memory issueInfo) external {
        address code = templateCodes[templateId];
        require(code != address(0), "template is not exist");

        (bytes memory generalIssueInfo, uint256[] memory chainIds) = ITokenFactory(code).issue(issueInfo);
        uint256 saltId = applySaltId();
        uint256 contractGroupId = applyGroupId();
        _checkChains(chainIds);
        address asset = ITokenFactory(code).clone(chainId, generalIssueInfo, saltId);
        bytes memory payload = abi.encodeWithSignature("bindAssetProxyGroup(address,uint256,uint256)", asset, chainId, contractGroupId);
        (bool success, ) = proxy.call(payload);
        require(success, "fail to bind contract group");
        emit GeneralContractorIssue(templateId, contractGroupId, saltId, generalIssueInfo);
    }

    function _checkChains(uint256[] memory chainIds_) internal view {
        for (uint256 i = 0; i < chainIds_.length; i++) {
            require(subContractors[chainIds_[i]].subContractor != address(0), "chain is not bound");
        }
    }

    function applySaltId() internal returns(uint256) {
        return ++saltId;
    }

    function applyGroupId() internal returns(uint256) {
        return ++contractGroupId;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _saveProof(
        uint256 chainId_,
        bytes32 proofIndex_
    ) internal { 
        usedProofs[chainId_][proofIndex_] = true;
    }

    /// Parses the provided proof and consumes it if it's not already used.
    /// The consumed event cannot be reused for future calls.
    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal returns (VerifiedReceipt memory receipt_) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        EthProofDecoder.Proof memory proof = borshData.decode();
        borshData.done();

        address contractAddress;
        (receipt_.data, contractAddress) = _parseLog(proof.logEntryData);
        require(contractAddress != address(0), "Invalid Token lock address");
        // require(subContractors[receipt_.data.chainId].subContractor == contractAddress, "proxy is not bound");

        Deserialize.TransactionReceiptTrie memory receipt = Deserialize.toReceipt(proof.reciptData, proof.logIndex);
        Deserialize.BlockHeader memory header = Deserialize.toBlockHeader(proof.headerData);
        bytes memory reciptIndex = abi.encode(header.number, proof.reciptIndex);
        bytes32 proofIndex = keccak256(reciptIndex);
        // require(limiter.forbiddens(proofIndex) == false, "receipt id has already been forbidden");

        (bool success,) = (subContractors[receipt_.data.chainId].prover).verify(proof, receipt, header.receiptsRoot,header.hash, header.number);
        require(success, "Proof should be valid");
        require(!usedProofs[receipt_.data.chainId][proofIndex], "The burn event proof cannot be reused");
        receipt_.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) internal virtual view returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        
        //subissue
        require(topics0 == 0x60e046922dfd2b185e920419aac28e54bd4b5f0260376067224500f93e02459c, "invalid the function of topics");
        receipt_.chainId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        receipt_.asset = abi.decode(abi.encodePacked(logInfo.topics[3]), (address));
        contractAddress_ = logInfo.contractAddress;
    }
}