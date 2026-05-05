// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IGalileoIdentityRegistryStorage} from "../interfaces/identity/IIdentityRegistryStorage.sol";

/**
 * @title GalileoIdentityRegistryStorage
 * @author Galileo Luxury Standard
 * @notice Shared identity storage for the Galileo consortium with brand DID tracking
 * @dev Implements IGalileoIdentityRegistryStorage (which extends ERC-3643 IIdentityRegistryStorage).
 *      Provides:
 *      - Base ERC-3643 identity storage (addIdentityToStorage, modifyStoredIdentity, etc.)
 *      - Multi-registry binding: up to 300 identity registries per storage contract
 *      - Brand DID association per registry for audit trail and traceability
 *      - Binding timestamp tracking for compliance reporting
 *      - Pagination support for large consortium enumeration
 *      - DID-confirmed unbinding to prevent accidental registry removal
 *
 *      Access control:
 *      - REGISTRY_ADMIN_ROLE: bind/unbind registries, update DIDs
 *      - AGENT_ROLE: write identity data (granted to bound identity registries)
 *
 *      Specification: GSPEC-IDENTITY-004
 *
 * @custom:security-contact security@galileoprotocol.io
 */
contract GalileoIdentityRegistryStorage is IGalileoIdentityRegistryStorage, AccessControlEnumerable {
    // ============ Roles ============

    /// @notice Role required to manage registry bindings
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    /// @notice Role granted to bound identity registries — allows identity data writes
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    // ============ Errors ============

    error ZeroAddress();
    error IdentityAlreadyStored(address userAddress);
    error IdentityNotStored(address userAddress);
    error TooManyRegistries();
    error IndexOutOfBounds(uint256 index, uint256 length);
    error DIDMismatch(address identityRegistry);

    // ============ Constants ============

    uint256 private constant MAX_BOUND_REGISTRIES = 300;

    // ============ State — ERC-3643 base ============

    struct IdentityData {
        IIdentity identityContract;
        uint16 investorCountry;
    }

    /// @dev mapping between a user address and the corresponding identity
    mapping(address => IdentityData) private _identities;

    /// @dev array of Identity Registries linked to this storage
    address[] private _identityRegistries;

    // ============ State — Galileo extensions ============

    /// @dev Brand DID associated with each bound registry (empty if none set)
    mapping(address => string) private _registryBrandDID;

    /// @dev Timestamp when each registry was bound
    mapping(address => uint256) private _registryBindingTime;

    /// @dev Whether a registry is currently bound
    mapping(address => bool) private _registryBound;

    // ============ Constructor ============

    /**
     * @notice Deploy and initialise the storage contract
     * @param admin Address granted DEFAULT_ADMIN_ROLE and REGISTRY_ADMIN_ROLE
     */
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AGENT_ROLE, REGISTRY_ADMIN_ROLE);
    }

    // ============ IIdentityRegistryStorage — identity data writes (agent-gated) ============

    /**
     * @dev See {IIdentityRegistryStorage-addIdentityToStorage}.
     */
    function addIdentityToStorage(
        address _userAddress,
        IIdentity _identity,
        uint16 _country
    ) external override onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0) || address(_identity) == address(0)) revert ZeroAddress();
        if (address(_identities[_userAddress].identityContract) != address(0)) {
            revert IdentityAlreadyStored(_userAddress);
        }
        _identities[_userAddress].identityContract = _identity;
        _identities[_userAddress].investorCountry = _country;
        emit IdentityStored(_userAddress, _identity);
    }

    /**
     * @dev See {IIdentityRegistryStorage-modifyStoredIdentity}.
     */
    function modifyStoredIdentity(
        address _userAddress,
        IIdentity _identity
    ) external override onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0) || address(_identity) == address(0)) revert ZeroAddress();
        if (address(_identities[_userAddress].identityContract) == address(0)) {
            revert IdentityNotStored(_userAddress);
        }
        IIdentity oldIdentity = _identities[_userAddress].identityContract;
        _identities[_userAddress].identityContract = _identity;
        emit IdentityModified(oldIdentity, _identity);
    }

    /**
     * @dev See {IIdentityRegistryStorage-modifyStoredInvestorCountry}.
     */
    function modifyStoredInvestorCountry(
        address _userAddress,
        uint16 _country
    ) external override onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0)) revert ZeroAddress();
        if (address(_identities[_userAddress].identityContract) == address(0)) {
            revert IdentityNotStored(_userAddress);
        }
        _identities[_userAddress].investorCountry = _country;
        emit CountryModified(_userAddress, _country);
    }

    /**
     * @dev See {IIdentityRegistryStorage-removeIdentityFromStorage}.
     */
    function removeIdentityFromStorage(
        address _userAddress
    ) external override onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0)) revert ZeroAddress();
        if (address(_identities[_userAddress].identityContract) == address(0)) {
            revert IdentityNotStored(_userAddress);
        }
        IIdentity oldIdentity = _identities[_userAddress].identityContract;
        delete _identities[_userAddress];
        emit IdentityUnstored(_userAddress, oldIdentity);
    }

    // ============ IIdentityRegistryStorage — registry binding (admin-gated) ============

    /**
     * @dev See {IIdentityRegistryStorage-bindIdentityRegistry}.
     *      Grants AGENT_ROLE to the registry so it can write identity data.
     */
    function bindIdentityRegistry(
        address _identityRegistry
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (_identityRegistry == address(0)) revert InvalidRegistryAddress(_identityRegistry);
        if (_registryBound[_identityRegistry]) revert RegistryAlreadyBound(_identityRegistry);
        if (_identityRegistries.length >= MAX_BOUND_REGISTRIES) revert TooManyRegistries();
        _grantRole(AGENT_ROLE, _identityRegistry);
        _identityRegistries.push(_identityRegistry);
        _registryBound[_identityRegistry] = true;
        _registryBindingTime[_identityRegistry] = block.timestamp;
        emit IdentityRegistryBound(_identityRegistry);
    }

    /**
     * @dev See {IIdentityRegistryStorage-unbindIdentityRegistry}.
     *      Revokes AGENT_ROLE from the registry.
     */
    function unbindIdentityRegistry(
        address _identityRegistry
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (_identityRegistry == address(0)) revert InvalidRegistryAddress(_identityRegistry);
        if (!_registryBound[_identityRegistry]) revert RegistryNotBound(_identityRegistry);
        _revokeRole(AGENT_ROLE, _identityRegistry);
        _removeFromRegistriesArray(_identityRegistry);
        _registryBound[_identityRegistry] = false;
        delete _registryBindingTime[_identityRegistry];
        delete _registryBrandDID[_identityRegistry];
        emit IdentityRegistryUnbound(_identityRegistry);
    }

    // ============ IIdentityRegistryStorage — views ============

    /**
     * @dev See {IIdentityRegistryStorage-linkedIdentityRegistries}.
     */
    function linkedIdentityRegistries() external view override returns (address[] memory) {
        return _identityRegistries;
    }

    /**
     * @dev See {IIdentityRegistryStorage-storedIdentity}.
     */
    function storedIdentity(address _userAddress) external view override returns (IIdentity) {
        return _identities[_userAddress].identityContract;
    }

    /**
     * @dev See {IIdentityRegistryStorage-storedInvestorCountry}.
     */
    function storedInvestorCountry(address _userAddress) external view override returns (uint16) {
        return _identities[_userAddress].investorCountry;
    }

    // ============ IGalileoIdentityRegistryStorage extensions ============

    /**
     * @notice Bind a brand's identity registry with DID tracking
     * @dev Grants AGENT_ROLE to the registry. DID must be non-empty.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Registry address must not be zero
     * - Registry must not already be bound
     * - Brand DID must be non-empty
     * - Storage must not be at capacity (300 registries max)
     *
     * Emits {IdentityRegistryBound} and {BrandRegistryBound}
     */
    function bindBrandRegistry(
        address _identityRegistry,
        string calldata _brandDID
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (_identityRegistry == address(0)) revert InvalidRegistryAddress(_identityRegistry);
        if (_registryBound[_identityRegistry]) revert RegistryAlreadyBound(_identityRegistry);
        if (bytes(_brandDID).length == 0) revert InvalidBrandDID(_brandDID);
        if (_identityRegistries.length >= MAX_BOUND_REGISTRIES) revert TooManyRegistries();
        _grantRole(AGENT_ROLE, _identityRegistry);
        _identityRegistries.push(_identityRegistry);
        _registryBound[_identityRegistry] = true;
        _registryBrandDID[_identityRegistry] = _brandDID;
        _registryBindingTime[_identityRegistry] = block.timestamp;
        emit IdentityRegistryBound(_identityRegistry);
        emit BrandRegistryBound(_identityRegistry, _brandDID, msg.sender, block.timestamp);
    }

    /**
     * @notice Check if a registry is bound to this storage
     * @param _identityRegistry The registry address to check
     * @return True if the registry is currently bound
     */
    function isRegistryBound(address _identityRegistry) external view override returns (bool) {
        return _registryBound[_identityRegistry];
    }

    /**
     * @notice Get all bound registries (same as linkedIdentityRegistries)
     * @return Array of bound registry addresses
     */
    function getBoundRegistries() external view override returns (address[] memory) {
        return _identityRegistries;
    }

    /**
     * @notice Get the brand DID associated with a registry
     * @param _identityRegistry The registry address to query
     * @return The brand DID, or empty string if none was set or registry not bound
     */
    function getRegistryBrandDID(
        address _identityRegistry
    ) external view override returns (string memory) {
        return _registryBrandDID[_identityRegistry];
    }

    /**
     * @notice Unbind a brand registry with DID confirmation
     * @dev Revokes AGENT_ROLE from the registry. _brandDID must match the stored DID.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Registry must be currently bound
     * - Provided DID must match the stored DID
     *
     * Emits {IdentityRegistryUnbound} and {BrandRegistryUnbound}
     */
    function unbindBrandRegistry(
        address _identityRegistry,
        string calldata _brandDID
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_registryBound[_identityRegistry]) revert RegistryNotBound(_identityRegistry);
        if (
            keccak256(bytes(_registryBrandDID[_identityRegistry])) != keccak256(bytes(_brandDID))
        ) {
            revert DIDMismatch(_identityRegistry);
        }
        _revokeRole(AGENT_ROLE, _identityRegistry);
        _removeFromRegistriesArray(_identityRegistry);
        _registryBound[_identityRegistry] = false;
        delete _registryBindingTime[_identityRegistry];
        delete _registryBrandDID[_identityRegistry];
        emit IdentityRegistryUnbound(_identityRegistry);
        emit BrandRegistryUnbound(_identityRegistry, _brandDID, msg.sender, block.timestamp);
    }

    /**
     * @notice Update the brand DID for an existing bound registry
     * @dev Allows DID rotation without unbind/rebind cycle.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Registry must be currently bound
     * - New DID must be non-empty
     *
     * Emits {BrandDIDUpdated}
     */
    function updateBrandDID(
        address _identityRegistry,
        string calldata _newBrandDID
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_registryBound[_identityRegistry]) revert RegistryNotBound(_identityRegistry);
        if (bytes(_newBrandDID).length == 0) revert InvalidBrandDID(_newBrandDID);
        string memory oldDID = _registryBrandDID[_identityRegistry];
        _registryBrandDID[_identityRegistry] = _newBrandDID;
        emit BrandDIDUpdated(_identityRegistry, oldDID, _newBrandDID, msg.sender);
    }

    /**
     * @notice Get the total count of bound registries
     * @return The number of currently bound registries
     */
    function boundRegistryCount() external view override returns (uint256) {
        return _identityRegistries.length;
    }

    /**
     * @notice Get bound registry at a specific index
     * @param _index The index in the bound registries array
     * @return The registry address at the specified index
     */
    function boundRegistryAt(uint256 _index) external view override returns (address) {
        if (_index >= _identityRegistries.length) {
            revert IndexOutOfBounds(_index, _identityRegistries.length);
        }
        return _identityRegistries[_index];
    }

    /**
     * @notice Check if storage accepts new registry bindings
     * @return True if fewer than 300 registries are bound
     */
    function canBindNewRegistry() external view override returns (bool) {
        return _identityRegistries.length < MAX_BOUND_REGISTRIES;
    }

    /**
     * @notice Get the timestamp when a registry was bound
     * @param _identityRegistry The registry to query
     * @return The block timestamp when bound, or 0 if not bound
     */
    function getRegistryBindingTime(
        address _identityRegistry
    ) external view override returns (uint256) {
        return _registryBindingTime[_identityRegistry];
    }

    // ============ Internal helpers ============

    function _removeFromRegistriesArray(address _identityRegistry) internal {
        uint256 length = _identityRegistries.length;
        for (uint256 i = 0; i < length; i++) {
            if (_identityRegistries[i] == _identityRegistry) {
                _identityRegistries[i] = _identityRegistries[length - 1];
                _identityRegistries.pop();
                break;
            }
        }
    }
}
