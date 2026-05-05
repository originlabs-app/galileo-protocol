// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import {IIdentityRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";

/**
 * @title IGalileoIdentityRegistry
 * @author Galileo Protocol Contributors
 * @notice Extended ERC-3643 Identity Registry interface with Galileo consortium features
 * @dev This interface extends the standard IIdentityRegistry from ERC-3643 (T-REX v4.1.3)
 *      with additional capabilities required for the Galileo luxury goods ecosystem:
 *
 *      1. **Cross-Brand Consent Verification**: GDPR Article 6 compliant verification that
 *         checks both claim validity AND explicit user consent before sharing identity
 *         information across brand boundaries.
 *
 *      2. **Batch Verification**: Gas-efficient multi-topic verification in a single call,
 *         essential for complex eligibility checks (e.g., "is VIP AND has warranty AND
 *         is verified collector").
 *
 *      3. **Consortium Membership**: Enables federated identity across the Galileo
 *         consortium while respecting brand-specific verification rules.
 *
 *      The standard ERC-3643 IIdentityRegistry functions are inherited:
 *      - registerIdentity(address, IIdentity, uint16) - Register user identity
 *      - deleteIdentity(address) - Remove user identity
 *      - updateIdentity(address, IIdentity) - Update identity contract
 *      - updateCountry(address, uint16) - Update country code
 *      - contains(address) returns (bool) - Check if user is registered
 *      - isVerified(address) returns (bool) - Check if user is verified
 *      - identity(address) returns (IIdentity) - Get user's identity contract
 *      - investorCountry(address) returns (uint16) - Get user's country code
 *
 * @custom:security-contact security@galileoprotocol.io
 */
interface IGalileoIdentityRegistry is IIdentityRegistry {
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when a user address is not registered in the registry
     * @param userAddress The address that was not found
     */
    error UserNotRegistered(address userAddress);

    /**
     * @notice Thrown when consent verification fails
     * @param userAddress The user whose consent was checked
     * @param requestingBrand The brand that requested verification
     * @param claimTopic The claim topic for which consent was denied
     */
    error ConsentNotGranted(address userAddress, address requestingBrand, uint256 claimTopic);

    /**
     * @notice Thrown when the registry is not a consortium member
     */
    error NotConsortiumMember();

    /**
     * @notice Thrown when batch verification receives an empty topics array
     */
    error EmptyClaimTopicsArray();

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a consent-based verification is performed
     * @param userAddress The user whose identity was verified
     * @param requestingBrand The brand's registry that requested verification
     * @param claimTopic The claim topic that was verified
     * @param result Whether verification succeeded (true) or failed (false)
     */
    event ConsentVerificationPerformed(
        address indexed userAddress,
        address indexed requestingBrand,
        uint256 indexed claimTopic,
        bool result
    );

    /**
     * @notice Emitted when batch verification is performed
     * @param userAddress The user whose claims were verified
     * @param verifier The address that initiated verification
     * @param topicsChecked Total number of topics checked
     * @param topicsPassed Number of topics that passed verification
     */
    event BatchVerificationPerformed(
        address indexed userAddress,
        address indexed verifier,
        uint256 topicsChecked,
        uint256 topicsPassed
    );

    /**
     * @notice Emitted when consortium membership status changes
     * @param registry The registry whose status changed
     * @param isMember New membership status
     * @param tir Trusted Issuers Registry address (zero if not member)
     * @param ctr Claim Topics Registry address (zero if not member)
     */
    event ConsortiumMembershipChanged(
        address indexed registry,
        bool isMember,
        address tir,
        address ctr
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // GALILEO EXTENSION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Verify user identity with cross-brand consent check
     * @dev This function performs a two-step verification:
     *      1. Checks if the user has a valid claim for the specified topic
     *      2. Verifies that the user has granted explicit consent to the requesting brand
     *
     *      This is essential for GDPR Article 6 compliance when sharing identity
     *      information across brand boundaries in the consortium. The consent check
     *      queries the user's ONCHAINID contract for consent status.
     *
     *      Example use case: Brand A wants to verify if a user is a "VIP Collector"
     *      (claim issued by Brand B). The user must have both the claim AND have
     *      granted consent to Brand A to access this information.
     *
     * @param _userAddress The wallet address of the user to verify
     * @param _claimTopic The claim topic to verify, encoded as uint256
     *        (typically keccak256 hash of galileo namespace string)
     * @param _requestingBrand The address of the brand's Identity Registry
     *        that is requesting verification
     * @return True if user has valid claim AND consent is granted to requesting brand
     *
     * @custom:example
     *      // Verify VIP status with consent for Brand A
     *      uint256 vipTopic = uint256(keccak256("galileo.claim.vip.collector"));
     *      bool verified = registry.isVerifiedWithConsent(user, vipTopic, brandARegistry);
     */
    function isVerifiedWithConsent(
        address _userAddress,
        uint256 _claimTopic,
        address _requestingBrand
    ) external view returns (bool);

    /**
     * @notice Batch verification for multiple claim topics
     * @dev Efficiently checks multiple claim topics in a single call, returning
     *      an array of results. This is gas-efficient compared to multiple
     *      individual calls and enables complex eligibility checks.
     *
     *      Use cases:
     *      - Transfer eligibility: "is KYC verified AND is accredited investor"
     *      - Warranty claims: "has purchase proof AND has warranty registration"
     *      - VIP access: "is VIP AND has regional membership AND has valid subscription"
     *
     *      The returned array is parallel to the input array - results[i] corresponds
     *      to _claimTopics[i].
     *
     * @param _userAddress The wallet address of the user to verify
     * @param _claimTopics Array of claim topics to verify
     * @return results Array of boolean verification results, parallel to input array
     *
     * @custom:example
     *      // Check multiple claims at once
     *      uint256[] memory topics = new uint256[](3);
     *      topics[0] = uint256(keccak256("galileo.claim.kyc.verified"));
     *      topics[1] = uint256(keccak256("galileo.claim.vip.collector"));
     *      topics[2] = uint256(keccak256("galileo.claim.warranty.active"));
     *      bool[] memory results = registry.batchVerify(user, topics);
     */
    function batchVerify(
        address _userAddress,
        uint256[] calldata _claimTopics
    ) external view returns (bool[] memory results);

    /**
     * @notice Check if this registry is part of the Galileo consortium
     * @dev A registry is considered a consortium member if it is bound to both
     *      a Trusted Issuers Registry (TIR) and a Claim Topics Registry (CTR)
     *      managed by the Galileo consortium.
     *
     *      Consortium membership enables:
     *      - Cross-brand verification with consent
     *      - Shared trusted issuer trust anchors
     *      - Standardized claim topic namespaces
     *      - Federated identity resolution
     *
     * @return True if this registry is registered with consortium TIR and CTR
     */
    function isConsortiumMember() external view returns (bool);

    /**
     * @notice Get the consortium registries this registry is bound to
     * @dev Returns the addresses of the Trusted Issuers Registry (TIR) and
     *      Claim Topics Registry (CTR) that this registry uses for verification.
     *      Returns zero addresses if not a consortium member.
     *
     *      The TIR contains the list of trusted claim issuers.
     *      The CTR contains the standardized claim topics and their schemas.
     *
     * @return tir Address of the Trusted Issuers Registry (zero if not member)
     * @return ctr Address of the Claim Topics Registry (zero if not member)
     */
    function getConsortiumRegistries() external view returns (address tir, address ctr);

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTIONAL EXTENSION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Batch verification with consent for multiple claim topics
     * @dev Combines batchVerify with consent checking for each topic.
     *      Each topic is verified against the user's claims AND consent
     *      to the requesting brand is checked.
     *
     * @param _userAddress The wallet address of the user to verify
     * @param _claimTopics Array of claim topics to verify
     * @param _requestingBrand The address of the brand's Identity Registry
     * @return results Array of boolean verification results with consent
     */
    function batchVerifyWithConsent(
        address _userAddress,
        uint256[] calldata _claimTopics,
        address _requestingBrand
    ) external view returns (bool[] memory results);

    /**
     * @notice Get the number of registered identities
     * @dev Useful for analytics and monitoring registry growth
     * @return The total count of registered identities
     */
    function identityCount() external view returns (uint256);

    /**
     * @notice Check if a specific claim topic is supported by this registry
     * @dev Topics are typically validated against the bound Claim Topics Registry
     * @param _claimTopic The claim topic to check
     * @return True if the claim topic is recognized and supported
     */
    function isClaimTopicSupported(uint256 _claimTopic) external view returns (bool);
}
