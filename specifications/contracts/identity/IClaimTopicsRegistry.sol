// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@erc3643org/erc-3643/contracts/registry/interface/IClaimTopicsRegistry.sol";

/**
 * @title IGalileoClaimTopicsRegistry
 * @author Galileo Luxury Standard
 * @notice Extended ERC-3643 Claim Topics Registry for the luxury goods ecosystem
 * @dev Extends the standard IClaimTopicsRegistry with:
 *      - Topic metadata including namespace, description, and default expiry
 *      - Compliance vs heritage topic classification
 *      - Topic deprecation with reason tracking
 *      - Namespace-based topic ID computation (keccak256)
 *
 * This interface supports the dual nature of claims in the luxury ecosystem:
 * - Compliance claims (KYC, KYB) that expire and require renewal
 * - Heritage claims (origin, authenticity) that remain valid until revoked
 *
 * Reference: ERC-3643 (T-REX) Security Token Standard
 * Specification: GSPEC-IDENTITY-004
 */
interface IGalileoClaimTopicsRegistry is IClaimTopicsRegistry {
    // ============ Structs ============

    /**
     * @notice Metadata for a registered claim topic
     * @dev Provides additional context beyond the numeric topic ID
     *
     * @param namespace Human-readable namespace (e.g., "galileo.kyc.basic")
     * @param description Brief description of what this claim topic represents
     * @param defaultExpiry Default validity period in seconds (0 = permanent)
     * @param isCompliance True if this is a compliance topic (requires renewal)
     */
    struct TopicMetadata {
        string namespace;
        string description;
        uint64 defaultExpiry;
        bool isCompliance;
    }

    // ============ Events ============

    /**
     * @notice Emitted when a new claim topic is registered with metadata
     * @param claimTopic The numeric topic ID (keccak256 of namespace)
     * @param namespace The human-readable namespace
     * @param metadata The full topic metadata
     */
    event ClaimTopicRegistered(
        uint256 indexed claimTopic,
        string namespace,
        TopicMetadata metadata
    );

    /**
     * @notice Emitted when topic metadata is updated
     * @param claimTopic The numeric topic ID
     * @param metadata The updated metadata
     */
    event TopicMetadataUpdated(
        uint256 indexed claimTopic,
        TopicMetadata metadata
    );

    /**
     * @notice Emitted when a claim topic is deprecated
     * @dev Deprecated topics remain resolvable but should not be used for new claims
     * @param claimTopic The numeric topic ID being deprecated
     * @param reason Human-readable deprecation reason
     */
    event ClaimTopicDeprecated(
        uint256 indexed claimTopic,
        string reason
    );

    // ============ Functions ============

    /**
     * @notice Adds a claim topic with full metadata
     * @dev This is the preferred method for adding topics in the Galileo ecosystem.
     *      The topic ID is derived from keccak256 of the namespace string.
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Namespace must not be empty
     * - Topic must not already be registered
     *
     * @param _claimTopic The numeric topic ID (should be keccak256 of namespace)
     * @param _metadata The topic metadata including namespace and description
     */
    function addClaimTopicWithMetadata(
        uint256 _claimTopic,
        TopicMetadata calldata _metadata
    ) external;

    /**
     * @notice Gets the metadata for a registered claim topic
     * @dev Returns the full TopicMetadata struct
     *
     * @param _claimTopic The numeric topic ID
     * @return The TopicMetadata for the specified topic
     */
    function getTopicMetadata(uint256 _claimTopic) external view returns (TopicMetadata memory);

    /**
     * @notice Computes the topic ID from a namespace string
     * @dev Pure function that returns keccak256 hash of the namespace.
     *      Useful for deriving topic IDs from human-readable namespaces.
     *
     * Example:
     *   getTopicIdByNamespace("galileo.kyc.basic")
     *   returns: 0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0
     *
     * @param _namespace The namespace string (e.g., "galileo.kyc.basic")
     * @return The uint256 topic ID (keccak256 of namespace)
     */
    function getTopicIdByNamespace(string calldata _namespace) external pure returns (uint256);

    /**
     * @notice Checks if a topic is a compliance topic (requires renewal)
     * @dev Compliance topics have expiration requirements
     *
     * @param _claimTopic The numeric topic ID
     * @return True if this is a compliance topic, false otherwise
     */
    function isComplianceTopic(uint256 _claimTopic) external view returns (bool);

    /**
     * @notice Gets all topics filtered by compliance status
     * @dev Returns topic IDs for either compliance or heritage topics
     *
     * @param _isCompliance True to get compliance topics, false for heritage topics
     * @return Array of topic IDs matching the filter
     */
    function getTopicsByType(bool _isCompliance) external view returns (uint256[] memory);

    /**
     * @notice Deprecates a claim topic
     * @dev Deprecated topics remain in the registry but should not be used
     *      for new claims. Existing claims remain valid per their original terms.
     *
     * Use cases:
     * - Superseded by new topic
     * - Regulatory change
     * - Standard evolution
     *
     * Requirements:
     * - Caller must have registry admin role
     * - Topic must be registered
     * - Topic must not already be deprecated
     *
     * @param _claimTopic The numeric topic ID to deprecate
     * @param _reason Human-readable reason for deprecation
     */
    function deprecateTopic(
        uint256 _claimTopic,
        string calldata _reason
    ) external;

    /**
     * @notice Checks if a topic has been deprecated
     * @dev Returns true if the topic has been marked as deprecated
     *
     * @param _claimTopic The numeric topic ID
     * @return True if the topic is deprecated, false otherwise
     */
    function isTopicDeprecated(uint256 _claimTopic) external view returns (bool);

    /**
     * @notice Gets all topics whose namespaces start with a given prefix
     * @dev Useful for filtering topics by category (e.g., "galileo.kyc.")
     *
     * Note: This function may be gas-intensive for large registries.
     *       Consider off-chain indexing for production use.
     *
     * @param _prefix The namespace prefix to match (e.g., "galileo.kyc.")
     * @return Array of topic IDs matching the prefix
     */
    function getTopicsByPrefix(string calldata _prefix) external view returns (uint256[] memory);
}

/**
 * @title GalileoClaimTopics
 * @author Galileo Luxury Standard
 * @notice Library of predefined claim topic constants for the Galileo ecosystem
 * @dev Contains 12 initial claim topics organized by category:
 *      - Compliance: KYC/KYB verification topics with annual renewal
 *      - Jurisdiction-Specific: Region-specific KYC requirements
 *      - Luxury-Specific: Brand and authenticator authorization topics
 *      - Heritage: Origin and authenticity verification (permanent)
 *
 * Topic IDs are computed as keccak256 of their namespace strings.
 * Use toTopicId() to compute topic IDs from custom namespaces.
 *
 * Specification: GSPEC-IDENTITY-004
 */
library GalileoClaimTopics {
    // ============ Constants ============

    /// @notice Default expiry for compliance topics (365 days in seconds)
    uint64 public constant COMPLIANCE_DEFAULT_EXPIRY = 365 days;

    /// @notice Permanent expiry value (no expiration)
    uint64 public constant PERMANENT_EXPIRY = 0;

    // ============ Compliance Topics (365 days default) ============

    /**
     * @notice Basic KYC verification claim
     * @dev Namespace: "galileo.kyc.basic"
     *      Required for individual consumers
     *      Minimum verification: ID document + liveness check
     */
    uint256 public constant KYC_BASIC =
        0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0;

    /**
     * @notice Enhanced KYC verification claim
     * @dev Namespace: "galileo.kyc.enhanced"
     *      Required for high-value transactions
     *      Enhanced verification: proof of address + source of funds
     */
    uint256 public constant KYC_ENHANCED =
        0xa1fecd52420478a3ef25e8f4e37d4f2dfdaec920e48457f40fc2e2839462216e;

    /**
     * @notice Know Your Business verification claim
     * @dev Namespace: "galileo.kyb.verified"
     *      Required for business entities
     *      Verification: company registration + beneficial ownership
     */
    uint256 public constant KYB_VERIFIED =
        0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56;

    // ============ Jurisdiction-Specific Topics (365 days default) ============

    /**
     * @notice EU MiFID II compliant KYC
     * @dev Namespace: "galileo.kyc.eu.mifid"
     *      Required for EU operations under MiFID II
     *      Reference: Directive 2014/65/EU
     */
    uint256 public constant KYC_EU_MIFID =
        0xdef3dcc6fc6fe64114e865ad812264af037f0d3a36cb446920d32ace7ee3bdbc;

    /**
     * @notice US SEC compliant KYC
     * @dev Namespace: "galileo.kyc.us.sec"
     *      Required for US operations
     *      Reference: Securities Act 1933, Exchange Act 1934, AML/BSA
     */
    uint256 public constant KYC_US_SEC =
        0x2a04959391be0b39934421c3fc7eb5559602ff59b49d93ae63a7741f0c5ce5ac;

    /**
     * @notice APAC Singapore MAS compliant KYC
     * @dev Namespace: "galileo.kyc.apac.sg"
     *      Required for Singapore operations
     *      Reference: MAS Notice SFA04-N02, Payment Services Act 2019
     */
    uint256 public constant KYC_APAC_SG =
        0x15a365872e74a520ca7755fae1160f13ab5209d51e117a5555c669c9cc7648e4;

    // ============ Luxury-Specific Topics (365 days default) ============

    /**
     * @notice Authorized retailer certification
     * @dev Namespace: "galileoprotocol.io.authorized_retailer"
     *      Issued by brands to authorized retail partners
     *      Required fields: brand authorization, territory, categories
     */
    uint256 public constant AUTHORIZED_RETAILER =
        0xfc1ed2540d1f8160d9b67d6e66b3e918d6029031f419be09f5e5865c2a74c75a;

    /**
     * @notice Authorized service center certification
     * @dev Namespace: "galileoprotocol.io.service_center"
     *      Issued by brands to authorized repair centers
     *      Required fields: brand authorization, service types, technician certs
     */
    uint256 public constant SERVICE_CENTER =
        0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2;

    /**
     * @notice Third-party authenticator certification
     * @dev Namespace: "galileoprotocol.io.authenticator"
     *      Issued to authentication laboratories and services
     *      Required fields: accreditation, methodology, categories
     */
    uint256 public constant AUTHENTICATOR =
        0xda684ab89dbe929e1da9afb6a82d42762bb88db87f85e2041b5a2867ec6a6767;

    /**
     * @notice Authorized auction house certification
     * @dev Namespace: "galileoprotocol.io.auction_house"
     *      Issued to auction houses authorized for luxury goods
     *      Required fields: license, insurance, jurisdictions
     */
    uint256 public constant AUCTION_HOUSE =
        0x4c471013436dbf8b498b1c5c007748f97d055151ff587e3c94de8738376aaf7d;

    // ============ Heritage Topics (Permanent until revoked) ============

    /**
     * @notice Origin certification claim
     * @dev Namespace: "galileo.heritage.origin_certified"
     *      Permanent certification of product origin
     *      Includes: manufacturing location, materials source, chain of custody
     */
    uint256 public constant ORIGIN_CERTIFIED =
        0x1e1c32d6fc1988653c0708c2e488cfef18382e584dbad1834629ffaba627b427;

    /**
     * @notice Authenticity verification claim
     * @dev Namespace: "galileo.heritage.authenticity_verified"
     *      Permanent record of authenticity verification
     *      Includes: verification method, verifier identity, evidence hash
     */
    uint256 public constant AUTHENTICITY_VERIFIED =
        0x4fc95faf30f177afc2bdb8d67630d7d32f38116d3ed16938544efcee5cc52ed2;

    // ============ Helper Functions ============

    /**
     * @notice Computes a topic ID from a namespace string
     * @dev Uses keccak256 to derive topic ID from namespace
     *
     * Example:
     *   toTopicId("galileo.kyc.basic")
     *   returns: 0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0
     *
     * @param namespace The namespace string (e.g., "galileo.custom.topic")
     * @return The uint256 topic ID
     */
    function toTopicId(string memory namespace) internal pure returns (uint256) {
        return uint256(keccak256(bytes(namespace)));
    }

    /**
     * @notice Checks if a topic ID is a known compliance topic
     * @dev Returns true for predefined compliance topics (have default 365-day expiry)
     *
     * @param topicId The topic ID to check
     * @return True if this is a known compliance topic
     */
    function isKnownComplianceTopic(uint256 topicId) internal pure returns (bool) {
        return topicId == KYC_BASIC ||
               topicId == KYC_ENHANCED ||
               topicId == KYB_VERIFIED ||
               topicId == KYC_EU_MIFID ||
               topicId == KYC_US_SEC ||
               topicId == KYC_APAC_SG ||
               topicId == AUTHORIZED_RETAILER ||
               topicId == SERVICE_CENTER ||
               topicId == AUTHENTICATOR ||
               topicId == AUCTION_HOUSE;
    }

    /**
     * @notice Checks if a topic ID is a known heritage topic
     * @dev Returns true for predefined heritage topics (permanent validity)
     *
     * @param topicId The topic ID to check
     * @return True if this is a known heritage topic
     */
    function isKnownHeritageTopic(uint256 topicId) internal pure returns (bool) {
        return topicId == ORIGIN_CERTIFIED ||
               topicId == AUTHENTICITY_VERIFIED;
    }

    /**
     * @notice Gets the default expiry for a known topic
     * @dev Returns 365 days for compliance topics, 0 (permanent) for heritage topics
     *
     * @param topicId The topic ID
     * @return Default expiry in seconds (0 = permanent, otherwise seconds)
     */
    function getDefaultExpiry(uint256 topicId) internal pure returns (uint64) {
        if (isKnownHeritageTopic(topicId)) {
            return PERMANENT_EXPIRY;
        }
        if (isKnownComplianceTopic(topicId)) {
            return COMPLIANCE_DEFAULT_EXPIRY;
        }
        // Unknown topics default to compliance behavior
        return COMPLIANCE_DEFAULT_EXPIRY;
    }
}
