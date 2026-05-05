// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {IServiceCenterModule} from "../../interfaces/compliance/modules/IServiceCenterModule.sol";
import {IComplianceModule, ModuleTypes} from "../../interfaces/compliance/IComplianceModule.sol";
import {BaseComplianceModule} from "./BaseComplianceModule.sol";

interface IServiceRegistryMin {
    function batchVerify(address _userAddress, uint256[] calldata _claimTopics)
        external view returns (bool[] memory);
}

/**
 * @title ServiceCenterModule
 * @author Galileo Protocol Contributors
 * @notice MRO (Maintenance, Repair, Overhaul) authorization compliance module
 * @dev Ensures that token transfers to service centers are authorized. Only addresses
 *      registered as authorized service centers (with valid claim or internal auth) can
 *      receive tokens when this module is active.
 *
 *      Transfer logic:
 *      - If `to` is NOT a service center → allow (not our concern)
 *      - If `to` IS a service center → check authorization
 */
contract ServiceCenterModule is IServiceCenterModule, BaseComplianceModule {

    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE TYPE CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    bytes32 private constant _SERVICE_TYPE_REPAIR = keccak256("SERVICE_TYPE_REPAIR");
    bytes32 private constant _SERVICE_TYPE_RESTORATION = keccak256("SERVICE_TYPE_RESTORATION");
    bytes32 private constant _SERVICE_TYPE_AUTHENTICATION = keccak256("SERVICE_TYPE_AUTHENTICATION");
    bytes32 private constant _SERVICE_TYPE_CUSTOMIZATION = keccak256("SERVICE_TYPE_CUSTOMIZATION");
    bytes32 private constant _SERVICE_TYPE_INSPECTION = keccak256("SERVICE_TYPE_INSPECTION");

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    uint256 private _serviceCenterClaimTopicValue;
    address private _identityRegistryAddress;
    string private _brandDIDValue;

    /// @dev Authorization data per service center
    struct ServiceCenterAuth {
        bool authorized;
        uint256 expiresAt;
        bytes32[] authorizedServices;
        string[] certifications;
    }
    mapping(address => ServiceCenterAuth) private _serviceCenters;
    address[] private _serviceCenterList;
    mapping(address => bool) private _isInList;

    /// @dev When true, addresses holding a service center claim but NOT in _serviceCenterList are rejected
    bool private _requireExplicitAuthorization = true;

    /// @dev Service types that require authorization
    bytes32[] private _requiredServiceTypesList;
    mapping(bytes32 => bool) private _serviceTypeRequired;

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(
        address admin_,
        address identityRegistry_,
        string memory brandDID_,
        uint256 claimTopic_
    ) {
        if (admin_ == address(0)) revert ZeroAddress();
        _transferOwnership(admin_);
        _identityRegistryAddress = identityRegistry_;
        _brandDIDValue = brandDID_;
        _serviceCenterClaimTopicValue = claimTopic_ != 0
            ? claimTopic_
            : uint256(keccak256("galileo.claim.service_center"));
    }

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE TYPE CONSTANTS (interface functions)
    // ═══════════════════════════════════════════════════════════════════

    function SERVICE_TYPE_REPAIR() external pure override returns (bytes32) {
        return _SERVICE_TYPE_REPAIR;
    }

    function SERVICE_TYPE_RESTORATION() external pure override returns (bytes32) {
        return _SERVICE_TYPE_RESTORATION;
    }

    function SERVICE_TYPE_AUTHENTICATION() external pure override returns (bytes32) {
        return _SERVICE_TYPE_AUTHENTICATION;
    }

    function SERVICE_TYPE_CUSTOMIZATION() external pure override returns (bytes32) {
        return _SERVICE_TYPE_CUSTOMIZATION;
    }

    function SERVICE_TYPE_INSPECTION() external pure override returns (bytes32) {
        return _SERVICE_TYPE_INSPECTION;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function name() external pure override returns (string memory) {
        return "Service Center Module";
    }

    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    function moduleType() external pure override returns (bytes4) {
        return ModuleTypes.SERVICE;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE COMPLIANCE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function moduleCheck(
        address, // _from
        address _to,
        uint256, // _value
        address  // _compliance
    ) external view override returns (bool) {
        // Burn: always allowed
        if (_to == address(0)) return true;
        // If known/registered service center → must be authorized
        if (_isKnownServiceCenter(_to)) return isAuthorizedServiceCenter(_to);
        // Not in list — if requireExplicitAuthorization is enabled, reject any address
        // that holds a service center claim without being explicitly onboarded
        if (_requireExplicitAuthorization && _hasServiceCenterClaim(_to)) return false;
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHORIZATION VERIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function isAuthorizedServiceCenter(address _address) public view override returns (bool) {
        // Check internal authorization first
        ServiceCenterAuth storage auth = _serviceCenters[_address];
        if (auth.authorized) {
            if (auth.expiresAt != 0 && auth.expiresAt < block.timestamp) return false;
            return true;
        }
        // Fall back to identity registry claim check
        return _hasServiceCenterClaim(_address);
    }

    function isAuthorizedForServiceType(
        address _address,
        bytes32 _serviceType
    ) external view override returns (bool) {
        if (!isAuthorizedServiceCenter(_address)) return false;
        ServiceCenterAuth storage auth = _serviceCenters[_address];
        if (auth.authorizedServices.length == 0) return true; // no restriction = all types
        bytes32[] storage services = auth.authorizedServices;
        for (uint256 i = 0; i < services.length; i++) {
            if (services[i] == _serviceType) return true;
        }
        return false;
    }

    function getServiceCenterDetails(address _address) external view override returns (
        bool authorized,
        uint256 expiresAt,
        bytes32[] memory authorizedServices,
        string[] memory certifications
    ) {
        ServiceCenterAuth storage auth = _serviceCenters[_address];
        authorized = isAuthorizedServiceCenter(_address);
        expiresAt = auth.expiresAt;
        authorizedServices = auth.authorizedServices;
        certifications = auth.certifications;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MRO TRANSFER VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    function validateMROTransfer(
        address, // _from
        address _serviceCenter,
        bytes32 _serviceType
    ) external view override returns (bool) {
        if (!isAuthorizedServiceCenter(_serviceCenter)) return false;
        ServiceCenterAuth storage auth = _serviceCenters[_serviceCenter];
        if (auth.authorizedServices.length == 0) return true;
        bytes32[] storage services = auth.authorizedServices;
        for (uint256 i = 0; i < services.length; i++) {
            if (services[i] == _serviceType) return true;
        }
        return false;
    }

    function validateMROTransferWithReason(
        address, // _from
        address _serviceCenter,
        bytes32 _serviceType
    ) external view override returns (bool valid, string memory reason, uint256 expiresAt) {
        if (!isAuthorizedServiceCenter(_serviceCenter)) {
            return (false, "Service center not authorized", 0);
        }
        ServiceCenterAuth storage auth = _serviceCenters[_serviceCenter];
        expiresAt = auth.expiresAt;
        if (auth.authorizedServices.length > 0) {
            bytes32[] storage services = auth.authorizedServices;
            for (uint256 i = 0; i < services.length; i++) {
                if (services[i] == _serviceType) return (true, "", expiresAt);
            }
            return (false, "Service center not authorized for this service type", expiresAt);
        }
        return (true, "", expiresAt);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE CENTER MANAGEMENT (Admin)
    // ═══════════════════════════════════════════════════════════════════

    function authorizeServiceCenter(
        address _serviceCenter,
        uint256 expiresAt_,
        bytes32[] calldata services_,
        string[] calldata certs_
    ) external onlyOwner {
        require(_serviceCenter != address(0), "Zero address");
        if (!_isInList[_serviceCenter]) {
            _serviceCenterList.push(_serviceCenter);
            _isInList[_serviceCenter] = true;
        }
        _serviceCenters[_serviceCenter] = ServiceCenterAuth({
            authorized: true,
            expiresAt: expiresAt_,
            authorizedServices: services_,
            certifications: certs_
        });
        emit ServiceCenterValidated(_serviceCenter, bytes32(0), true);
    }

    function revokeServiceCenter(address _serviceCenter) external onlyOwner {
        _serviceCenters[_serviceCenter].authorized = false;
        emit ServiceCenterValidated(_serviceCenter, bytes32(0), false);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function requireExplicitAuthorization() external view returns (bool) {
        return _requireExplicitAuthorization;
    }

    function setRequireExplicitAuthorization(bool value_) external onlyOwner {
        _requireExplicitAuthorization = value_;
    }

    function serviceCenterClaimTopic() external view override returns (uint256) {
        return _serviceCenterClaimTopicValue;
    }

    function setServiceCenterClaimTopic(uint256 _claimTopic) external override onlyOwner {
        uint256 old = _serviceCenterClaimTopicValue;
        _serviceCenterClaimTopicValue = _claimTopic;
        emit ServiceCenterClaimTopicUpdated(old, _claimTopic, msg.sender);
    }

    function isServiceTypeRequired(bytes32 _serviceType) external view override returns (bool) {
        return _serviceTypeRequired[_serviceType];
    }

    function setServiceTypeRequired(bytes32 _serviceType, bool _required) external override onlyOwner {
        if (_required && !_serviceTypeRequired[_serviceType]) {
            _requiredServiceTypesList.push(_serviceType);
        } else if (!_required && _serviceTypeRequired[_serviceType]) {
            uint256 len = _requiredServiceTypesList.length;
            for (uint256 i = 0; i < len; i++) {
                if (_requiredServiceTypesList[i] == _serviceType) {
                    _requiredServiceTypesList[i] = _requiredServiceTypesList[len - 1];
                    _requiredServiceTypesList.pop();
                    break;
                }
            }
        }
        _serviceTypeRequired[_serviceType] = _required;
        emit ServiceTypeRequirementUpdated(_serviceType, _required, msg.sender);
    }

    function getRequiredServiceTypes() external view override returns (bytes32[] memory) {
        return _requiredServiceTypesList;
    }

    function identityRegistry() external view override returns (address) {
        return _identityRegistryAddress;
    }

    function setIdentityRegistry(address registry_) external onlyOwner {
        _identityRegistryAddress = registry_;
    }

    function brandDID() external view override returns (string memory) {
        return _brandDIDValue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════

    function _isKnownServiceCenter(address _address) internal view returns (bool) {
        return _isInList[_address];
    }

    function _hasServiceCenterClaim(address _address) internal view returns (bool) {
        if (_identityRegistryAddress == address(0)) return false;
        if (_identityRegistryAddress.code.length == 0) return false;
        uint256[] memory topics = new uint256[](1);
        topics[0] = _serviceCenterClaimTopicValue;
        try IServiceRegistryMin(_identityRegistryAddress).batchVerify(_address, topics) returns (bool[] memory results) {
            return results.length > 0 && results[0];
        } catch {
            return false;
        }
    }
}
