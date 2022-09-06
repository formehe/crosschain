// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../common/Deserialize.sol";
import "../prover/IProver.sol";
import "../factory/ITokenFactory.sol";
import "../../common/codec/LogExtractor.sol";
import "hardhat/console.sol";

contract SubContractor is Initializable{
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

    mapping(uint256 => address) contractGroupMember;
    uint256 chainId;
    address proxy;
    address generalContractor;
    IProver public prover;
    
    //templateId --- address
    mapping(uint256 => address) templateCodes;
    mapping(bytes32 => bool) public usedProofs;

    constructor() {
    }

    function initialize(address generalContractor_, uint256 chainId_, address localProxy_, IProver prover_) external initializer {
        generalContractor = generalContractor_;
        chainId = chainId_;
        proxy = localProxy_;
        prover = prover_;
    }

    function bindTemplate(uint256 templateId, address code) external {
        require(templateCodes[templateId] == address(0), "template has been bound");
        require(Address.isContract(code), "address is not contract");
        templateCodes[templateId] = code;
    }

    function subIssue(bytes memory proof) external {
        VerifiedReceipt memory result= _verify(proof);
        address code =  templateCodes[result.data.templateId];
        require(code != address(0), "template is not exist");

        address asset = ITokenFactory(code).clone(chainId, result.data.generalIssueInfo, result.data.saltId, proxy);
        bytes memory payload = abi.encodeWithSignature("bindAssetGroup(address,uint256)", asset, result.data.contractGroupId);
        (bool success,) = proxy.call(payload);
        require(success, "fail to bind contract group");
        
        // initialize contract;
        emit SubContractorIssue(chainId, result.data.contractGroupId, asset);
    }

    function _saveProof(
        bytes32 proofIndex
    ) internal {
        usedProofs[proofIndex] = true;
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
        require(!usedProofs[proofIndex], "proof is reused");
        _receipt.proofIndex = proofIndex;
    }

    function _parseLog(
        bytes memory log
    ) private pure returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);

        require(logInfo.topics.length == 4, "wrong number of topic");
        bytes32 topics0 = logInfo.topics[0];        
        //require(topics0 == 0x7944a782716b9f3423ef8c7f637efc142aed2c618e1e5234efb20d444dd7d94f, "invalid signature");
        (receipt_.generalIssueInfo) = abi.decode(logInfo.data, (bytes));
        receipt_.templateId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        receipt_.saltId = abi.decode(abi.encodePacked(logInfo.topics[3]), (uint256));
        contractAddress_ = logInfo.contractAddress;
    }
}