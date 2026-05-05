// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IToken} from "@erc3643org/erc-3643/contracts/token/IToken.sol";

/**
 * @title IGalileoToken
 * @author Galileo Protocol Contributors
 * @notice Extended ERC-3643 token interface for luxury product ownership representation
 * @dev This interface extends the standard ERC-3643 IToken with luxury-specific extensions
 *      designed for the Galileo consortium's unique requirements:
 *
 *      **Single-Supply Token Pattern:**
 *      Each IGalileoToken deployment represents ONE physical luxury product. Unlike
 *      traditional fungible tokens, totalSupply() is ALWAYS 1 for Galileo product tokens.
 *      This pattern ensures:
 *      - Clear 1:1 mapping between token and physical product
 *      - Simplified ownership tracking (holder = owner)
 *      - Individual product lifecycle management
 *      - Product-specific compliance rules
 *
 *      **Product Metadata:**
 *      Each token stores references to the product's decentralized identifier (DID),
 *      brand information, and off-chain metadata. The product DID follows the
 *      did:galileo:01:{gtin}:21:{serial} scheme and resolves to complete product information.
 *
 *      **CPO (Certified Pre-Owned) Status:**
 *      The interface includes CPO certification management critical for luxury resale.
 *      Only authorized certifiers (authenticators, brand service centers) can issue
 *      CPO certification. CPO status affects:
 *      - Resale eligibility on compliant marketplaces
 *      - Product valuation
 *      - Warranty extensions
 *      - Insurance eligibility
 *
 *      **Transfer with Reason:**
 *      Extended transfer function that captures reason codes for compliance audit trail.
 *      Reason codes enable regulatory reporting and dispute resolution.
 *
 *      **Integration with Identity Infrastructure:**
 *      This interface works in conjunction with:
 *      - IGalileoIdentityRegistry: Verifies participant identities and consent
 *      - IGalileoClaimTopicsRegistry: Defines claim topics for certifiers
 *      - GalileoClaimTopics: Constants for AUTHENTICATOR, SERVICE_CENTER claims
 *
 * @custom:security-contact security@galileoprotocol.io
 */
interface IGalileoToken is IToken {
    // ============================================================================
    // ERRORS
    // ============================================================================

    /**
     * @notice Thrown when caller is not an authorized CPO certifier
     * @dev Certifier authorization is verified via claim topics:
     *      - GalileoClaimTopics.AUTHENTICATOR
     *      - GalileoClaimTopics.SERVICE_CENTER
     *      - Brand-specific certifier claims
     * @param caller The address that attempted the operation
     */
    error NotAuthorizedCertifier(address caller);

    /**
     * @notice Thrown when attempting to certify a product that already has CPO status
     * @dev A product can only have one active CPO certification at a time.
     *      To re-certify, the current certification must first be revoked.
     * @param token The token address
     * @param existingCertifier The address of the existing certifier
     */
    error AlreadyCPOCertified(address token, address existingCertifier);

    /**
     * @notice Thrown when an operation requires CPO status but product is not certified
     * @dev Operations like cpoCertificationDate() or cpoCertifier() may revert
     *      with this error if queried on non-CPO products.
     * @param token The token address
     */
    error NotCPOCertified(address token);

    /**
     * @notice Thrown when product DID format is invalid
     * @dev Product DIDs must follow the did:galileo:01:{gtin}:21:{serial} scheme
     * @param providedDID The invalid DID that was provided
     */
    error InvalidProductDID(string providedDID);

    /**
     * @notice Thrown when transfer reason code is not recognized
     * @dev Valid reason codes are defined in the compliance specification
     * @param reasonCode The unrecognized reason code
     */
    error InvalidReasonCode(bytes32 reasonCode);

    /**
     * @notice Thrown when product category is not supported
     * @param category The unsupported category
     */
    error UnsupportedProductCategory(string category);

    // ============================================================================
    // EVENTS
    // ============================================================================

    /**
     * @notice Emitted when a product receives CPO certification
     * @dev Indexed parameters enable efficient filtering:
     *      - By token: Track certification history for a product
     *      - By certifier: Audit certifier activity
     * @param token The token contract address
     * @param certifier The address that issued certification
     * @param timestamp The Unix timestamp of certification
     * @param certificationURI URI pointing to certification details (IPFS/HTTP)
     */
    event CPOCertified(
        address indexed token,
        address indexed certifier,
        uint256 timestamp,
        string certificationURI
    );

    /**
     * @notice Emitted when CPO certification is revoked
     * @dev Revocation reasons may include:
     *      - Product damage discovered
     *      - Authenticity concerns
     *      - Certifier error
     *      - Customer request
     * @param token The token contract address
     * @param revoker The address that revoked certification
     * @param timestamp The Unix timestamp of revocation
     * @param reason Human-readable reason for revocation
     */
    event CPORevoked(
        address indexed token,
        address indexed revoker,
        uint256 timestamp,
        string reason
    );

    /**
     * @notice Emitted when a transfer occurs with a documented reason
     * @dev Extends the standard ERC-20 Transfer event with reason tracking.
     *      Reason codes enable compliance reporting and audit trails.
     *
     *      Common reason codes:
     *      - keccak256("SALE"): Standard sale transaction
     *      - keccak256("GIFT"): Gift transfer
     *      - keccak256("INHERITANCE"): Estate transfer
     *      - keccak256("WARRANTY_CLAIM"): Return for warranty
     *      - keccak256("SERVICE_TRANSFER"): Transfer to service center
     *
     * @param from The sender address
     * @param to The receiver address
     * @param amount The amount transferred (always 1 in single-supply pattern)
     * @param reasonCode The keccak256 hash of the reason category
     * @param reasonDescription Human-readable description
     */
    event TransferWithReason(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed reasonCode,
        string reasonDescription
    );

    // ============================================================================
    // PRODUCT METADATA (VIEW FUNCTIONS)
    // ============================================================================

    /**
     * @notice Returns the product's decentralized identifier (DID)
     * @dev The product DID follows the did:galileo:01:{gtin}:21:{serial} scheme.
     *      The DID resolves to a DID Document containing:
     *      - Product specifications
     *      - Manufacturing details
     *      - Provenance information
     *      - Verification methods
     *
     *      Example: "did:galileo:01:01234567890128:21:SN123456"
     *
     * @return The product DID string
     */
    function productDID() external view returns (string memory);

    /**
     * @notice Returns the product category
     * @dev Categories follow the Galileo product taxonomy:
     *      - "WATCH": Timepieces
     *      - "JEWELRY": Jewelry items
     *      - "HANDBAG": Leather goods - bags
     *      - "LEATHER_GOODS": Other leather accessories
     *      - "APPAREL": Clothing
     *      - "FOOTWEAR": Shoes and boots
     *      - "ACCESSORIES": Other luxury accessories
     *
     *      Categories affect applicable compliance modules and verification rules.
     *
     * @return The product category string
     */
    function productCategory() external view returns (string memory);

    /**
     * @notice Returns the brand's decentralized identifier (DID)
     * @dev The brand DID follows the did:galileo:brand:{identifier} scheme.
     *      Used for:
     *      - Brand authorization verification
     *      - Cross-brand consent checking
     *      - Linking to brand metadata
     *
     *      Example: "did:galileo:brand:lvmh-louis-vuitton"
     *
     * @return The brand DID string
     */
    function brandDID() external view returns (string memory);

    /**
     * @notice Returns the URI for complete product metadata
     * @dev The URI points to a JSON document containing extended product information
     *      that doesn't need to be on-chain. Typically IPFS or HTTPS.
     *
     *      The JSON document follows the Galileo Product Metadata schema and includes:
     *      - Schema.org IndividualProduct properties
     *      - ESPR (EU Sustainable Products Regulation) data
     *      - Materials composition
     *      - Care instructions
     *      - Warranty information
     *
     * @return The product metadata URI
     */
    function productURI() external view returns (string memory);

    // ============================================================================
    // CPO (CERTIFIED PRE-OWNED) STATUS (VIEW FUNCTIONS)
    // ============================================================================

    /**
     * @notice Returns whether the product has active CPO certification
     * @dev A product is CPO certified if:
     *      1. It has been certified by an authorized certifier
     *      2. The certification has not been revoked
     *      3. The certification has not expired (if expiry is implemented)
     *
     *      CPO status is critical for:
     *      - Resale on compliant marketplaces
     *      - Warranty claims
     *      - Insurance coverage
     *      - Brand recognition of secondary market sales
     *
     * @return True if product has active CPO certification
     */
    function isCPOCertified() external view returns (bool);

    /**
     * @notice Returns the timestamp when CPO certification was issued
     * @dev Reverts with NotCPOCertified if product is not certified.
     *
     *      The certification date is important for:
     *      - Time-limited certifications
     *      - Audit trails
     *      - Warranty calculations
     *
     * @return Unix timestamp of certification
     */
    function cpoCertificationDate() external view returns (uint256);

    /**
     * @notice Returns the address of the certifier who issued CPO status
     * @dev Reverts with NotCPOCertified if product is not certified.
     *
     *      The certifier must have appropriate claims:
     *      - GalileoClaimTopics.AUTHENTICATOR for third-party labs
     *      - GalileoClaimTopics.SERVICE_CENTER for brand service centers
     *      - Brand-specific certifier claims
     *
     * @return Address of the certifier
     */
    function cpoCertifier() external view returns (address);

    /**
     * @notice Returns the URI pointing to CPO certification details
     * @dev Reverts with NotCPOCertified if product is not certified.
     *
     *      The URI points to a document containing:
     *      - Inspection report
     *      - Condition assessment
     *      - Authentication details
     *      - Photos/evidence
     *      - Certifier credentials
     *
     * @return URI to certification details
     */
    function cpoCertificationURI() external view returns (string memory);

    // ============================================================================
    // CPO MANAGEMENT (RESTRICTED FUNCTIONS)
    // ============================================================================

    /**
     * @notice Issues CPO certification for the product
     * @dev Caller MUST have valid certifier claims verified via Identity Registry.
     *      Acceptable claims:
     *      - GalileoClaimTopics.AUTHENTICATOR
     *      - GalileoClaimTopics.SERVICE_CENTER
     *      - Brand-specific certifier authorization
     *
     *      Requirements:
     *      - Caller must be authorized certifier
     *      - Product must not already have CPO status
     *      - Certification URI must be valid
     *
     *      Emits: CPOCertified event
     *
     * @param certificationURI URI pointing to certification details
     *
     * @custom:throws NotAuthorizedCertifier If caller lacks certifier claims
     * @custom:throws AlreadyCPOCertified If product already has CPO status
     */
    function certifyCPO(string calldata certificationURI) external;

    /**
     * @notice Revokes existing CPO certification
     * @dev Can be called by:
     *      - The original certifier
     *      - Brand agents (for brand-specific reasons)
     *      - Protocol-level enforcement (via multi-sig)
     *
     *      Reasons for revocation:
     *      - Product damage discovered post-certification
     *      - Authenticity concerns raised
     *      - Certifier error or fraud
     *      - Customer request
     *      - Regulatory requirement
     *
     *      Requirements:
     *      - Product must have active CPO status
     *      - Caller must be authorized to revoke
     *
     *      Emits: CPORevoked event
     *
     * @param reason Human-readable reason for revocation
     *
     * @custom:throws NotCPOCertified If product is not CPO certified
     * @custom:throws NotAuthorizedCertifier If caller cannot revoke
     */
    function revokeCPO(string calldata reason) external;

    // ============================================================================
    // EXTENDED TRANSFER FUNCTIONS
    // ============================================================================

    /**
     * @notice Transfers ownership with documented reason for compliance
     * @dev Extends the standard ERC-3643 transfer with reason tracking.
     *      All standard ERC-3643 transfer checks still apply:
     *      - Identity verification
     *      - Compliance module checks
     *      - Freeze/pause status
     *
     *      Reason codes should use keccak256 of standard reason strings:
     *      - keccak256("SALE"): Primary or secondary sale
     *      - keccak256("GIFT"): Gift between individuals
     *      - keccak256("INHERITANCE"): Estate/inheritance transfer
     *      - keccak256("WARRANTY_CLAIM"): Return for warranty service
     *      - keccak256("SERVICE_TRANSFER"): Temporary transfer for service
     *      - keccak256("AUCTION"): Auction house transfer
     *      - keccak256("LOAN"): Temporary transfer for display/loan
     *
     *      The reason is stored on-chain in the event for audit trail.
     *
     *      Emits: TransferWithReason event (in addition to standard Transfer)
     *
     * @param to The recipient address
     * @param amount The amount to transfer (always 1 in single-supply pattern)
     * @param reasonCode The keccak256 hash of the reason category
     * @param reasonDescription Human-readable description for the specific transfer
     * @return True if transfer succeeded
     *
     * @custom:throws InvalidReasonCode If reasonCode is not recognized
     */
    function transferWithReason(
        address to,
        uint256 amount,
        bytes32 reasonCode,
        string calldata reasonDescription
    ) external returns (bool);

    // ============================================================================
    // IDENTITY REGISTRY INTEGRATION
    // ============================================================================

    /**
     * @notice Returns the bound Identity Registry contract
     * @dev The Identity Registry verifies that transfer participants have valid
     *      identities and required claims. This is inherited from IToken but
     *      documented here for clarity.
     *
     *      In the Galileo ecosystem, this returns an IGalileoIdentityRegistry
     *      which provides additional features:
     *      - Cross-brand consent verification
     *      - Batch claim verification
     *      - Consortium membership checks
     *
     * @return Address of the Identity Registry contract
     */
    function identityRegistry() external view returns (address);

    // ============================================================================
    // OPTIONAL EXTENSION FUNCTIONS
    // ============================================================================

    /**
     * @notice Returns the product's GS1 GTIN (Global Trade Item Number)
     * @dev The 14-digit GTIN uniquely identifies the product SKU.
     *      Used for:
     *      - GS1 Digital Link resolution
     *      - Supply chain integration
     *      - POS system compatibility
     *
     *      Example: "01234567890128"
     *
     * @return The 14-digit GTIN string
     */
    function gtin() external view returns (string memory);

    /**
     * @notice Returns the product's serial number
     * @dev The serial number uniquely identifies the individual item within the SKU.
     *      Combined with GTIN, provides globally unique product identification.
     *
     * @return The serial number string
     */
    function serialNumber() external view returns (string memory);

    /**
     * @notice Returns the timestamp when this token was created
     * @dev Represents when the token was minted, which typically corresponds to
     *      the product being registered in the Galileo ecosystem.
     *
     * @return Unix timestamp of token creation
     */
    function createdAt() external view returns (uint256);

    /**
     * @notice Returns whether the product token has been decommissioned
     * @dev A decommissioned token represents a product that has been:
     *      - Destroyed
     *      - Lost permanently
     *      - Fraudulently claimed
     *      - Removed from circulation
     *
     *      Decommissioned tokens cannot be transferred.
     *
     * @return True if token is decommissioned
     */
    function isDecommissioned() external view returns (bool);

    /**
     * @notice Returns the reason for decommissioning
     * @dev Only meaningful if isDecommissioned() returns true.
     *
     * @return The decommission reason string
     */
    function decommissionReason() external view returns (string memory);
}
