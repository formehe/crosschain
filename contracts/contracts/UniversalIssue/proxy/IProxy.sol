// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";
import "../prover/IProver.sol";

abstract contract IProxy {
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;
    
    struct VerifiedEvent {
        uint256 fromChain;
        uint256 toChain;
        uint256 contractGroupId;
        address asset;
        bytes   burnInfo;
    }

    struct VerifiedReceipt {
        bytes32 proofIndex;
        VerifiedEvent data;
    }

    struct PeerChainInfo {
        address prover;
        address proxy;
    }

    mapping(uint256 => PeerChainInfo) public peers;

    function _bindPeerChain(uint256 chainId_, address prover_, address peerProxy_) internal {
        require (peers[chainId_].prover == address(0), "chain had bind prove");
        require (prover_ != address(0), "address of prover can not be 0");
        require (peerProxy_ != address(0), "address of proxy can not be 0");
        peers[chainId_] = PeerChainInfo(prover_, peerProxy_);
    }

    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal returns (VerifiedReceipt memory receipt_) {
        address contractAddress;
        (receipt_.data, contractAddress) = _parseBurnProofLog(proofData);

        PeerChainInfo memory peer = peers[receipt_.data.fromChain];
        require(peer.proxy != address(0), "peer is not bound");
        require((contractAddress != address(0) && peer.proxy == contractAddress), "Invalid Token lock address");
        (bool success, bytes32 proofIndex) = IProver(peer.prover).verify(proofData);
        require(success, "Proof should be valid");
        receipt_.proofIndex = proofIndex;
    }

    function _parseBurnProofLog(bytes memory proof) private view returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Borsh.Data memory borshData = Borsh.from(proof);
        bytes memory log = borshData.decode();
        borshData.done();
        
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");
        bytes32 topics0 = logInfo.topics[0];
        
        //require(topics0 == 0x60e046922dfd2b185e920419aac28e54bd4b5f0260376067224500f93e02459c, "invalid the function of topics");
        receipt_.fromChain = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.toChain = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[3]), (uint256));
        (receipt_.asset, receipt_.burnInfo) = abi.decode(logInfo.data, (address, bytes));
        contractAddress_ = logInfo.contractAddress;
    }
}