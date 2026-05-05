// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import {IComplianceModule} from "../IComplianceModule.sol";

/**
 * @title IBrandAuthorizationModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module that enforces brand authorization for token transfers
 * @dev This module ensures that transfers flow through authorized channels by verifying
 *      that participants hold valid AUTHORIZED_RETAILER claims from trusted issuers.
 *
 *      Use Cases:
 *      - **Primary Sales**: Ensure tokens are only sold through authorized retailers
 *      - **Grey Market Prevention**: Block transfers to unauthorized resellers
 *      - **Channel Control**: Maintain brand distribution agreements
 *      - **Territory Compliance**: Enforce geographic distribution rights
 *
 *      Integration with Identity:
 *      - Queries IGalileoIdentityRegistry.batchVerify() for claim verification
 *      - Uses GalileoClaimTopics.AUTHORIZED_RETAILER (0xfc1ed254...)
 *      - Supports category-specific authorization (e.g., "watches", "jewelry")
 *
 *      Configuration Options:
 *      - requireRetailerForPrimarySale: If true, minting must go to authorized retailer
 *      - allowPeerToPeer: If true, verified consumer-to-consumer transfers allowed
 *      - categoryRestrictions: Limit authorization to specific product categories
 *
 *      Claim Requirements:
 *      The AUTHORIZED_RETAILER claim must contain:
 *      - brandDID: The authorizing brand's DID
 *      - territory: Authorized geographic region
 *      - categories: Array of authorized product categories
 *      - validFrom/validUntil: Authorization validity period
 *
 * Reference: GalileoClaimTopics.AUTHORIZED_RETAILER
 * Specification: GSPEC-COMPLIANCE-003
 * @custom:security-contact security@galileoprotocol.io
 */
interface IBrandAuthorizationModule is IComplianceModule {
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when retailer is not authorized for the brand
     * @param retailer The retailer address that failed authorization
     * @param brandDID The brand DID that was checked
     */
    error RetailerNotAuthorized(address retailer, string brandDID);

    /**
     * @notice Thrown when retailer is not authorized for a specific category
     * @param retailer The retailer address
     * @param category The product category that was not authorized
     */
    error RetailerNotAuthorizedForCategory(address retailer, string category);

    /**
     * @notice Thrown when retailer authorization has expired
     * @param retailer The retailer address
     * @param expiredAt The timestamp when authorization expired
     */
    error RetailerAuthorizationExpired(address retailer, uint256 expiredAt);

    /**
     * @notice Thrown when primary sale requires authorized retailer but none provided
     * @param recipient The recipient that is not an authorized retailer
     */
    error PrimarySaleRequiresAuthorizedRetailer(address recipient);

    /**
     * @notice Thrown when claim topic configuration is invalid
     * @param invalidTopic The invalid claim topic provided
     */
    error InvalidClaimTopic(uint256 invalidTopic);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when retailer authorization is checked
     * @param retailer The retailer address that was verified
     * @param authorized Whether the retailer was authorized
     * @param brandDID The brand DID for which authorization was checked
     */
    event RetailerAuthorizationChecked(
        address indexed retailer,
        bool authorized,
        string brandDID
    );

    /**
     * @notice Emitted when the authorized retailer claim topic is updated
     * @param oldTopic The previous claim topic
     * @param newTopic The new claim topic
     * @param updatedBy The address that made the update
     */
    event ClaimTopicUpdated(
        uint256 indexed oldTopic,
        uint256 indexed newTopic,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when primary sale retailer requirement is changed
     * @param required New requirement state (true = retailer required for mints)
     * @param updatedBy The address that made the update
     */
    event PrimarySaleRequirementChanged(bool required, address indexed updatedBy);

    /**
     * @notice Emitted when peer-to-peer transfer setting is changed
     * @param allowed New setting (true = P2P transfers allowed)
     * @param updatedBy The address that made the update
     */
    event PeerToPeerTransferSettingChanged(bool allowed, address indexed updatedBy);

    // ═══════════════════════════════════════════════════════════════════════════
    // BRAND CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the brand DID this module is configured for
     * @dev The brand DID identifies which brand's authorization is required.
     *      Format: "did:galileo:brand:<brand-identifier>"
     *
     * @return The brand DID string
     */
    function brandDID() external view returns (string memory);

    /**
     * @notice Get the claim topic used for retailer authorization
     * @dev Defaults to GalileoClaimTopics.AUTHORIZED_RETAILER
     *      Can be customized for brand-specific authorization claims
     *
     * @return The claim topic ID (uint256)
     */
    function authorizedRetailerClaimTopic() external view returns (uint256);

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHORIZATION CHECKS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if an address is an authorized retailer for this brand
     * @dev Queries the identity registry for AUTHORIZED_RETAILER claim and verifies:
     *      1. Claim exists and is not expired
     *      2. Claim was issued by a trusted issuer
     *      3. Claim authorizes this specific brand
     *
     * @param _address The address to check for retailer authorization
     * @return True if address holds valid authorized retailer claim for this brand
     */
    function isAuthorizedRetailer(address _address) external view returns (bool);

    /**
     * @notice Check if an address is authorized for a specific product category
     * @dev Some retailers may only be authorized for specific categories
     *      (e.g., authorized for "watches" but not "jewelry")
     *
     *      Category checking requires parsing the claim data to verify
     *      the category is included in the authorized categories array.
     *
     * @param _address The address to check
     * @param _category The product category (e.g., "watches", "jewelry", "leather_goods")
     * @return True if address is authorized for the specified category
     */
    function isAuthorizedForCategory(
        address _address,
        string calldata _category
    ) external view returns (bool);

    /**
     * @notice Check authorization with detailed result
     * @dev Provides more information than boolean check for debugging and UX
     *
     * @param _address The address to check
     * @return authorized Whether the address is authorized
     * @return expiresAt When the authorization expires (0 if not authorized)
     * @return categories Array of authorized categories (empty if not authorized)
     * @return territory The authorized territory (empty if not authorized)
     */
    function getAuthorizationDetails(address _address) external view returns (
        bool authorized,
        uint256 expiresAt,
        string[] memory categories,
        string memory territory
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION (ADMIN ONLY)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the claim topic used for retailer authorization
     * @dev Allows customization of which claim topic indicates retailer authorization.
     *      Default is GalileoClaimTopics.AUTHORIZED_RETAILER.
     *
     *      Access Control: Restricted to module admin/owner
     *
     * @param _claimTopic The new claim topic to use
     */
    function setAuthorizedRetailerClaimTopic(uint256 _claimTopic) external;

    /**
     * @notice Set whether authorized retailer is required for primary sales (mints)
     * @dev When true, tokens can only be minted to addresses that hold
     *      valid AUTHORIZED_RETAILER claims.
     *
     *      Access Control: Restricted to module admin/owner
     *
     * @param _require True to require authorized retailer for mints
     */
    function setRequireRetailerForPrimarySale(bool _require) external;

    /**
     * @notice Set whether peer-to-peer transfers are allowed
     * @dev When true, transfers between verified consumers (non-retailers)
     *      are allowed. When false, all transfers must involve an authorized
     *      retailer on at least one side.
     *
     *      Access Control: Restricted to module admin/owner
     *
     * @param _allow True to allow P2P transfers
     */
    function setAllowPeerToPeer(bool _allow) external;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION GETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if authorized retailer is required for primary sales
     * @return True if primary sales require authorized retailer
     */
    function requireRetailerForPrimarySale() external view returns (bool);

    /**
     * @notice Check if peer-to-peer transfers are allowed
     * @return True if P2P transfers are allowed
     */
    function allowPeerToPeer() external view returns (bool);

    /**
     * @notice Get the identity registry used for claim verification
     * @return Address of the IGalileoIdentityRegistry
     */
    function identityRegistry() external view returns (address);
}
