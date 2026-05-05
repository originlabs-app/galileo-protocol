// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import "@erc3643org/erc-3643/contracts/registry/interface/ITrustedIssuersRegistry.sol";
import "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";

/**
 * @title IGalileoTrustedIssuersRegistry
 * @author Galileo Luxury Standard
 * @notice Extended ERC-3643 Trusted Issuers Registry for the luxury goods ecosystem
 * @dev Extends the standard ITrustedIssuersRegistry with:
 *      - Issuer categorization (KYC providers, brand issuers, authentication labs, regulatory bodies)
 *      - Certification tracking with validity periods
 *      - Granular topic-level revocation
 *      - Issuer suspension mechanism
 *
 * This interface is designed to support the complex trust relationships in the luxury
 * goods industry where different types of claim issuers have different authority levels
 * and certification requirements.
 *
 * Reference: ERC-3643 (T-REX) Security Token Standard
 * Specification: GSPEC-IDENTITY-003
 */
interface IGalileoTrustedIssuersRegistry is ITrustedIssuersRegistry {
    // ============ Enums ============

    /**
     * @notice Categories of trusted issuers in the Galileo ecosystem
     * @dev Each category has different authority levels and certification requirements
     *
     * - KYC_PROVIDER: Licensed identity verification services (e.g., Onfido, Jumio)
     * - BRAND_ISSUER: Luxury brands authorized to issue authenticity claims
     * - AUTH_LAB: Independent authentication laboratories (e.g., Entrupy, SGS)
     * - REGULATORY_BODY: Government or industry regulatory authorities
     */
    enum IssuerCategory {
        KYC_PROVIDER,
        BRAND_ISSUER,
        AUTH_LAB,
        REGULATORY_BODY
    }

    // ============ Structs ============

    /**
     * @notice Certification details for a trusted issuer
     * @dev Tracks the issuer's credentials and certification validity
     *
     * @param standard The certification standard (e.g., "ISO27001", "SOC2", "EU-AMLD6")
     * @param reference Unique identifier for the certification (certificate number)
     * @param validUntil Timestamp until which the certification is valid (0 = permanent)
     * @param verificationURI URI to verify the certification (e.g., accreditation body URL)
     */
    struct Certification {
        string standard;
        string certReference;
        uint256 validUntil;
        string verificationURI;
    }

    // ============ Events ============

    /**
     * @notice Emitted when a trusted issuer is added with category and certification
     * @param issuer The address of the trusted issuer (IClaimIssuer contract)
     * @param claimTopics Array of claim topics this issuer is trusted for
     * @param category The category classification of this issuer
     * @param certification The issuer's certification details
     */
    event TrustedIssuerAdded(
        IClaimIssuer indexed issuer,
        uint256[] claimTopics,
        IssuerCategory category,
        Certification certification
    );

    /**
     * @notice Emitted when an issuer's category is updated
     * @param issuer The address of the trusted issuer
     * @param previousCategory The issuer's previous category
     * @param newCategory The issuer's new category
     */
    event IssuerCategoryUpdated(
        address indexed issuer,
        IssuerCategory previousCategory,
        IssuerCategory newCategory
    );

    /**
     * @notice Emitted when an issuer's certification is updated
     * @param issuer The address of the trusted issuer
     * @param certification The new certification details
     */
    event IssuerCertificationUpdated(
        address indexed issuer,
        Certification certification
    );

    /**
     * @notice Emitted when an issuer is revoked for a specific claim topic
     * @dev Allows granular revocation without removing the issuer entirely
     * @param issuer The address of the trusted issuer
     * @param claimTopic The specific claim topic being revoked
     * @param reason Human-readable reason for revocation
     */
    event IssuerTopicRevoked(
        address indexed issuer,
        uint256 indexed claimTopic,
        string reason
    );

    /**
     * @notice Emitted when an issuer is temporarily suspended
     * @param issuer The address of the suspended issuer
     * @param reason Human-readable reason for suspension
     * @param until Timestamp when suspension expires (0 = indefinite)
     */
    event IssuerSuspended(
        address indexed issuer,
        string reason,
        uint256 until
    );

    /**
     * @notice Emitted when a suspended issuer is reactivated
     * @param issuer The address of the reactivated issuer
     */
    event IssuerReactivated(address indexed issuer);

    // ============ Functions ============

    /**
     * @notice Adds a trusted issuer with category and certification details
     * @dev This is the preferred method for adding issuers in the Galileo ecosystem.
     *      The issuer must be a valid IClaimIssuer contract address.
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Issuer must not already be registered
     * - At least one claim topic must be specified
     * - Certification validUntil must be in the future or 0 (permanent)
     *
     * @param _issuer The IClaimIssuer contract to add as trusted
     * @param _claimTopics Array of claim topics this issuer is trusted for
     * @param _category The category classification of this issuer
     * @param _certification The issuer's certification details
     */
    function addTrustedIssuerWithCategory(
        IClaimIssuer _issuer,
        uint256[] calldata _claimTopics,
        IssuerCategory _category,
        Certification calldata _certification
    ) external;

    /**
     * @notice Gets the category of a registered issuer
     * @dev Returns the category enum value for the specified issuer
     *
     * @param _issuer The address of the trusted issuer
     * @return The IssuerCategory of the issuer
     */
    function getIssuerCategory(address _issuer) external view returns (IssuerCategory);

    /**
     * @notice Gets the certification details of a registered issuer
     * @dev Returns the full Certification struct for the specified issuer
     *
     * @param _issuer The address of the trusted issuer
     * @return The Certification details of the issuer
     */
    function getIssuerCertification(address _issuer) external view returns (Certification memory);

    /**
     * @notice Updates the certification details of an existing issuer
     * @dev Allows updating certification without re-registering the issuer
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Issuer must be registered
     * - New validUntil must be in the future or 0 (permanent)
     *
     * @param _issuer The address of the trusted issuer
     * @param _certification The new certification details
     */
    function updateIssuerCertification(
        address _issuer,
        Certification calldata _certification
    ) external;

    /**
     * @notice Gets all issuers in a specific category
     * @dev Returns an array of issuer addresses filtered by category
     *
     * @param _category The category to filter by
     * @return Array of issuer addresses in the specified category
     */
    function getIssuersByCategory(IssuerCategory _category) external view returns (address[] memory);

    /**
     * @notice Revokes an issuer's trust for a specific claim topic
     * @dev Provides granular revocation without removing the issuer entirely.
     *      Useful when an issuer loses authority for specific claim types.
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Issuer must be registered for the specified topic
     *
     * @param _issuer The address of the trusted issuer
     * @param _claimTopic The specific claim topic to revoke
     * @param _reason Human-readable reason for the revocation
     */
    function revokeIssuerForTopic(
        address _issuer,
        uint256 _claimTopic,
        string calldata _reason
    ) external;

    /**
     * @notice Temporarily suspends a trusted issuer
     * @dev Suspended issuers cannot have their claims verified as valid.
     *      Suspension can be time-limited or indefinite.
     *
     * Use cases:
     * - Investigation of potential breach
     * - Certification lapse pending renewal
     * - Regulatory requirement
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Issuer must be registered
     * - Issuer must not already be suspended
     *
     * @param _issuer The address of the trusted issuer to suspend
     * @param _reason Human-readable reason for suspension
     * @param _until Timestamp when suspension expires (0 = indefinite)
     */
    function suspendIssuer(
        address _issuer,
        string calldata _reason,
        uint256 _until
    ) external;

    /**
     * @notice Reactivates a suspended issuer
     * @dev Restores the issuer's trusted status for all their registered topics.
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Issuer must be currently suspended
     *
     * @param _issuer The address of the issuer to reactivate
     */
    function reactivateIssuer(address _issuer) external;

    /**
     * @notice Checks if an issuer is currently suspended
     * @dev Returns true if issuer is suspended (manually or time-limited not yet expired)
     *
     * @param _issuer The address to check
     * @return True if the issuer is currently suspended, false otherwise
     */
    function isIssuerSuspended(address _issuer) external view returns (bool);

    /**
     * @notice Checks if an issuer's certification is currently valid
     * @dev Returns false if certification has expired (validUntil < block.timestamp)
     *      or if issuer is not registered. Returns true for permanent certifications.
     *
     * @param _issuer The address to check
     * @return True if the issuer has valid certification, false otherwise
     */
    function isCertificationValid(address _issuer) external view returns (bool);
}
