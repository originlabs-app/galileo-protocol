// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IComplianceModule} from "../../interfaces/compliance/IComplianceModule.sol";

/**
 * @title BaseComplianceModule
 * @author Galileo Protocol Contributors
 * @notice Abstract base for all Galileo compliance modules
 * @dev Implements the binding logic from IComplianceModule. Each module extending
 *      this base must implement moduleCheck(), name(), version(), and moduleType().
 */
abstract contract BaseComplianceModule is IComplianceModule, Ownable {
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Set of compliance contracts bound to this module
    mapping(address => bool) private _complianceBound;

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyBoundCompliance() {
        if (!_complianceBound[msg.sender]) revert CallerNotBoundCompliance(msg.sender);
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLIANCE BINDING
    // ═══════════════════════════════════════════════════════════════════

    function bindCompliance(address _compliance) external override {
        // Only the compliance contract itself may bind (self-binding pattern per ERC-3643)
        if (msg.sender != _compliance) revert CallerNotBoundCompliance(msg.sender);
        if (_complianceBound[_compliance]) revert ComplianceAlreadyBound(_compliance);
        _complianceBound[_compliance] = true;
        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        // Only the compliance contract itself may unbind
        if (msg.sender != _compliance) revert CallerNotBoundCompliance(msg.sender);
        if (!_complianceBound[_compliance]) revert ComplianceNotBound(_compliance);
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEFAULT LIFECYCLE HOOKS (no-ops, override if needed)
    // ═══════════════════════════════════════════════════════════════════

    function moduleTransferAction(
        address, // _from
        address, // _to
        uint256, // _value
        address  // _compliance
    ) external virtual override onlyBoundCompliance {}

    function moduleMintAction(
        address, // _to
        uint256, // _value
        address  // _compliance
    ) external virtual override onlyBoundCompliance {}

    function moduleBurnAction(
        address, // _from
        uint256, // _value
        address  // _compliance
    ) external virtual override onlyBoundCompliance {}
}
