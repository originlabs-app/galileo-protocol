// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {IBrandAuthorizationModule} from "../../interfaces/compliance/modules/IBrandAuthorizationModule.sol";
import {IComplianceModule, ModuleTypes} from "../../interfaces/compliance/IComplianceModule.sol";
import {BaseComplianceModule} from "./BaseComplianceModule.sol";

interface IBrandRegistryMin {
    function batchVerify(address _userAddress, uint256[] calldata _claimTopics)
        external view returns (bool[] memory);
}

/**
 * @title BrandAuthorizationModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module enforcing brand authorization for token transfers
 * @dev Verifies that transfer recipients hold a valid AUTHORIZED_RETAILER claim
 *      from the identity registry. Supports primary-sale and P2P transfer policies.
 */
contract BrandAuthorizationModule is IBrandAuthorizationModule, BaseComplianceModule {

    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    string private _brandDIDValue;
    uint256 private _authorizedRetailerClaimTopicValue;
    address private _identityRegistryAddress;
    bool private _requireRetailerForPrimarySaleValue;
    bool private _allowPeerToPeerValue;

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @param admin_ Module owner/admin
     * @param brandDID_ The brand DID this module protects
     * @param identityRegistry_ Address of the Galileo identity registry
     * @param claimTopic_ Claim topic for authorized retailer (use 0 for default)
     */
    constructor(
        address admin_,
        string memory brandDID_,
        address identityRegistry_,
        uint256 claimTopic_
    ) {
        if (admin_ == address(0)) revert ZeroAddress();
        _transferOwnership(admin_);
        _brandDIDValue = brandDID_;
        _identityRegistryAddress = identityRegistry_;
        // default topic: keccak256("galileo.claim.authorized_retailer") as uint256
        _authorizedRetailerClaimTopicValue = claimTopic_ != 0
            ? claimTopic_
            : uint256(keccak256("galileo.claim.authorized_retailer"));
        _requireRetailerForPrimarySaleValue = true;
        _allowPeerToPeerValue = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function name() external pure override returns (string memory) {
        return "Brand Authorization Module";
    }

    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    function moduleType() external pure override returns (bytes4) {
        return ModuleTypes.BRAND;
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
        // Primary sale (mint): from == address(0)
        if (_from == address(0)) {
            if (!_requireRetailerForPrimarySaleValue) return true;
            return _hasRetailerClaim(_to);
        }
        // Burn: to == address(0) — always allow
        if (_to == address(0)) return true;
        // Secondary transfer
        if (_allowPeerToPeerValue) return true;
        return _hasRetailerClaim(_to);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BRAND CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function brandDID() external view override returns (string memory) {
        return _brandDIDValue;
    }

    function authorizedRetailerClaimTopic() external view override returns (uint256) {
        return _authorizedRetailerClaimTopicValue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHORIZATION CHECKS
    // ═══════════════════════════════════════════════════════════════════

    function isAuthorizedRetailer(address _address) external view override returns (bool) {
        return _hasRetailerClaim(_address);
    }

    function isAuthorizedForCategory(
        address _address,
        string calldata // _category — simplified: same as retailer check
    ) external view override returns (bool) {
        return _hasRetailerClaim(_address);
    }

    function getAuthorizationDetails(address _address) external view override returns (
        bool authorized,
        uint256 expiresAt,
        string[] memory categories,
        string memory territory
    ) {
        authorized = _hasRetailerClaim(_address);
        expiresAt = 0; // simplified: no expiry data from batchVerify
        categories = new string[](0);
        territory = "";
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION (ADMIN ONLY)
    // ═══════════════════════════════════════════════════════════════════

    function setAuthorizedRetailerClaimTopic(uint256 _claimTopic) external override onlyOwner {
        if (_claimTopic == 0) revert InvalidClaimTopic(_claimTopic);
        uint256 old = _authorizedRetailerClaimTopicValue;
        _authorizedRetailerClaimTopicValue = _claimTopic;
        emit ClaimTopicUpdated(old, _claimTopic, msg.sender);
    }

    function setRequireRetailerForPrimarySale(bool _require) external override onlyOwner {
        _requireRetailerForPrimarySaleValue = _require;
        emit PrimarySaleRequirementChanged(_require, msg.sender);
    }

    function setAllowPeerToPeer(bool _allow) external override onlyOwner {
        _allowPeerToPeerValue = _allow;
        emit PeerToPeerTransferSettingChanged(_allow, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION GETTERS
    // ═══════════════════════════════════════════════════════════════════

    function requireRetailerForPrimarySale() external view override returns (bool) {
        return _requireRetailerForPrimarySaleValue;
    }

    function allowPeerToPeer() external view override returns (bool) {
        return _allowPeerToPeerValue;
    }

    function identityRegistry() external view override returns (address) {
        return _identityRegistryAddress;
    }

    function setIdentityRegistry(address registry_) external onlyOwner {
        _identityRegistryAddress = registry_;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════

    function _hasRetailerClaim(address _address) internal view returns (bool) {
        if (_identityRegistryAddress == address(0)) return false;
        if (_identityRegistryAddress.code.length == 0) return false;
        uint256[] memory topics = new uint256[](1);
        topics[0] = _authorizedRetailerClaimTopicValue;
        try IBrandRegistryMin(_identityRegistryAddress).batchVerify(_address, topics) returns (bool[] memory results) {
            return results.length > 0 && results[0];
        } catch {
            return false;
        }
    }
}
