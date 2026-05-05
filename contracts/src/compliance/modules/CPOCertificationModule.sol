// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {ICPOCertificationModule} from "../../interfaces/compliance/modules/ICPOCertificationModule.sol";
import {IComplianceModule, ModuleTypes} from "../../interfaces/compliance/IComplianceModule.sol";
import {BaseComplianceModule} from "./BaseComplianceModule.sol";

interface ICPOComplianceMin {
    function getTokenBound() external view returns (address);
}

/**
 * @title CPOCertificationModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module enforcing Certified Pre-Owned (CPO) certification for resale
 * @dev Verifies that luxury goods have been authenticated before secondary market sales.
 *      Certifications are tracked in this module and set by trusted certifiers.
 */
contract CPOCertificationModule is ICPOCertificationModule, BaseComplianceModule {

    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Current CPO enforcement mode
    CPOMode private _cpoMode;

    /// @dev Trusted certifiers (can record certifications)
    address[] private _certifiers;
    mapping(address => bool) private _certifierSet;

    /// @dev Claim topic for authenticity verification
    uint256 private _authenticityClaimTopicValue;

    /// @dev Minimum certification validity period in seconds
    uint256 private _minValidityPeriodValue;

    /// @dev Per-token certification data
    struct CertData {
        bool certified;
        address certifier;
        uint256 certifiedAt;
        uint256 expiresAt;
        string certificationLevel;
    }
    mapping(address => CertData) private _certifications;

    /// @dev Identity registry (optional — used for external claim verification)
    address private _identityRegistryAddress;

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(address admin_, address identityRegistry_, uint256 authenticityTopic_) {
        if (admin_ == address(0)) revert ZeroAddress();
        _transferOwnership(admin_);
        _identityRegistryAddress = identityRegistry_;
        _authenticityClaimTopicValue = authenticityTopic_ != 0
            ? authenticityTopic_
            : uint256(keccak256("galileo.claim.authenticity_verified"));
        _minValidityPeriodValue = 0;
        _cpoMode = CPOMode.NOT_REQUIRED;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function name() external pure override returns (string memory) {
        return "CPO Certification Module";
    }

    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    function moduleType() external pure override returns (bytes4) {
        return ModuleTypes.CERTIFICATION;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE COMPLIANCE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function moduleCheck(
        address _from,
        address _to,
        uint256, // _value
        address _compliance
    ) external view override returns (bool) {
        if (_cpoMode == CPOMode.NOT_REQUIRED) return true;

        // Burn is always allowed
        if (_to == address(0)) return true;

        if (_cpoMode == CPOMode.ALWAYS_REQUIRED) {
            return _checkCPO(_compliance);
        }

        // REQUIRED_FOR_RESALE: primary sale (mint) allowed, secondary requires CPO
        if (_from == address(0)) return true; // mint/primary sale
        return _checkCPO(_compliance);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function cpoMode() external view override returns (CPOMode) {
        return _cpoMode;
    }

    function setCPOMode(CPOMode _mode) external override onlyOwner {
        CPOMode old = _cpoMode;
        _cpoMode = _mode;
        emit CPOModeUpdated(old, _mode, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CPO CHECKING
    // ═══════════════════════════════════════════════════════════════════

    function isCPORequired(address _from, address) external view override returns (bool) {
        if (_cpoMode == CPOMode.NOT_REQUIRED) return false;
        if (_cpoMode == CPOMode.ALWAYS_REQUIRED) return true;
        // REQUIRED_FOR_RESALE: required only for secondary (non-mint) transfers
        return _from != address(0);
    }

    function hasCPOCertification(address token) public view override returns (bool) {
        CertData storage cert = _certifications[token];
        if (!cert.certified) return false;
        if (cert.expiresAt != 0 && cert.expiresAt < block.timestamp) return false;
        if (!_certifierSet[cert.certifier]) return false;
        return true;
    }

    function getCPOCertificationDetails(address token) external view override returns (
        bool certified,
        address certifier,
        uint256 certifiedAt,
        uint256 expiresAt,
        string memory certificationLevel
    ) {
        CertData storage cert = _certifications[token];
        certified = hasCPOCertification(token);
        certifier = cert.certifier;
        certifiedAt = cert.certifiedAt;
        expiresAt = cert.expiresAt;
        certificationLevel = cert.certificationLevel;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CERTIFICATION MANAGEMENT (by trusted certifiers)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Record a CPO certification for a token
     * @dev Can only be called by trusted certifiers
     */
    function certifyToken(
        address token,
        uint256 certifiedAt_,
        uint256 expiresAt_,
        string calldata level
    ) external {
        if (!_certifierSet[msg.sender]) revert CertifierNotTrusted(msg.sender);
        // Enforce minimum validity period when set and expiry is provided
        if (_minValidityPeriodValue > 0 && expiresAt_ != 0) {
            if (expiresAt_ < certifiedAt_ + _minValidityPeriodValue) {
                revert InvalidModuleConfiguration("Expiry below minimum validity period");
            }
        }
        _certifications[token] = CertData({
            certified: true,
            certifier: msg.sender,
            certifiedAt: certifiedAt_,
            expiresAt: expiresAt_,
            certificationLevel: level
        });
        emit CPOCertificationVerified(token, msg.sender, certifiedAt_);
    }

    /**
     * @notice Revoke a CPO certification (admin only)
     */
    function revokeCertification(address token) external onlyOwner {
        _certifications[token].certified = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // TRUSTED CERTIFIERS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function addTrustedCertifier(address _certifier) external override onlyOwner {
        if (_certifier == address(0)) revert CertifierNotTrusted(address(0));
        if (_certifierSet[_certifier]) revert CertifierAlreadyTrusted(_certifier);
        _certifiers.push(_certifier);
        _certifierSet[_certifier] = true;
        emit TrustedCertifierAdded(_certifier, "", msg.sender);
    }

    function addTrustedCertifierWithName(address _certifier, string calldata certifierName) external onlyOwner {
        if (_certifier == address(0)) revert CertifierNotTrusted(address(0));
        if (_certifierSet[_certifier]) revert CertifierAlreadyTrusted(_certifier);
        _certifiers.push(_certifier);
        _certifierSet[_certifier] = true;
        emit TrustedCertifierAdded(_certifier, certifierName, msg.sender);
    }

    function removeTrustedCertifier(address _certifier) external override onlyOwner {
        if (!_certifierSet[_certifier]) revert CertifierNotInTrustList(_certifier);
        uint256 len = _certifiers.length;
        for (uint256 i = 0; i < len; i++) {
            if (_certifiers[i] == _certifier) {
                _certifiers[i] = _certifiers[len - 1];
                _certifiers.pop();
                break;
            }
        }
        _certifierSet[_certifier] = false;
        emit TrustedCertifierRemoved(_certifier, msg.sender);
    }

    function isTrustedCertifier(address _certifier) external view override returns (bool) {
        return _certifierSet[_certifier];
    }

    function getTrustedCertifiers() external view override returns (address[] memory) {
        return _certifiers;
    }

    function trustedCertifierCount() external view override returns (uint256) {
        return _certifiers.length;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION GETTERS
    // ═══════════════════════════════════════════════════════════════════

    function authenticityClaimTopic() external view override returns (uint256) {
        return _authenticityClaimTopicValue;
    }

    function identityRegistry() external view override returns (address) {
        return _identityRegistryAddress;
    }

    function minValidityPeriod() external view override returns (uint256) {
        return _minValidityPeriodValue;
    }

    function setMinValidityPeriod(uint256 _period) external override onlyOwner {
        _minValidityPeriodValue = _period;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════

    function _checkCPO(address _compliance) internal view returns (bool) {
        if (_compliance == address(0)) return false;
        if (_compliance.code.length == 0) return false;
        address token;
        try ICPOComplianceMin(_compliance).getTokenBound() returns (address t) {
            token = t;
        } catch {
            return false;
        }
        if (token == address(0)) return false;
        return hasCPOCertification(token);
    }
}
