// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IIdentityRegistryStorage} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistryStorage.sol";

/**
 * @title IGalileoIdentityRegistryStorage
 * @author Galileo Protocol Contributors
 * @notice Extended ERC-3643 Identity Registry Storage interface for Galileo consortium
 * @dev This interface extends the standard IIdentityRegistryStorage from ERC-3643
 *      with capabilities required for Galileo's federated identity architecture:
 *
 *      **Architecture Overview:**
 *      ```
 *      ┌────────────────────────────────────────────────────────────────┐
 *      │                  Galileo Consortium Storage                     │
 *      │           (IGalileoIdentityRegistryStorage)                     │
 *      │                                                                 │
 *      │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
 *      │  │ User A      │ │ User B      │ │ User C      │  ...          │
 *      │  │ Identity    │ │ Identity    │ │ Identity    │               │
 *      │  └─────────────┘ └─────────────┘ └─────────────┘               │
 *      └────────────────────────────────────────────────────────────────┘
 *               ▲                ▲                ▲
 *               │ bind           │ bind           │ bind
 *      ┌────────┴────────┐ ┌─────┴──────┐ ┌──────┴───────┐
 *      │ Brand A Registry │ │ Brand B    │ │ Brand C      │
 *      │ (did:galileo:    │ │ Registry   │ │ Registry     │
 *      │  brand:hermes)   │ │            │ │              │
 *      └─────────────────┘ └────────────┘ └──────────────┘
 *      ```
 *
 *      **Key Concepts:**
 *      - One shared storage per consortium holds all user identities
 *      - Multiple brand registries bind to the same storage
 *      - Storage holds identity mappings; registries enforce verification rules
 *      - Brand binding requires valid consortium membership claim
 *      - Each brand registry is associated with a DID for audit trail
 *
 *      The standard ERC-3643 IIdentityRegistryStorage functions are inherited:
 *      - addIdentityToStorage(address, IIdentity, uint16) - Add identity
 *      - modifyStoredIdentity(address, IIdentity) - Update identity contract
 *      - modifyStoredInvestorCountry(address, uint16) - Update country
 *      - removeIdentityFromStorage(address) - Remove identity
 *      - bindIdentityRegistry(address) - Bind a registry
 *      - unbindIdentityRegistry(address) - Unbind a registry
 *      - linkedIdentityRegistries() returns (address[]) - Get linked registries
 *      - storedIdentity(address) returns (IIdentity) - Get stored identity
 *      - storedInvestorCountry(address) returns (uint16) - Get stored country
 *
 * @custom:security-contact security@galileoprotocol.io
 */
interface IGalileoIdentityRegistryStorage is IIdentityRegistryStorage {
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when attempting to bind an already bound registry
     * @param identityRegistry The registry address that is already bound
     */
    error RegistryAlreadyBound(address identityRegistry);

    /**
     * @notice Thrown when attempting to operate on an unbound registry
     * @param identityRegistry The registry address that is not bound
     */
    error RegistryNotBound(address identityRegistry);

    /**
     * @notice Thrown when the brand DID format is invalid
     * @param brandDID The invalid DID that was provided
     */
    error InvalidBrandDID(string brandDID);

    /**
     * @notice Thrown when the caller lacks consortium membership
     * @param caller The address that attempted the operation
     */
    error CallerNotConsortiumMember(address caller);

    /**
     * @notice Thrown when the identity registry address is invalid
     * @param identityRegistry The invalid registry address
     */
    error InvalidRegistryAddress(address identityRegistry);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a brand registry is bound to this storage
     * @param identityRegistry The bound registry's address
     * @param brandDID The brand's decentralized identifier
     * @param boundBy The address that performed the binding
     * @param timestamp The block timestamp of binding
     */
    event BrandRegistryBound(
        address indexed identityRegistry,
        string brandDID,
        address indexed boundBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a brand registry is unbound from this storage
     * @param identityRegistry The unbound registry's address
     * @param brandDID The brand's DID that was associated
     * @param unboundBy The address that performed the unbinding
     * @param timestamp The block timestamp of unbinding
     */
    event BrandRegistryUnbound(
        address indexed identityRegistry,
        string brandDID,
        address indexed unboundBy,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a brand's DID is updated
     * @param identityRegistry The registry whose DID was updated
     * @param oldBrandDID The previous brand DID
     * @param newBrandDID The new brand DID
     * @param updatedBy The address that performed the update
     */
    event BrandDIDUpdated(
        address indexed identityRegistry,
        string oldBrandDID,
        string newBrandDID,
        address indexed updatedBy
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // GALILEO EXTENSION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Bind a brand's identity registry with consortium verification
     * @dev This function extends the standard bindIdentityRegistry by requiring
     *      a brand DID for audit trail and traceability. The DID must follow
     *      the did:galileo:brand:{identifier} format.
     *
     *      **Access Control:**
     *      Only callable by:
     *      - Consortium admin with REGISTRY_ADMIN_ROLE
     *      - Brand with valid consortium membership claim
     *
     *      **Validation:**
     *      - Registry address must not be zero
     *      - Registry must not already be bound
     *      - Brand DID must be valid did:galileo format
     *      - Caller must have authorization
     *
     * @param _identityRegistry The brand's Identity Registry contract address
     * @param _brandDID The brand's decentralized identifier (e.g., "did:galileo:brand:hermes")
     *
     * @custom:emits BrandRegistryBound when successful
     *
     * @custom:example
     *      // Brand binding their registry
     *      storage.bindBrandRegistry(
     *          0x1234...abcd,
     *          "did:galileo:brand:hermes"
     *      );
     */
    function bindBrandRegistry(
        address _identityRegistry,
        string calldata _brandDID
    ) external;

    /**
     * @notice Check if a registry is bound to this storage
     * @dev Efficiently checks binding status without returning full registry list.
     *      This is gas-efficient for conditional logic in other contracts.
     *
     * @param _identityRegistry The registry address to check
     * @return True if the registry is currently bound to this storage
     *
     * @custom:example
     *      // Verify before cross-registry operation
     *      require(storage.isRegistryBound(brandRegistry), "Registry not bound");
     */
    function isRegistryBound(address _identityRegistry) external view returns (bool);

    /**
     * @notice Get all brand registries bound to this storage
     * @dev Returns the complete list of currently bound registry addresses.
     *      This may be gas-intensive for large consortiums; consider pagination
     *      for production use with many brands.
     *
     *      Note: This returns the same data as linkedIdentityRegistries() from
     *      the base interface, but is named for clarity in the Galileo context.
     *
     * @return Array of bound registry addresses
     *
     * @custom:example
     *      // Iterate through all bound registries
     *      address[] memory registries = storage.getBoundRegistries();
     *      for (uint i = 0; i < registries.length; i++) {
     *          // Process each registry...
     *      }
     */
    function getBoundRegistries() external view returns (address[] memory);

    /**
     * @notice Get the brand DID associated with a registry
     * @dev Returns the DID that was provided when the registry was bound.
     *      Returns empty string if registry is not bound.
     *
     *      The DID enables:
     *      - Audit trail for cross-brand operations
     *      - Off-chain resolution to brand metadata
     *      - Compliance reporting and traceability
     *
     * @param _identityRegistry The registry address to query
     * @return The brand DID string, or empty string if not bound
     *
     * @custom:example
     *      // Get brand DID for logging
     *      string memory brandDID = storage.getRegistryBrandDID(registryAddr);
     *      emit AuditLog(brandDID, operation);
     */
    function getRegistryBrandDID(address _identityRegistry) external view returns (string memory);

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTIONAL EXTENSION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Unbind a brand registry with DID verification
     * @dev Extended unbind that requires DID confirmation for safety.
     *      This prevents accidental unbinding of the wrong registry.
     *
     * @param _identityRegistry The registry address to unbind
     * @param _brandDID The brand DID for confirmation (must match stored DID)
     *
     * @custom:emits BrandRegistryUnbound when successful
     */
    function unbindBrandRegistry(
        address _identityRegistry,
        string calldata _brandDID
    ) external;

    /**
     * @notice Update the brand DID for an existing bound registry
     * @dev Allows updating DID without unbind/rebind cycle.
     *      Useful for brand mergers, rebranding, or DID rotation.
     *
     * @param _identityRegistry The registry address to update
     * @param _newBrandDID The new brand DID
     *
     * @custom:emits BrandDIDUpdated when successful
     */
    function updateBrandDID(
        address _identityRegistry,
        string calldata _newBrandDID
    ) external;

    /**
     * @notice Get the total count of bound registries
     * @dev Gas-efficient alternative to getBoundRegistries().length
     * @return The number of currently bound registries
     */
    function boundRegistryCount() external view returns (uint256);

    /**
     * @notice Get bound registry at a specific index
     * @dev Enables pagination through bound registries
     * @param _index The index in the bound registries array
     * @return The registry address at the specified index
     */
    function boundRegistryAt(uint256 _index) external view returns (address);

    /**
     * @notice Check if storage accepts new registry bindings
     * @dev May return false if storage is at capacity or in maintenance mode
     * @return True if new registries can be bound
     */
    function canBindNewRegistry() external view returns (bool);

    /**
     * @notice Get the timestamp when a registry was bound
     * @dev Useful for audit and compliance purposes
     * @param _identityRegistry The registry to query
     * @return The block timestamp when the registry was bound, or 0 if not bound
     */
    function getRegistryBindingTime(address _identityRegistry) external view returns (uint256);
}
