// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {ISanctionsModule, SanctionsList} from "../../interfaces/compliance/modules/ISanctionsModule.sol";
import {IComplianceModule, ModuleTypes} from "../../interfaces/compliance/IComplianceModule.sol";
import {BaseComplianceModule} from "./BaseComplianceModule.sol";

/**
 * @title SanctionsModule
 * @author Galileo Protocol Contributors
 * @notice OFAC/EU sanctions screening compliance module
 * @dev Integrates with an on-chain sanctions oracle (Chainalysis or custom) to block
 *      transfers involving sanctioned addresses. Also maintains a supplementary
 *      blocklist for addresses not yet in the oracle.
 */
contract SanctionsModule is ISanctionsModule, BaseComplianceModule {
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    uint256 public constant MAX_GRACE_PERIOD = 86400; // 24 hours

    // ═══════════════════════════════════════════════════════════════════
    // LOCAL ERRORS / EVENTS
    // ═══════════════════════════════════════════════════════════════════

    error ZeroAddress();

    event GracePeriodUpdated(bool enabled, uint256 duration, address indexed updatedBy);

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    address private _sanctionsOracleAddress;
    bool private _strictMode;
    uint256 private _highValueThresholdValue;

    /// @dev Supplementary blocklist
    mapping(address => bool) private _blocklist;
    mapping(address => uint256) private _blocklistTimestamp;

    /// @dev Grace period configuration
    bool private _gracePeriodEnabled;
    uint256 private _gracePeriodDuration;

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(address admin_, address oracle_) {
        if (admin_ == address(0)) revert ZeroAddress();
        _transferOwnership(admin_);
        _sanctionsOracleAddress = oracle_;
        _strictMode = true;
        _highValueThresholdValue = 0; // disabled by default
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function name() external pure override returns (string memory) {
        return "Sanctions Module";
    }

    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    function moduleType() external pure override returns (bytes4) {
        return ModuleTypes.SANCTIONS;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE COMPLIANCE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function moduleCheck(
        address _from,
        address _to,
        uint256, // _value
        address  // _compliance
    ) external view override returns (bool) {
        // Check sender (skip zero address = mint)
        if (_from != address(0) && _isSanctionedInternal(_from)) return false;
        // Check receiver (skip zero address = burn)
        if (_to != address(0) && _isSanctionedInternal(_to)) return false;
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SANCTIONS CHECKING
    // ═══════════════════════════════════════════════════════════════════

    function isSanctioned(address _address) external view override returns (bool) {
        return _isSanctionedInternal(_address);
    }

    function checkBothParties(address _from, address _to)
        external view override returns (bool fromSanctioned, bool toSanctioned)
    {
        fromSanctioned = _isSanctionedInternal(_from);
        toSanctioned = _isSanctionedInternal(_to);
    }

    function batchCheckSanctions(address[] calldata _addresses)
        external view override returns (bool[] memory results)
    {
        results = new bool[](_addresses.length);
        for (uint256 i = 0; i < _addresses.length; i++) {
            results[i] = _isSanctionedInternal(_addresses[i]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function sanctionsOracle() external view override returns (address) {
        return _sanctionsOracleAddress;
    }

    function setSanctionsOracle(address _oracle) external override onlyOwner {
        if (_oracle == address(0)) revert InvalidOracleAddress();
        address old = _sanctionsOracleAddress;
        _sanctionsOracleAddress = _oracle;
        emit SanctionsOracleUpdated(old, _oracle);
    }

    function setStrictMode(bool _strict) external override onlyOwner {
        _strictMode = _strict;
        emit StrictModeChanged(_strict);
    }

    function isStrictMode() external view override returns (bool) {
        return _strictMode;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HIGH-VALUE TRANSFER HANDLING
    // ═══════════════════════════════════════════════════════════════════

    function setHighValueThreshold(uint256 _threshold) external override onlyOwner {
        uint256 old = _highValueThresholdValue;
        _highValueThresholdValue = _threshold;
        emit HighValueThresholdUpdated(old, _threshold);
    }

    function highValueThreshold() external view override returns (uint256) {
        return _highValueThresholdValue;
    }

    function isHighValueTransfer(uint256 _amount) external view override returns (bool) {
        return _highValueThresholdValue > 0 && _amount >= _highValueThresholdValue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUPPLEMENTARY BLOCKLIST
    // ═══════════════════════════════════════════════════════════════════

    function addToBlocklist(address _address, string calldata _reason) external override onlyOwner {
        if (_address == address(0)) revert ZeroAddress();
        if (_blocklist[_address]) revert AddressAlreadyBlocked(_address);
        _blocklist[_address] = true;
        _blocklistTimestamp[_address] = block.timestamp;
        emit AddressBlocked(_address, _reason, block.timestamp);
    }

    function removeFromBlocklist(address _address, string calldata _reason) external override onlyOwner {
        if (!_blocklist[_address]) revert AddressNotBlocked(_address);
        _blocklist[_address] = false;
        _blocklistTimestamp[_address] = 0;
        emit AddressUnblocked(_address, _reason);
    }

    function isOnBlocklist(address _address) external view override returns (bool) {
        return _blocklist[_address];
    }

    // ═══════════════════════════════════════════════════════════════════
    // GRACE PERIOD HANDLING
    // ═══════════════════════════════════════════════════════════════════

    function setGracePeriod(bool _enabled, uint256 _duration) external override onlyOwner {
        if (_duration > MAX_GRACE_PERIOD) revert GracePeriodTooLong(_duration, MAX_GRACE_PERIOD);
        _gracePeriodEnabled = _enabled;
        _gracePeriodDuration = _duration;
        emit GracePeriodUpdated(_enabled, _duration, msg.sender);
    }

    function isInGracePeriod(address _address) external view override returns (bool) {
        if (!_gracePeriodEnabled) return false;
        if (!_blocklist[_address]) return false;
        uint256 blockedAt = _blocklistTimestamp[_address];
        return block.timestamp <= blockedAt + _gracePeriodDuration;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════

    function _isSanctionedInternal(address _address) internal view returns (bool) {
        // Check supplementary blocklist first (fast, no external call)
        if (_blocklist[_address]) {
            // Grace period check
            if (_gracePeriodEnabled && _blocklistTimestamp[_address] != 0) {
                if (block.timestamp <= _blocklistTimestamp[_address] + _gracePeriodDuration) {
                    return false; // in grace period, not sanctioned yet
                }
            }
            return true;
        }

        // Check oracle
        if (_sanctionsOracleAddress == address(0)) return false;

        try SanctionsList(_sanctionsOracleAddress).isSanctioned(_address) returns (bool sanctioned) {
            return sanctioned;
        } catch {
            // Oracle failed
            if (_strictMode) {
                // In strict mode — fail safe: treat as sanctioned to block the transfer
                return true;
            }
            // Non-strict: fail open, allow the transfer
            return false;
        }
    }
}
