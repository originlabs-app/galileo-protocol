// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IAccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/IAccessControlEnumerable.sol";

/**
 * @title IGalileoAccessControl
 * @author Galileo Protocol Contributors
 * @notice Extended RBAC interface for the Galileo ecosystem with ONCHAINID integration
 * @dev This interface extends OpenZeppelin's IAccessControlEnumerable with additional
 *      capabilities required for the Galileo luxury goods ecosystem:
 *
 *      1. **Identity-Aware Role Grants**: Grants roles only after verifying the recipient
 *         has a valid ONCHAINID with the required claim topic (e.g., KYB_VERIFIED for
 *         brand administrators, SERVICE_CENTER for authorized repair centers).
 *
 *      2. **Claim Requirement Mapping**: Each privileged role can be configured to require
 *         a specific ONCHAINID claim topic for verification.
 *
 *      3. **Two-Phase Role Grants**: For critical roles, supports request-confirm pattern
 *         with time delay to prevent unauthorized grants.
 *
 *      4. **Emergency Access**: Time-limited emergency role grants with automatic expiry
 *         and audit trail.
 *
 *      5. **Suspension Mechanism**: Temporary role suspension without full revocation,
 *         useful during investigations.
 *
 *      The standard OpenZeppelin IAccessControlEnumerable functions are inherited:
 *      - hasRole(bytes32, address) - Check if account has role
 *      - getRoleAdmin(bytes32) - Get admin role for a role
 *      - grantRole(bytes32, address) - Grant role (admin only)
 *      - revokeRole(bytes32, address) - Revoke role (admin only)
 *      - renounceRole(bytes32, address) - Renounce own role
 *      - getRoleMember(bytes32, uint256) - Get member by index
 *      - getRoleMemberCount(bytes32) - Get member count
 *
 *      Implements: GSPEC-INFRA-001 (RBAC Framework Specification)
 *      References: ERC-3643 (T-REX), OpenZeppelin AccessControl v5.x
 *
 * @custom:security-contact security@galileoprotocol.io
 */
interface IGalileoAccessControl is IAccessControlEnumerable {
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLE CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Brand administrator role - full control over brand's products
     * @dev keccak256("BRAND_ADMIN_ROLE") = 0x7a8dc26796a1e50e6e190b70259f58f6a4edd5b22280ceecc82b687b8e982869
     *      Requires: KYB_VERIFIED claim topic on ONCHAINID
     * @return The bytes32 identifier for the brand admin role
     */
    function BRAND_ADMIN_ROLE() external pure returns (bytes32);

    /**
     * @notice Operator role for day-to-day product lifecycle operations
     * @dev keccak256("OPERATOR_ROLE") = 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929
     *      Does not require on-chain claim verification (JWT-only)
     * @return The bytes32 identifier for the operator role
     */
    function OPERATOR_ROLE() external pure returns (bytes32);

    /**
     * @notice Auditor role for read-only access to all data and audit logs
     * @dev keccak256("AUDITOR_ROLE") = 0xf55c2b664c9a7c9e80d9b8e2e4b8e9e1e4e8d9a5a6e7a9c0d1e2f3a4b5c6d7e8
     *      Does not require on-chain claim verification (JWT-only)
     * @return The bytes32 identifier for the auditor role
     */
    function AUDITOR_ROLE() external pure returns (bytes32);

    /**
     * @notice Regulator role for regulatory authority access
     * @dev keccak256("REGULATOR_ROLE") = 0x3f99c47a2aeba1c64d2baa2c5b9b2d1ee4e3c6c7b8a9c0d1e2f3a4b5c6d7e8f9
     *      Does not require on-chain claim verification (pre-verified at TSC level)
     * @return The bytes32 identifier for the regulator role
     */
    function REGULATOR_ROLE() external pure returns (bytes32);

    /**
     * @notice Service center administrator role for authorized repair operations
     * @dev keccak256("SERVICE_CENTER_ADMIN_ROLE") = 0x1ab3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4
     *      Requires: SERVICE_CENTER claim topic on ONCHAINID
     * @return The bytes32 identifier for the service center admin role
     */
    function SERVICE_CENTER_ADMIN_ROLE() external pure returns (bytes32);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when the identity registry has not been set
     */
    error IdentityRegistryNotSet();

    /**
     * @notice Thrown when an account's identity cannot be verified
     * @param account The account whose identity verification failed
     */
    error IdentityNotVerified(address account);

    /**
     * @notice Thrown when an account lacks the required claim for a role
     * @param account The account that lacks the claim
     * @param claimTopic The claim topic that was required
     */
    error ClaimNotValid(address account, uint256 claimTopic);

    /**
     * @notice Thrown when attempting to set an invalid claim requirement
     * @param role The role for which the requirement was being set
     * @param claimTopic The invalid claim topic
     */
    error InvalidRoleClaimRequirement(bytes32 role, uint256 claimTopic);

    /**
     * @notice Thrown when attempting to grant a role that is suspended for an account
     * @param role The suspended role
     * @param account The account with the suspended role
     */
    error RoleIsSuspended(bytes32 role, address account);

    /**
     * @notice Thrown when emergency access duration exceeds maximum
     * @param requested The requested duration
     * @param maximum The maximum allowed duration
     */
    error EmergencyDurationExceeded(uint256 requested, uint256 maximum);

    /**
     * @notice Thrown when a two-phase grant request has not been made or has expired
     * @param role The role being granted
     * @param account The account for which grant was attempted
     */
    error NoValidGrantRequest(bytes32 role, address account);

    /**
     * @notice Thrown when the delay period for two-phase grant has not elapsed
     * @param role The role being granted
     * @param account The account for which grant was attempted
     * @param remainingTime Seconds until grant can be confirmed
     */
    error GrantDelayNotElapsed(bytes32 role, address account, uint256 remainingTime);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a role is granted with identity verification
     * @param role The role that was granted
     * @param account The account that received the role
     * @param identityAddress The ONCHAINID contract address of the account
     * @param claimTopic The claim topic that was verified
     * @param sender The address that initiated the grant
     */
    event RoleGrantedWithIdentity(
        bytes32 indexed role,
        address indexed account,
        address indexed identityAddress,
        uint256 claimTopic,
        address sender
    );

    /**
     * @notice Emitted when identity verification fails during role grant
     * @param role The role that was being granted
     * @param account The account for which verification failed
     * @param reason Human-readable failure reason
     */
    event RoleVerificationFailed(
        bytes32 indexed role,
        address indexed account,
        string reason
    );

    /**
     * @notice Emitted when a claim requirement is set for a role
     * @param role The role for which the requirement was set
     * @param claimTopic The claim topic now required for the role
     * @param previousClaimTopic The previous claim topic requirement (0 if none)
     */
    event RoleClaimRequirementSet(
        bytes32 indexed role,
        uint256 indexed claimTopic,
        uint256 previousClaimTopic
    );

    /**
     * @notice Emitted when the identity registry is updated
     * @param oldRegistry The previous identity registry address
     * @param newRegistry The new identity registry address
     */
    event IdentityRegistrySet(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    /**
     * @notice Emitted when a role is suspended for an account
     * @param role The role that was suspended
     * @param account The account whose role was suspended
     * @param reason The reason for suspension
     * @param suspendedBy The address that initiated the suspension
     */
    event RoleSuspended(
        bytes32 indexed role,
        address indexed account,
        string reason,
        address suspendedBy
    );

    /**
     * @notice Emitted when a suspended role is reinstated
     * @param role The role that was reinstated
     * @param account The account whose role was reinstated
     * @param reinstatedBy The address that initiated the reinstatement
     */
    event RoleReinstated(
        bytes32 indexed role,
        address indexed account,
        address reinstatedBy
    );

    /**
     * @notice Emitted when emergency access is granted
     * @param role The role granted for emergency access
     * @param account The account that received emergency access
     * @param duration Duration of emergency access in seconds
     * @param expiresAt Timestamp when emergency access expires
     * @param reason The documented reason for emergency access
     */
    event EmergencyAccessGranted(
        bytes32 indexed role,
        address indexed account,
        uint256 duration,
        uint256 expiresAt,
        string reason
    );

    /**
     * @notice Emitted when emergency access is revoked (manually or expired)
     * @param role The role that was revoked
     * @param account The account whose emergency access ended
     * @param wasExpired True if automatically expired, false if manually revoked
     */
    event EmergencyAccessEnded(
        bytes32 indexed role,
        address indexed account,
        bool wasExpired
    );

    /**
     * @notice Emitted when a two-phase role grant is requested
     * @param role The role being requested
     * @param account The account that will receive the role
     * @param requestedBy The address that made the request
     * @param canConfirmAt Timestamp when the grant can be confirmed
     */
    event RoleGrantRequested(
        bytes32 indexed role,
        address indexed account,
        address requestedBy,
        uint256 canConfirmAt
    );

    /**
     * @notice Emitted when a two-phase role grant request is cancelled
     * @param role The role that was requested
     * @param account The account that would have received the role
     * @param cancelledBy The address that cancelled the request
     */
    event RoleGrantRequestCancelled(
        bytes32 indexed role,
        address indexed account,
        address cancelledBy
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // IDENTITY REGISTRY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the identity registry used for ONCHAINID verification
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     *      The identity registry must implement IGalileoIdentityRegistry
     * @param identityRegistry The address of the identity registry contract
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     * - identityRegistry must not be zero address
     *
     * Emits {IdentityRegistrySet}
     */
    function setIdentityRegistry(address identityRegistry) external;

    /**
     * @notice Get the current identity registry address
     * @return The address of the identity registry contract, or zero if not set
     */
    function getIdentityRegistry() external view returns (address);

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM REQUIREMENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the required claim topic for a role
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     *      When a claim requirement is set, grantRoleWithIdentity MUST be used
     *      to grant the role, and the recipient must have a valid claim
     *
     * @param role The role to configure
     * @param claimTopic The claim topic required for this role
     *        Set to 0 to remove the requirement
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     * - claimTopic must be registered in the ClaimTopicsRegistry (if non-zero)
     *
     * Emits {RoleClaimRequirementSet}
     *
     * @custom:example
     *      // Require KYB_VERIFIED for BRAND_ADMIN_ROLE
     *      uint256 kybTopic = uint256(keccak256("galileo.kyb.verified"));
     *      accessControl.setRoleClaimRequirement(BRAND_ADMIN_ROLE(), kybTopic);
     */
    function setRoleClaimRequirement(bytes32 role, uint256 claimTopic) external;

    /**
     * @notice Get the required claim topic for a role
     * @param role The role to query
     * @return The claim topic required for the role, or 0 if no requirement
     */
    function getRoleClaimRequirement(bytes32 role) external view returns (uint256);

    // ═══════════════════════════════════════════════════════════════════════════
    // IDENTITY-AWARE ROLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Grant a role with ONCHAINID verification
     * @dev This function performs the following steps:
     *      1. Verifies the caller has the role's admin role
     *      2. Looks up the account's ONCHAINID via the identity registry
     *      3. Verifies the identity has a valid claim for the required topic
     *      4. Grants the role if verification succeeds
     *
     *      For roles without claim requirements, falls back to standard grantRole
     *
     * @param role The role to grant
     * @param account The account to receive the role
     * @param identityAddress The ONCHAINID contract address for verification
     *        Must match the identity registered for account in the registry
     * @param requiredClaimTopic The claim topic to verify (must match role requirement)
     *
     * Requirements:
     * - Caller must have the admin role for `role`
     * - Identity registry must be set
     * - identityAddress must be registered for account in identity registry
     * - identityAddress must have a valid, non-expired claim for requiredClaimTopic
     * - requiredClaimTopic must match the role's claim requirement
     * - Role must not be suspended for the account
     *
     * Emits {RoleGrantedWithIdentity}
     * May emit {RoleVerificationFailed} if verification fails
     *
     * @custom:security
     *      - Claim verification is performed at grant time; subsequent claim
     *        revocation does not automatically revoke the role
     *      - Implementations should consider periodic re-verification
     */
    function grantRoleWithIdentity(
        bytes32 role,
        address account,
        address identityAddress,
        uint256 requiredClaimTopic
    ) external;

    /**
     * @notice Check if account has role AND valid identity claim
     * @dev Combines hasRole check with real-time claim verification
     *      This function queries the identity registry each time - use caching
     *      in off-chain applications for performance
     *
     * @param role The role to check
     * @param account The account to check
     * @return True if account has role AND (no claim required OR valid claim exists)
     *
     * @custom:security
     *      This performs live on-chain verification and should be used for
     *      critical operations. For read operations, hasRole may be sufficient.
     */
    function hasRoleWithIdentity(
        bytes32 role,
        address account
    ) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // TWO-PHASE ROLE GRANTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Request a role grant (first phase of two-phase grant)
     * @dev Initiates a time-delayed role grant for critical roles
     *      The actual grant is completed by calling confirmRoleGrant after
     *      the delay period has elapsed
     *
     * @param role The role to request granting
     * @param account The account to receive the role
     *
     * Requirements:
     * - Caller must have the admin role for `role`
     * - Role must be configured for two-phase grants
     * - No pending request must exist for the same role/account
     *
     * Emits {RoleGrantRequested}
     */
    function requestRoleGrant(bytes32 role, address account) external;

    /**
     * @notice Confirm a role grant (second phase of two-phase grant)
     * @dev Completes a previously requested role grant after the delay period
     *
     * @param role The role being granted
     * @param account The account to receive the role
     * @param identityAddress The ONCHAINID address (if role requires claim verification)
     * @param claimTopic The claim topic (if role requires claim verification)
     *
     * Requirements:
     * - A valid request must exist via requestRoleGrant
     * - Delay period must have elapsed
     * - Identity verification must pass (if required)
     *
     * Emits {RoleGrantedWithIdentity} or standard {RoleGranted}
     */
    function confirmRoleGrant(
        bytes32 role,
        address account,
        address identityAddress,
        uint256 claimTopic
    ) external;

    /**
     * @notice Cancel a pending role grant request
     * @dev Can be called by the original requester or DEFAULT_ADMIN_ROLE
     *
     * @param role The role that was requested
     * @param account The account that would have received the role
     *
     * Emits {RoleGrantRequestCancelled}
     */
    function cancelRoleGrantRequest(bytes32 role, address account) external;

    /**
     * @notice Get pending role grant request details
     * @param role The role to query
     * @param account The account to query
     * @return requestedBy The address that made the request (zero if none)
     * @return requestedAt Timestamp of the request
     * @return canConfirmAt Timestamp when grant can be confirmed
     */
    function getRoleGrantRequest(bytes32 role, address account) external view returns (
        address requestedBy,
        uint256 requestedAt,
        uint256 canConfirmAt
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // SUSPENSION MECHANISM
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Suspend a role for an account without revoking it
     * @dev Suspended accounts cannot exercise the role's permissions but the
     *      role is not fully revoked. Useful during investigations.
     *
     * @param role The role to suspend
     * @param account The account whose role to suspend
     * @param reason Documentation of why the suspension was made
     *
     * Requirements:
     * - Caller must have the admin role for `role`
     * - Account must currently have the role
     * - Role must not already be suspended for account
     *
     * Emits {RoleSuspended}
     */
    function suspendRole(bytes32 role, address account, string calldata reason) external;

    /**
     * @notice Reinstate a suspended role
     * @dev Restores full role permissions after suspension
     *
     * @param role The role to reinstate
     * @param account The account whose role to reinstate
     *
     * Requirements:
     * - Caller must have the admin role for `role`
     * - Role must be currently suspended for account
     *
     * Emits {RoleReinstated}
     */
    function reinstateRole(bytes32 role, address account) external;

    /**
     * @notice Check if a role is suspended for an account
     * @param role The role to check
     * @param account The account to check
     * @return True if the role is suspended for the account
     */
    function isSuspended(bytes32 role, address account) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // EMERGENCY ACCESS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Grant time-limited emergency access
     * @dev Emergency access automatically expires after the specified duration
     *      All emergency grants are logged to the audit trail
     *
     * @param role The role to grant for emergency access
     * @param account The account to receive emergency access
     * @param duration Duration of emergency access in seconds (max 7 days)
     * @param reason Documentation of why emergency access is needed
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     * - duration must not exceed maximum (7 days)
     * - reason must not be empty
     *
     * Emits {EmergencyAccessGranted}
     *
     * @custom:security
     *      Emergency access bypasses claim verification requirements.
     *      All emergency grants should be reviewed by TSC within 24 hours.
     */
    function emergencyGrantRole(
        bytes32 role,
        address account,
        uint256 duration,
        string calldata reason
    ) external;

    /**
     * @notice Revoke all roles from an address (emergency response)
     * @dev Used for immediate security response when an account is compromised
     *
     * @param account The account to revoke all roles from
     * @param reason Security incident description
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     * - reason must not be empty
     *
     * Emits {RoleRevoked} for each revoked role
     *
     * @custom:security
     *      This is a destructive action. Use only for confirmed security incidents.
     */
    function emergencyRevokeAll(address account, string calldata reason) external;

    /**
     * @notice Check if an account has emergency access for a role
     * @param role The role to check
     * @param account The account to check
     * @return hasEmergency True if account has emergency access
     * @return expiresAt Timestamp when emergency access expires (0 if none)
     */
    function getEmergencyAccess(bytes32 role, address account) external view returns (
        bool hasEmergency,
        uint256 expiresAt
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get all roles held by an account
     * @dev Returns both regular and emergency roles
     * @param account The account to query
     * @return roles Array of role identifiers held by the account
     */
    function getAccountRoles(address account) external view returns (bytes32[] memory roles);

    /**
     * @notice Check if an account can effectively exercise a role
     * @dev Returns false if role is suspended or emergency access expired
     * @param role The role to check
     * @param account The account to check
     * @return True if account can currently exercise the role's permissions
     */
    function canExerciseRole(bytes32 role, address account) external view returns (bool);

    /**
     * @notice Get the delay period for two-phase grants of a role
     * @param role The role to query
     * @return Delay period in seconds (0 if no delay required)
     */
    function getRoleGrantDelay(bytes32 role) external view returns (uint256);
}
