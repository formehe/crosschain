// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract TimeController is Initializable, TimelockController {
    event DelayThresholdChange(uint256 oldLowDelay, uint256 oldUpDelay, uint256 newLowDelay, uint256 newUpDelay);
    event CallerChange(address oldCaller, address newCaller);

    uint256 constant public proposalMaxOperations = 10; // 10 actions
    uint256 public lowDelayThreshold;
    uint256 public upDelayThreshold;
    uint256 delayDuration;
    constructor (uint256 minDelay) TimelockController(minDelay, new address[](0), new address[](0)){
        delayDuration = minDelay;
        _setRoleAdmin(TIMELOCK_ADMIN_ROLE, 0x00);
        _setRoleAdmin(PROPOSER_ROLE, 0x00);
        _setRoleAdmin(EXECUTOR_ROLE, 0x00);
    }

    function _TimeController_initialize(
        address _caller,
        uint256 _lowDelayThreshold,
        uint256 _upDelayThreshold
    ) external initializer {
        require(Address.isContract(_caller), "invalid address");
        require(_lowDelayThreshold != 0, "invalid the lower of delay");
        require(_upDelayThreshold >= _lowDelayThreshold, "the uppder of delay must larger than the lower");
        emit DelayThresholdChange(lowDelayThreshold, upDelayThreshold, _lowDelayThreshold, _upDelayThreshold);
        upDelayThreshold = _upDelayThreshold;
        lowDelayThreshold = _lowDelayThreshold;
        _setupRole(PROPOSER_ROLE, _caller);
	    _setupRole(EXECUTOR_ROLE, _caller);
    }

    function renounceRole(bytes32 /*role*/, address /*account*/) public pure override {
        require(false, "not support");
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override onlyRoleOrOpenRole(EXECUTOR_ROLE) {
        // require(msg.sender == caller, "not caller");
        require(targets.length <=  proposalMaxOperations, "too many actions");
        for (uint256 i = 0; i < targets.length; i++) {
            require(Address.isContract(targets[i]), "invalid contract");
        }

        super.executeBatch(targets, values, datas, predecessor, salt);
    }

    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) public override onlyRole(PROPOSER_ROLE) {
        // require(msg.sender == caller, "not caller");
        require(targets.length <=  proposalMaxOperations, "too many actions");
        for (uint256 i = 0; i < targets.length; i++) {
            require(Address.isContract(targets[i]), "invalid contract");
        }

        super.scheduleBatch(targets, values, datas, predecessor, salt, delay);
    }

    function getMinDelay() public view override returns (uint256 duration) {
        return delayDuration;
    }

    function updateDelay(uint256 newDelay) external override {
        require(msg.sender == address(this), "TimelockController: caller must be timelock");
        require(newDelay <= upDelayThreshold && newDelay >= lowDelayThreshold, "invalid delay");
        emit MinDelayChange(delayDuration, newDelay);
        delayDuration = newDelay;
    }
}