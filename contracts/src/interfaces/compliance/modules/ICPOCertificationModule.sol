// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import {IComplianceModule} from "../IComplianceModule.sol";

/**
 * @title ICPOCertificationModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module that enforces Certified Pre-Owned (CPO) certification for resale
 * @dev This module ensures that luxury goods are authenticated before secondary market sales,
 *      protecting buyers from counterfeit goods and maintaining brand integrity.
 *
 *      CPO Certification Flow:
 *      1. Owner submits item for authentication
 *      2. Trusted certifier verifies authenticity and condition
 *      3. AUTHENTICITY_VERIFIED claim is issued to the token
 *      4. Secondary sale can now proceed
 *
 *      Operating Modes:
 *      - NOT_REQUIRED: CPO certification not enforced (primary market only)
 *      - REQUIRED_FOR_RESALE: CPO required only for secondary sales
 *      - ALWAYS_REQUIRED: CPO required for all transfers (strictest)
 *
 *      Integration with Identity:
 *      - Queries IGalileoIdentityRegistry for AUTHENTICITY_VERIFIED claims
 *      - Uses GalileoClaimTopics.AUTHENTICITY_VERIFIED (0x4fc95faf...)
 *      - Validates certifier is in trusted certifiers list
 *
 *      Primary vs Secondary Detection:
 *      - Primary sale: First transfer from brand/retailer to consumer
 *      - Secondary sale: Consumer-to-consumer or via marketplace
 *      - Detection based on transfer history or seller identity claims
 *
 *      Trusted Certifiers:
 *      - Brand-operated authentication centers
 *      - Third-party authentication services (Entrupy, Real Authentication)
 *      - Authorized auction houses with authentication capabilities
 *      - Each certifier must hold AUTHENTICATOR claim from trusted issuer
 *
 * Reference: GalileoClaimTopics.AUTHENTICITY_VERIFIED
 * Specification: GSPEC-COMPLIANCE-004
 * @custom:security-contact security@galileoprotocol.io
 */
interface ICPOCertificationModule is IComplianceModule {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice CPO requirement modes
     * @dev Controls when CPO certification is required for transfers
     */
    enum CPOMode {
        /// @notice CPO certification not required for any transfers
        NOT_REQUIRED,

        /// @notice CPO required only for secondary market sales
        REQUIRED_FOR_RESALE,

        /// @notice CPO required for all transfers (most restrictive)
        ALWAYS_REQUIRED
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when CPO certification is required but not present
     * @param token The token address lacking CPO certification
     * @param from The seller address
     * @param to The buyer address
     */
    error CPOCertificationRequired(address token, address from, address to);

    /**
     * @notice Thrown when CPO certification has expired
     * @param token The token address
     * @param expiredAt The timestamp when certification expired
     */
    error CPOCertificationExpired(address token, uint256 expiredAt);

    /**
     * @notice Thrown when certifier is not in the trusted list
     * @param certifier The certifier address that is not trusted
     */
    error CertifierNotTrusted(address certifier);

    /**
     * @notice Thrown when attempting to add an already trusted certifier
     * @param certifier The certifier address
     */
    error CertifierAlreadyTrusted(address certifier);

    /**
     * @notice Thrown when attempting to remove a certifier that is not trusted
     * @param certifier The certifier address
     */
    error CertifierNotInTrustList(address certifier);

    /**
     * @notice Thrown when CPO mode value is invalid
     * @param mode The invalid mode value
     */
    error InvalidCPOMode(uint8 mode);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when CPO mode is updated
     * @param oldMode The previous CPO mode
     * @param newMode The new CPO mode
     * @param updatedBy The address that made the update
     */
    event CPOModeUpdated(
        CPOMode indexed oldMode,
        CPOMode indexed newMode,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when a trusted certifier is added
     * @param certifier The certifier address added
     * @param certifierName Human-readable certifier name
     * @param addedBy The address that added the certifier
     */
    event TrustedCertifierAdded(
        address indexed certifier,
        string certifierName,
        address indexed addedBy
    );

    /**
     * @notice Emitted when a trusted certifier is removed
     * @param certifier The certifier address removed
     * @param removedBy The address that removed the certifier
     */
    event TrustedCertifierRemoved(
        address indexed certifier,
        address indexed removedBy
    );

    /**
     * @notice Emitted when CPO check fails for a transfer
     * @param token The token that failed CPO check
     * @param from The seller address
     * @param to The buyer address
     * @param reason The failure reason
     */
    event CPOCheckFailed(
        address indexed token,
        address indexed from,
        address indexed to,
        string reason
    );

    /**
     * @notice Emitted when CPO certification is verified for a transfer
     * @param token The token that passed CPO check
     * @param certifier The certifier that issued the certification
     * @param certifiedAt The timestamp of certification
     */
    event CPOCertificationVerified(
        address indexed token,
        address indexed certifier,
        uint256 certifiedAt
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the current CPO mode
     * @return The current CPOMode enum value
     */
    function cpoMode() external view returns (CPOMode);

    /**
     * @notice Set the CPO requirement mode
     * @dev Changes when CPO certification is required for transfers.
     *
     *      Access Control: Restricted to module admin/owner
     *
     * @param _mode The new CPO mode to set
     */
    function setCPOMode(CPOMode _mode) external;

    // ═══════════════════════════════════════════════════════════════════════════
    // CPO CHECKING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if CPO certification is required for a specific transfer
     * @dev Determines based on current mode and transfer context whether
     *      CPO certification must be verified.
     *
     *      Logic:
     *      - NOT_REQUIRED: Always returns false
     *      - REQUIRED_FOR_RESALE: Returns true only if this is a secondary sale
     *      - ALWAYS_REQUIRED: Always returns true
     *
     *      Secondary sale detection considers:
     *      - Token transfer count (first transfer = primary)
     *      - Seller identity (retailer = primary, consumer = secondary)
     *      - Explicit primary sale flag on token
     *
     * @param from The sender address
     * @param to The recipient address
     * @return True if CPO certification is required for this transfer
     */
    function isCPORequired(address from, address to) external view returns (bool);

    /**
     * @notice Check if a token has valid CPO certification
     * @dev Queries for AUTHENTICITY_VERIFIED claim on the token and verifies:
     *      1. Claim exists and is not expired
     *      2. Claim was issued by a trusted certifier
     *      3. Claim is not revoked
     *
     *      Note: This checks the token address, not holder address. The claim
     *      should be associated with the token's identity (product DID).
     *
     * @param token The token contract address to check
     * @return True if token has valid, unexpired CPO certification
     */
    function hasCPOCertification(address token) external view returns (bool);

    /**
     * @notice Get detailed CPO certification status
     * @dev Provides full certification details for display and verification
     *
     * @param token The token contract address
     * @return certified Whether the token is currently certified
     * @return certifier The address of the certifier (zero if not certified)
     * @return certifiedAt The timestamp when certification was issued
     * @return expiresAt The timestamp when certification expires (0 = no expiry)
     * @return certificationLevel The certification level (e.g., "brand_certified", "third_party")
     */
    function getCPOCertificationDetails(address token) external view returns (
        bool certified,
        address certifier,
        uint256 certifiedAt,
        uint256 expiresAt,
        string memory certificationLevel
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // TRUSTED CERTIFIERS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Add a certifier to the trusted list
     * @dev Trusted certifiers can issue AUTHENTICITY_VERIFIED claims that
     *      this module will accept as valid CPO certification.
     *
     *      Certifiers should also hold AUTHENTICATOR claim from a trusted issuer
     *      to participate in the Galileo ecosystem.
     *
     *      Access Control: Restricted to module admin/owner
     *
     * @param _certifier The certifier address to add
     */
    function addTrustedCertifier(address _certifier) external;

    /**
     * @notice Remove a certifier from the trusted list
     * @dev Removes trust in a certifier. Existing certifications remain valid
     *      until their expiration, but new certifications won't be accepted.
     *
     *      Access Control: Restricted to module admin/owner
     *
     * @param _certifier The certifier address to remove
     */
    function removeTrustedCertifier(address _certifier) external;

    /**
     * @notice Check if an address is a trusted certifier
     * @param _certifier The address to check
     * @return True if the address is in the trusted certifiers list
     */
    function isTrustedCertifier(address _certifier) external view returns (bool);

    /**
     * @notice Get all trusted certifiers
     * @return Array of trusted certifier addresses
     */
    function getTrustedCertifiers() external view returns (address[] memory);

    /**
     * @notice Get the number of trusted certifiers
     * @return Count of trusted certifiers
     */
    function trustedCertifierCount() external view returns (uint256);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION GETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the claim topic used for authenticity verification
     * @dev Defaults to GalileoClaimTopics.AUTHENTICITY_VERIFIED
     * @return The claim topic ID (uint256)
     */
    function authenticityClaimTopic() external view returns (uint256);

    /**
     * @notice Get the identity registry used for claim verification
     * @return Address of the IGalileoIdentityRegistry
     */
    function identityRegistry() external view returns (address);

    /**
     * @notice Get the minimum certification validity period
     * @dev Certifications expiring within this period may trigger warnings
     * @return Minimum validity period in seconds
     */
    function minValidityPeriod() external view returns (uint256);

    /**
     * @notice Set the minimum certification validity period
     * @dev Access Control: Restricted to module admin/owner
     * @param _period New minimum validity period in seconds
     */
    function setMinValidityPeriod(uint256 _period) external;
}
