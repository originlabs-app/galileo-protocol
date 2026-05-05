// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

/**
 * @title IdentityEvents
 * @author Galileo Protocol Contributors
 * @notice Comprehensive event library for Galileo identity registry operations
 * @dev This library defines all events emitted by the Galileo identity infrastructure.
 *      Events are organized into categories for clarity and are designed to support:
 *
 *      - **Audit Trail**: Complete history of identity operations for compliance
 *      - **Off-chain Indexing**: Event-driven architecture for subgraphs/indexers
 *      - **GDPR Compliance**: Consent tracking for cross-brand data sharing
 *      - **Monitoring**: Real-time alerts for security and operational events
 *
 *      **Event Categories:**
 *      1. Registration Events - Identity lifecycle (register, remove, update)
 *      2. Consent Events - GDPR consent management (grant, revoke, verify)
 *      3. Registry Binding Events - Consortium registry management
 *      4. Verification Events - Claim verification audit trail
 *
 *      **Usage:**
 *      Events in this library are emitted by Identity Registry and Storage contracts.
 *      Implementations should emit these events at the appropriate lifecycle points.
 *
 *      ```solidity
 *      import {IdentityEvents} from "./events/IdentityEvents.sol";
 *
 *      contract GalileoIdentityRegistry {
 *          function registerIdentity(...) external {
 *              // ... registration logic ...
 *              emit IdentityEvents.IdentityRegistered(...);
 *          }
 *      }
 *      ```
 *
 * @custom:security-contact security@galileoprotocol.io
 */
library IdentityEvents {
    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRATION EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a new identity is registered in the registry
     * @dev This event indicates a new user has been added to the identity registry.
     *      The identity contract (ONCHAINID) is now associated with the investor address.
     *
     *      **Indexed Parameters:**
     *      - investorAddress: For filtering events by user wallet
     *      - identity: For filtering by ONCHAINID contract
     *      - registrar: For filtering by who performed registration
     *
     * @param investorAddress The user's wallet address being registered
     * @param identity The ONCHAINID contract address associated with the user
     * @param country ISO 3166-1 numeric country code (e.g., 840 for USA, 250 for France)
     * @param registrar The address that performed the registration (agent/admin)
     */
    event IdentityRegistered(
        address indexed investorAddress,
        address indexed identity,
        uint16 country,
        address indexed registrar
    );

    /**
     * @notice Emitted when an identity is removed from the registry
     * @dev This event indicates a user's identity has been deleted from the registry.
     *      The ONCHAINID contract itself is NOT destroyed, only the registry mapping.
     *
     *      **Compliance Note:**
     *      This may be emitted as part of GDPR Article 17 (Right to Erasure) requests.
     *      The off-chain indexer should update accordingly.
     *
     * @param investorAddress The user's wallet address being removed
     * @param identity The ONCHAINID contract that was associated
     * @param remover The address that performed the removal
     */
    event IdentityRemoved(
        address indexed investorAddress,
        address indexed identity,
        address indexed remover
    );

    /**
     * @notice Emitted when a user's identity contract is updated
     * @dev This event indicates the ONCHAINID contract associated with a user
     *      has been changed. This may occur for:
     *      - Identity recovery after key compromise
     *      - Migration to upgraded ONCHAINID version
     *      - Identity transfer (in approved scenarios)
     *
     * @param investorAddress The user's wallet address
     * @param oldIdentity The previous ONCHAINID contract address
     * @param newIdentity The new ONCHAINID contract address
     */
    event IdentityUpdated(
        address indexed investorAddress,
        address indexed oldIdentity,
        address indexed newIdentity
    );

    /**
     * @notice Emitted when a user's country code is updated
     * @dev Country codes follow ISO 3166-1 numeric standard.
     *      Changes may affect user eligibility for certain operations
     *      based on jurisdiction-specific compliance rules.
     *
     * @param investorAddress The user's wallet address
     * @param oldCountry The previous country code
     * @param newCountry The new country code
     */
    event CountryUpdated(
        address indexed investorAddress,
        uint16 oldCountry,
        uint16 newCountry
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSENT EVENTS (GALILEO-SPECIFIC)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a user grants consent to a brand for claim access
     * @dev This event is critical for GDPR Article 6 (Lawfulness of Processing).
     *      It records explicit user consent for a specific brand to access
     *      specific claim information.
     *
     *      **Consent Scope:**
     *      - brand: Which brand registry can access the claim
     *      - claimTopic: Which specific claim type is shared
     *      - expiry: When consent expires (0 = never expires)
     *
     *      **Indexed Parameters:**
     *      All three identifiers are indexed for efficient consent queries:
     *      - "Show all consents by user X"
     *      - "Show all users who consented to brand Y"
     *      - "Show all consents for claim topic Z"
     *
     * @param userAddress The user granting consent
     * @param brand The brand's Identity Registry address receiving consent
     * @param claimTopic The claim topic consent is granted for
     * @param expiry Unix timestamp when consent expires (0 = no expiration)
     */
    event ConsentGranted(
        address indexed userAddress,
        address indexed brand,
        uint256 indexed claimTopic,
        uint256 expiry
    );

    /**
     * @notice Emitted when a user revokes consent from a brand
     * @dev This event records a user exercising their GDPR Article 7(3) right
     *      to withdraw consent at any time.
     *
     *      **Effect:**
     *      - Immediate: Brand can no longer verify claims for this user
     *      - Brand must cease processing based on revoked consent
     *      - Historical verification records remain for audit
     *
     * @param userAddress The user revoking consent
     * @param brand The brand's Identity Registry losing consent
     * @param claimTopic The claim topic for which consent is revoked
     */
    event ConsentRevoked(
        address indexed userAddress,
        address indexed brand,
        uint256 indexed claimTopic
    );

    /**
     * @notice Emitted when a consent-based verification is performed
     * @dev This event provides an audit trail of cross-brand verifications.
     *      Useful for:
     *      - Compliance audits (who accessed what, when)
     *      - User transparency (show user their consent usage)
     *      - Rate limiting detection (excessive queries)
     *
     * @param userAddress The user whose consent was verified
     * @param requestingBrand The brand that requested verification
     * @param claimTopic The claim topic that was checked
     * @param result Whether verification succeeded (true) or failed (false)
     */
    event ConsentVerified(
        address indexed userAddress,
        address indexed requestingBrand,
        uint256 indexed claimTopic,
        bool result
    );

    /**
     * @notice Emitted when consent settings are updated
     * @dev Allows modifying consent without full revoke/grant cycle.
     *      Typically used to extend or reduce expiry time.
     *
     * @param userAddress The user updating consent
     * @param brand The brand's Identity Registry
     * @param claimTopic The claim topic
     * @param oldExpiry Previous expiry timestamp
     * @param newExpiry New expiry timestamp
     */
    event ConsentUpdated(
        address indexed userAddress,
        address indexed brand,
        uint256 indexed claimTopic,
        uint256 oldExpiry,
        uint256 newExpiry
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRY BINDING EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a brand registry binds to consortium storage
     * @dev This event indicates a new brand has joined the consortium
     *      and bound their Identity Registry to the shared storage.
     *
     *      The brandDID enables off-chain resolution to brand metadata
     *      and provides an audit trail linking on-chain address to
     *      real-world brand identity.
     *
     * @param identityRegistry The brand's Identity Registry contract address
     * @param storageContract The consortium storage contract address
     * @param brandDID The brand's decentralized identifier (did:galileo:brand:*)
     */
    event RegistryBound(
        address indexed identityRegistry,
        address indexed storageContract,
        string brandDID
    );

    /**
     * @notice Emitted when a brand registry unbinds from consortium storage
     * @dev This event indicates a brand has left the consortium or
     *      their registry has been removed from shared storage.
     *
     *      **Effect:**
     *      - Brand can no longer access shared identity data
     *      - Cross-brand verifications involving this brand fail
     *      - Historical records preserved for audit
     *
     * @param identityRegistry The unbound registry's address
     * @param storageContract The consortium storage contract address
     */
    event RegistryUnbound(
        address indexed identityRegistry,
        address indexed storageContract
    );

    /**
     * @notice Emitted when a bound registry's brand DID is updated
     * @dev Allows updating the DID association without unbind/rebind.
     *      Use cases include brand mergers, rebranding, or DID rotation.
     *
     * @param identityRegistry The registry whose DID was updated
     * @param oldBrandDID The previous brand DID
     * @param newBrandDID The new brand DID
     */
    event RegistryDIDUpdated(
        address indexed identityRegistry,
        string oldBrandDID,
        string newBrandDID
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICATION EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when batch verification is performed
     * @dev Provides aggregate statistics for batch verification operations.
     *      Useful for:
     *      - Performance monitoring (topics checked per call)
     *      - Compliance analytics (pass rates)
     *      - Gas usage analysis
     *
     * @param userAddress The user whose claims were batch verified
     * @param verifier The address that initiated the verification
     * @param topicsChecked Total number of claim topics checked
     * @param topicsPassed Number of topics that passed verification
     */
    event BatchVerificationPerformed(
        address indexed userAddress,
        address indexed verifier,
        uint256 topicsChecked,
        uint256 topicsPassed
    );

    /**
     * @notice Emitted when a single claim verification is performed
     * @dev Lower-level event than BatchVerificationPerformed.
     *      Emitted for each individual claim check when needed for
     *      detailed audit trail.
     *
     * @param userAddress The user whose claim was verified
     * @param claimTopic The claim topic that was checked
     * @param result Whether the claim was valid (true) or not (false)
     * @param verifier The address that performed verification
     */
    event ClaimVerificationPerformed(
        address indexed userAddress,
        uint256 indexed claimTopic,
        bool result,
        address indexed verifier
    );

    /**
     * @notice Emitted when a verification fails due to expired claim
     * @dev Specific failure reason event for debugging and monitoring.
     *      Helps identify claims that need renewal.
     *
     * @param userAddress The user whose claim expired
     * @param claimTopic The expired claim topic
     * @param expiredAt The timestamp when the claim expired
     */
    event VerificationFailedExpired(
        address indexed userAddress,
        uint256 indexed claimTopic,
        uint256 expiredAt
    );

    /**
     * @notice Emitted when a verification fails due to revoked claim
     * @dev Indicates the claim was revoked by its issuer.
     *      May indicate security concern or status change.
     *
     * @param userAddress The user whose claim was revoked
     * @param claimTopic The revoked claim topic
     * @param issuer The issuer that revoked the claim
     */
    event VerificationFailedRevoked(
        address indexed userAddress,
        uint256 indexed claimTopic,
        address indexed issuer
    );
}
