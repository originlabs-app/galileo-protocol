// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import {IModularCompliance} from "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";

/**
 * @title IGalileoCompliance
 * @author Galileo Protocol Contributors
 * @notice Extended modular compliance interface with Galileo-specific capabilities
 * @dev Extends the standard ERC-3643 IModularCompliance with features essential for
 *      the luxury goods ecosystem:
 *
 *      1. **Detailed Failure Reasons**: canTransferWithReason() provides actionable
 *         feedback on why a transfer failed, enabling better UX and debugging.
 *
 *      2. **Batch Compliance Checks**: canTransferBatch() enables gas-efficient
 *         checking of multiple transfers in a single call, essential for marketplace
 *         operations and bulk transfers.
 *
 *      3. **Module Introspection**: Enhanced module discovery and filtering by type,
 *         enabling compliance dashboards and dynamic UI adaptation.
 *
 *      4. **Module Ordering**: Support for ordered module execution where some modules
 *         should run before others (e.g., sanctions check before brand check).
 *
 *      Integration with Identity:
 *      - Modules typically query IGalileoIdentityRegistry for claim verification
 *      - Uses GalileoClaimTopics for standardized claim topic references
 *      - Supports batch verification for multi-claim eligibility checks
 *
 *      Luxury-Specific Modules:
 *      - IBrandAuthorizationModule: Authorized retailer verification
 *      - ICPOCertificationModule: CPO certification requirements
 *      - IServiceCenterModule: MRO authorization validation
 *
 * Reference: ERC-3643 T-REX v4.1.3 (extended)
 * Specification: GSPEC-COMPLIANCE-002
 * @custom:security-contact security@galileoprotocol.io
 */
interface IGalileoCompliance is IModularCompliance {
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when batch arrays have mismatched lengths
     * @param fromLength Length of _from array
     * @param toLength Length of _to array
     * @param amountsLength Length of _amounts array
     */
    error BatchArrayLengthMismatch(uint256 fromLength, uint256 toLength, uint256 amountsLength);

    /**
     * @notice Thrown when batch operation exceeds maximum size
     * @param requested Requested batch size
     * @param maximum Maximum allowed batch size
     */
    error BatchSizeTooLarge(uint256 requested, uint256 maximum);

    /**
     * @notice Thrown when module type is not recognized
     * @param moduleType The unrecognized module type
     */
    error UnknownModuleType(bytes4 moduleType);

    /**
     * @notice Thrown when attempting to add duplicate module
     * @param module The module address that already exists
     */
    error ModuleAlreadyAdded(address module);

    /**
     * @notice Thrown when module is not found in the compliance
     * @param module The module address that was not found
     */
    error ModuleNotFound(address module);

    /**
     * @notice Thrown when module order index is out of bounds
     * @param index The invalid index
     * @param maxIndex The maximum valid index
     */
    error InvalidModuleOrder(uint256 index, uint256 maxIndex);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a module is added with type information
     * @param module The module contract address
     * @param moduleType The module's type identifier
     * @param name The module's human-readable name
     */
    event ModuleAdded(
        address indexed module,
        bytes4 indexed moduleType,
        string name
    );

    /**
     * @notice Emitted when a module is removed
     * @param module The module contract address
     * @param moduleType The module's type identifier
     */
    event ModuleRemoved(
        address indexed module,
        bytes4 indexed moduleType
    );

    /**
     * @notice Emitted when module execution order is changed
     * @param oldOrder Previous module order
     * @param newOrder New module order
     */
    event ModuleOrderChanged(
        address[] oldOrder,
        address[] newOrder
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED COMPLIANCE CHECKS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check transfer compliance with detailed failure information
     * @dev Provides actionable feedback when a transfer fails compliance checks.
     *      Unlike canTransfer() which returns only a boolean, this function
     *      identifies exactly which module rejected the transfer and why.
     *
     *      Use cases:
     *      - Debugging compliance failures during development
     *      - Providing meaningful error messages to end users
     *      - Compliance dashboards and monitoring
     *      - Automated remediation suggestions
     *
     *      Gas Consideration:
     *      - More expensive than canTransfer() due to string handling
     *      - Use canTransfer() for on-chain checks where only boolean is needed
     *      - Use this function for UX and debugging
     *
     * @param _from Address sending tokens
     * @param _to Address receiving tokens
     * @param _amount Amount of tokens being transferred
     * @return allowed True if transfer passes all compliance checks
     * @return reason Human-readable reason if not allowed (empty if allowed)
     * @return failingModule Address of module that rejected (zero if allowed)
     *
     * @custom:example
     *      (bool allowed, string memory reason, address failingMod) =
     *          compliance.canTransferWithReason(sender, recipient, 100);
     *      if (!allowed) {
     *          revert TransferNotCompliant(reason, failingMod);
     *      }
     */
    function canTransferWithReason(
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (bool allowed, string memory reason, address failingModule);

    /**
     * @notice Batch compliance check for multiple transfers
     * @dev Efficiently checks compliance for multiple transfers in a single call.
     *      Essential for marketplace operations, bulk transfers, and portfolio
     *      rebalancing where many transfers need to be validated.
     *
     *      Returns an array parallel to the input arrays where results[i]
     *      corresponds to the transfer from[i] -> to[i] of amounts[i].
     *
     *      Gas Optimization:
     *      - Amortizes fixed costs across multiple checks
     *      - Enables batching of identity registry queries
     *      - Reduces RPC call overhead for off-chain validation
     *
     *      Array Requirements:
     *      - All arrays must have the same length
     *      - Maximum batch size is implementation-defined (suggest 100)
     *
     * @param _from Array of sender addresses
     * @param _to Array of recipient addresses
     * @param _amounts Array of transfer amounts
     * @return results Array of boolean results (true = compliant, false = not compliant)
     *
     * @custom:example
     *      address[] memory senders = new address[](3);
     *      address[] memory recipients = new address[](3);
     *      uint256[] memory amounts = new uint256[](3);
     *      // ... populate arrays ...
     *      bool[] memory results = compliance.canTransferBatch(senders, recipients, amounts);
     */
    function canTransferBatch(
        address[] calldata _from,
        address[] calldata _to,
        uint256[] calldata _amounts
    ) external view returns (bool[] memory results);

    /**
     * @notice Batch compliance check with detailed failure information
     * @dev Combines batch checking with failure details for each transfer.
     *      More expensive than canTransferBatch but provides full diagnostics.
     *
     * @param _from Array of sender addresses
     * @param _to Array of recipient addresses
     * @param _amounts Array of transfer amounts
     * @return allowed Array of boolean results
     * @return reasons Array of failure reasons (empty strings for allowed transfers)
     * @return failingModules Array of failing module addresses (zero for allowed)
     */
    function canTransferBatchWithReasons(
        address[] calldata _from,
        address[] calldata _to,
        uint256[] calldata _amounts
    ) external view returns (
        bool[] memory allowed,
        string[] memory reasons,
        address[] memory failingModules
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE INTROSPECTION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get all modules of a specific type
     * @dev Enables filtering modules by function for UI and analytics.
     *
     *      Standard types from ModuleTypes library:
     *      - JURISDICTION, BALANCE, TIME, ROLE, SANCTIONS, BRAND,
     *        CERTIFICATION, SERVICE
     *
     * @param moduleType The module type to filter by (bytes4)
     * @return Array of module addresses matching the type
     */
    function getModulesByType(bytes4 moduleType) external view returns (address[] memory);

    /**
     * @notice Check if a specific module is enabled
     * @dev Fast lookup to determine if a module is currently active.
     *
     * @param module Address of the module to check
     * @return True if module is bound and active
     */
    function isModuleEnabled(address module) external view returns (bool);

    /**
     * @notice Get the total number of bound modules
     * @dev Useful for iteration and capacity planning.
     *
     * @return Number of modules currently bound
     */
    function moduleCount() external view returns (uint256);

    /**
     * @notice Get module information by index
     * @dev Enables enumeration of all modules with their metadata.
     *
     * @param index The module index (0-based)
     * @return module The module address
     * @return moduleType The module's type identifier
     * @return moduleName The module's human-readable name
     */
    function getModuleAt(uint256 index) external view returns (
        address module,
        bytes4 moduleType,
        string memory moduleName
    );

    /**
     * @notice Get all module types currently in use
     * @dev Returns unique set of module types that have at least one module.
     *      Useful for compliance dashboards to know what types of rules are active.
     *
     * @return Array of unique module types currently bound
     */
    function getActiveModuleTypes() external view returns (bytes4[] memory);

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE ORDERING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the execution order of modules
     * @dev Some modules should run before others for efficiency or correctness:
     *      - Sanctions check before complex brand checks (fail fast)
     *      - Balance limits before time locks
     *      - Identity verification before role checks
     *
     *      The order array must contain exactly the modules currently bound.
     *
     * @param _newOrder Array of module addresses in desired execution order
     */
    function setModuleOrder(address[] calldata _newOrder) external;

    /**
     * @notice Get the current module execution order
     * @dev Returns modules in the order they are checked during canTransfer().
     *
     * @return Array of module addresses in execution order
     */
    function getModuleOrder() external view returns (address[] memory);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the maximum batch size allowed
     * @dev Implementation-defined limit to prevent gas limit issues.
     *
     * @return Maximum number of transfers in a batch operation
     */
    function maxBatchSize() external view returns (uint256);

    /**
     * @notice Check if this compliance is paused
     * @dev When paused, all transfers should be rejected (emergency stop).
     *
     * @return True if compliance is paused
     */
    function isPaused() external view returns (bool);

    /**
     * @notice Get the identity registry this compliance uses for verification
     * @dev Modules typically use this registry to verify holder claims.
     *
     * @return Address of the bound identity registry
     */
    function identityRegistry() external view returns (address);
}
