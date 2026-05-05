// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

/**
 * @title IComplianceModule
 * @author Galileo Protocol Contributors
 * @notice Base interface for pluggable compliance modules in the modular compliance system
 * @dev Compliance modules implement specific transfer rules that can be composed together.
 *      Each module focuses on one aspect of compliance (jurisdiction, balance, time, etc.)
 *      and can be added/removed from a ModularCompliance contract dynamically.
 *
 *      Module Lifecycle:
 *      1. Module is deployed as standalone contract
 *      2. Module is added to ModularCompliance via addModule()
 *      3. ModularCompliance calls bindCompliance() on the module
 *      4. Module participates in transfer checks via moduleCheck()
 *      5. Module receives lifecycle notifications (mint, burn, transfer)
 *      6. Module can be removed via removeModule() + unbindCompliance()
 *
 *      Implementation Requirements:
 *      - moduleCheck() MUST be gas-efficient (called on every transfer)
 *      - moduleCheck() MUST be deterministic (same inputs = same output)
 *      - moduleCheck() MUST NOT revert (return false instead)
 *      - Lifecycle actions SHOULD be idempotent when possible
 *
 *      Security Considerations:
 *      - Only bound compliance contracts should call lifecycle functions
 *      - State modifications should validate caller is bound compliance
 *      - Avoid unbounded loops in moduleCheck()
 *
 * Reference: ERC-3643 Module Pattern
 * Specification: GSPEC-COMPLIANCE-001
 * @custom:security-contact security@galileoprotocol.io
 */
interface IComplianceModule {
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when caller is not a bound compliance contract
     * @param caller The address that attempted the call
     */
    error CallerNotBoundCompliance(address caller);

    /**
     * @notice Thrown when attempting to bind an already bound compliance
     * @param compliance The compliance address that is already bound
     */
    error ComplianceAlreadyBound(address compliance);

    /**
     * @notice Thrown when attempting to unbind a compliance that is not bound
     * @param compliance The compliance address that is not bound
     */
    error ComplianceNotBound(address compliance);

    /**
     * @notice Thrown when module configuration is invalid
     * @param reason Description of the configuration error
     */
    error InvalidModuleConfiguration(string reason);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a compliance contract is bound to this module
     * @param compliance The compliance contract address
     */
    event ComplianceBound(address indexed compliance);

    /**
     * @notice Emitted when a compliance contract is unbound from this module
     * @param compliance The compliance contract address
     */
    event ComplianceUnbound(address indexed compliance);

    /**
     * @notice Emitted when module check fails for a transfer
     * @param compliance The compliance contract that called the check
     * @param from The sender address
     * @param to The recipient address
     * @param value The transfer amount
     * @param reason Human-readable failure reason
     */
    event ModuleCheckFailed(
        address indexed compliance,
        address indexed from,
        address indexed to,
        uint256 value,
        string reason
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Returns the module type identifier
     * @dev Used for filtering and categorizing modules. Standard types are defined
     *      in ModuleTypes library. Custom modules can define their own types.
     *
     *      Standard types:
     *      - MODULE_TYPE_JURISDICTION: Geographic/regulatory restrictions
     *      - MODULE_TYPE_BALANCE: Balance-based limits
     *      - MODULE_TYPE_TIME: Time-based restrictions
     *      - MODULE_TYPE_ROLE: Role/permission-based access
     *      - MODULE_TYPE_SANCTIONS: Sanctions/watchlist checking
     *      - MODULE_TYPE_BRAND: Brand-specific rules (Galileo extension)
     *
     * @return Four-byte type identifier (bytes4)
     */
    function moduleType() external pure returns (bytes4);

    /**
     * @notice Returns the human-readable module name
     * @dev Should be concise but descriptive (e.g., "Brand Authorization Module")
     * @return Module name string
     */
    function name() external pure returns (string memory);

    /**
     * @notice Returns the module version
     * @dev Follows semantic versioning (e.g., "1.0.0")
     * @return Version string
     */
    function version() external pure returns (string memory);

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE COMPLIANCE CHECK
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Core compliance check for transfers
     * @dev Called by ModularCompliance.canTransfer() for each bound module.
     *      Returns true if this module allows the transfer, false otherwise.
     *
     *      Implementation Guidelines:
     *      - MUST NOT revert under any circumstances (return false instead)
     *      - MUST be gas-efficient (target < 50k gas)
     *      - MUST be deterministic (no randomness or block-dependent logic)
     *      - SHOULD emit ModuleCheckFailed event when returning false
     *
     *      The _compliance parameter allows modules to:
     *      - Query the compliance contract for additional context
     *      - Access the bound token address
     *      - Coordinate with other modules if needed
     *
     * @param _from Address sending tokens (zero address for mints)
     * @param _to Address receiving tokens (zero address for burns)
     * @param _value Amount of tokens being transferred
     * @param _compliance Address of the calling ModularCompliance contract
     * @return True if transfer is allowed by this module, false otherwise
     */
    function moduleCheck(
        address _from,
        address _to,
        uint256 _value,
        address _compliance
    ) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Called after tokens are minted
     * @dev Allows modules to update internal state after minting.
     *      Called by ModularCompliance.created() which is called by the token.
     *
     *      Use cases:
     *      - Update holder count tracking
     *      - Initialize holder-specific data
     *      - Emit analytics events
     *
     *      MUST only be callable by bound compliance contracts.
     *
     * @param _to Address receiving minted tokens
     * @param _value Amount of tokens minted
     * @param _compliance Address of the calling ModularCompliance contract
     */
    function moduleMintAction(
        address _to,
        uint256 _value,
        address _compliance
    ) external;

    /**
     * @notice Called after tokens are burned
     * @dev Allows modules to update internal state after burning.
     *      Called by ModularCompliance.destroyed() which is called by the token.
     *
     *      Use cases:
     *      - Update holder count tracking
     *      - Clean up holder-specific data
     *      - Emit analytics events
     *
     *      MUST only be callable by bound compliance contracts.
     *
     * @param _from Address whose tokens were burned
     * @param _value Amount of tokens burned
     * @param _compliance Address of the calling ModularCompliance contract
     */
    function moduleBurnAction(
        address _from,
        uint256 _value,
        address _compliance
    ) external;

    /**
     * @notice Called after a successful transfer
     * @dev Allows modules to update internal state after transfers.
     *      Called by ModularCompliance.transferred() which is called by the token.
     *
     *      Use cases:
     *      - Update balance tracking for limit modules
     *      - Record transfer timestamps for time-lock modules
     *      - Update holder lists
     *      - Emit analytics events
     *
     *      MUST only be callable by bound compliance contracts.
     *
     * @param _from Address sending tokens
     * @param _to Address receiving tokens
     * @param _value Amount of tokens transferred
     * @param _compliance Address of the calling ModularCompliance contract
     */
    function moduleTransferAction(
        address _from,
        address _to,
        uint256 _value,
        address _compliance
    ) external;

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPLIANCE BINDING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Binds a compliance contract to this module
     * @dev Called by ModularCompliance when this module is added via addModule().
     *      Establishes the relationship allowing the compliance to call lifecycle hooks.
     *
     *      Implementation MUST:
     *      - Track the compliance as bound
     *      - Allow multiple compliance contracts to be bound (if supported)
     *      - Emit ComplianceBound event
     *
     *      Access Control:
     *      - Typically callable by any address (compliance binds itself)
     *      - Some implementations may restrict to authorized callers
     *
     * @param _compliance Address of the compliance contract to bind
     */
    function bindCompliance(address _compliance) external;

    /**
     * @notice Unbinds a compliance contract from this module
     * @dev Called by ModularCompliance when this module is removed via removeModule().
     *      Terminates the relationship and cleans up any compliance-specific state.
     *
     *      Implementation MUST:
     *      - Remove the compliance from bound list
     *      - Emit ComplianceUnbound event
     *      - Optionally clean up compliance-specific state
     *
     * @param _compliance Address of the compliance contract to unbind
     */
    function unbindCompliance(address _compliance) external;

    /**
     * @notice Checks if a compliance contract is bound to this module
     * @dev Used to verify caller authorization for lifecycle hooks.
     *
     * @param _compliance Address to check
     * @return True if the compliance is bound, false otherwise
     */
    function isComplianceBound(address _compliance) external view returns (bool);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE TYPE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title ModuleTypes
 * @notice Standard module type identifiers for compliance module categorization
 * @dev Module types enable filtering and discovery of modules by function.
 *      Types are computed as bytes4(keccak256("TYPE_NAME")) for collision resistance.
 */
library ModuleTypes {
    /// @notice Jurisdiction-based compliance (geographic restrictions)
    /// @dev Examples: country blacklists, regional transfer limits
    bytes4 public constant JURISDICTION = bytes4(keccak256("JURISDICTION"));

    /// @notice Balance-based compliance (quantity limits)
    /// @dev Examples: max balance per holder, minimum holding requirements
    bytes4 public constant BALANCE = bytes4(keccak256("BALANCE"));

    /// @notice Time-based compliance (temporal restrictions)
    /// @dev Examples: lock-up periods, vesting schedules, trading windows
    bytes4 public constant TIME = bytes4(keccak256("TIME"));

    /// @notice Role-based compliance (permission checks)
    /// @dev Examples: accredited investor requirements, institutional only
    bytes4 public constant ROLE = bytes4(keccak256("ROLE"));

    /// @notice Sanctions compliance (watchlist screening)
    /// @dev Examples: OFAC list checking, PEP screening
    bytes4 public constant SANCTIONS = bytes4(keccak256("SANCTIONS"));

    /// @notice Brand-specific compliance (Galileo extension)
    /// @dev Examples: authorized retailer verification, brand authorization
    bytes4 public constant BRAND = bytes4(keccak256("BRAND"));

    /// @notice Certification compliance (credential verification)
    /// @dev Examples: CPO certification, authentication requirements
    bytes4 public constant CERTIFICATION = bytes4(keccak256("CERTIFICATION"));

    /// @notice Service compliance (service provider authorization)
    /// @dev Examples: MRO authorization, repair center validation
    bytes4 public constant SERVICE = bytes4(keccak256("SERVICE"));
}
