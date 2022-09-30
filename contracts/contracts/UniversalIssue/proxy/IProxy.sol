// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "../../common/codec/LogExtractor.sol";
import "../../common/Deserialize.sol";
import "../prover/IProver.sol";
import "../../common/AdminControlledUpgradeable.sol";

abstract contract IProxy is AdminControlledUpgradeable{
    using Borsh for Borsh.Data;
    using LogExtractor for Borsh.Data;

    event PeerChainBound(
        uint256 chainId,
        address prover,
        address proxy
    );

    event UsedProof(
        uint256 indexed chainId,
        bytes32 indexed blockHash,
        uint256 indexed receiptIndex,
        bytes32 proofIndex
    );

    event CrossTokenBurned(
        uint256 indexed contractGroupId,
        uint256 indexed fromChain,
        uint256 indexed toChain,
        address asset,
        bool    proxied,
        bytes   burnInfo
    );

    event CrossTokenMinted(
        uint256 indexed contractGroupId,
        uint256 indexed fromChain,
        uint256 indexed toChain,
        address asset,
        bytes   burnInfo
    );

    struct VerifiedEvent {
        uint256 fromChain;
        uint256 toChain;
        uint256 contractGroupId;
        address asset;
        bytes   burnInfo;
    }

    struct VerifiedReceipt {
        bytes32 blockHash;
        uint256 receiptIndex;
        bytes32 proofIndex;
        uint256 time;
        VerifiedEvent data;
    }

    struct PeerChainInfo {
        address prover;
        address proxy;
    }

    uint constant UNPAUSED_ALL = 0;
    uint constant PAUSED_BURN = 1 << 0;
    uint constant PAUSED_MINT = 1 << 1;

    mapping(uint256 => PeerChainInfo) public peers;

    function _bindPeerChain(
        uint256 chainId_,
        address prover_,
        address peerProxy_
    ) internal {
        require (peers[chainId_].prover == address(0), "chain had bind prove");
        require (Address.isContract(prover_), "address of prover can not be 0");
        require (peerProxy_ != address(0), "address of proxy can not be 0");
        peers[chainId_] = PeerChainInfo(prover_, peerProxy_);
        emit PeerChainBound(chainId_, prover_, peerProxy_);
    }

    function _parseAndConsumeProof(
        bytes memory proofData
    ) internal view returns (VerifiedReceipt memory receipt_) {
        address contractAddress;
        (receipt_.data, contractAddress) = _parseBurnProofLog(proofData);

        PeerChainInfo memory peer = peers[receipt_.data.fromChain];
        require(peer.proxy != address(0), "peer is not bound");
        require((contractAddress != address(0) && peer.proxy == contractAddress), "Invalid Token lock address");
        (bool success, bytes32 blockHash, uint256 receiptIndex, uint256 time) = IProver(peer.prover).verify(proofData);
        require(success, "Proof should be valid");
        receipt_.blockHash = blockHash;
        receipt_.receiptIndex = receiptIndex;
        receipt_.proofIndex = keccak256(abi.encode(blockHash, receiptIndex));
        receipt_.time = time;
    }

    function _parseBurnProofLog(
        bytes memory proof
    ) private pure returns (VerifiedEvent memory receipt_, address contractAddress_) {
        Borsh.Data memory borshData = Borsh.from(proof);
        bytes memory log = borshData.decode();
        
        Deserialize.Log memory logInfo = Deserialize.toReceiptLog(log);
        require(logInfo.topics.length == 4, "invalid the number of topics");

        //CrossTokenBurned        
        require(logInfo.topics[0] == 0xa70303e63e54b781b5d1449833162f7194addb3b8728aa0ea87b60711b63e8e0, "invalid the function of topics");
        receipt_.contractGroupId = abi.decode(abi.encodePacked(logInfo.topics[1]), (uint256));
        receipt_.fromChain = abi.decode(abi.encodePacked(logInfo.topics[2]), (uint256));
        receipt_.toChain = abi.decode(abi.encodePacked(logInfo.topics[3]), (uint256));

        (receipt_.asset, , receipt_.burnInfo) = abi.decode(logInfo.data, (address, bool, bytes));
        contractAddress_ = logInfo.contractAddress;
    }
}