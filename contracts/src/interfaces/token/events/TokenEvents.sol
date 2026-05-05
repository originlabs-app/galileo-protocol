// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

/**
 * @title TokenEvents
 * @author Galileo Protocol Contributors
 * @notice Comprehensive event library for Galileo token operations
 * @dev This library defines all events emitted by the Galileo token infrastructure.
 *      Events are organized into categories for clarity and are designed to support:
 *
 *      - **Audit Trail**: Complete history of token operations for regulatory compliance
 *      - **Off-chain Indexing**: Event-driven architecture for subgraphs/indexers
 *      - **CPO Tracking**: Certified Pre-Owned certification lifecycle
 *      - **Transfer Analytics**: Reason-tagged transfers for reporting
 *      - **Recovery Monitoring**: Lost wallet recovery audit trail
 *
 *      **Event Categories:**
 *      1. CPO Events - Certification lifecycle (certify, revoke, transfer)
 *      2. Transfer Events - Ownership changes with compliance context
 *      3. Compliance Binding Events - Registry and compliance contract binding
 *      4. Recovery Events - Lost wallet recovery operations
 *      5. Product Lifecycle Events - Token creation and decommissioning
 *
 *      **Usage:**
 *      Events in this library are emitted by Token contracts and related services.
 *      Implementations should emit these events at the appropriate lifecycle points.
 *
 *      ```solidity
 *      import {TokenEvents} from "./events/TokenEvents.sol";
 *
 *      contract GalileoProductToken {
 *          function certifyCPO(string calldata uri) external {
 *              // ... certification logic ...
 *              emit TokenEvents.CPOCertified(address(this), msg.sender, block.timestamp, uri);
 *          }
 *      }
 *      ```
 *
 * @custom:security-contact security@galileoprotocol.io
 */
library TokenEvents {
    // =========================================================================
    // CPO (CERTIFIED PRE-OWNED) EVENTS
    // =========================================================================

    /**
     * @notice Emitted when a product receives CPO certification
     * @dev This event indicates a product has been authenticated and certified
     *      for secondary market sale by an authorized certifier.
     *
     *      **Indexed Parameters:**
     *      - token: For filtering certification history by product
     *      - certifier: For auditing certifier activity
     *
     *      **Use cases for indexers:**
     *      - Track all certifications by a specific certifier
     *      - Query certification history for a product
     *      - Monitor certification volumes over time
     *
     * @param token The token contract address being certified
     * @param certifier The address that issued the certification (must hold AUTHENTICATOR
     *        or SERVICE_CENTER claims)
     * @param timestamp Unix timestamp when certification was issued
     * @param certificationURI IPFS/HTTP URI pointing to certification details including
     *        inspection report, photos, and authentication evidence
     */
    event CPOCertified(
        address indexed token,
        address indexed certifier,
        uint256 timestamp,
        string certificationURI
    );

    /**
     * @notice Emitted when CPO certification is revoked
     * @dev This event indicates a previously certified product has lost its
     *      CPO status. Revocation affects resale eligibility.
     *
     *      **Revocation reasons:**
     *      - Product damage discovered post-certification
     *      - Authenticity concerns raised
     *      - Certifier error or misconduct
     *      - Customer request
     *      - Regulatory enforcement
     *
     *      **Indexed Parameters:**
     *      - token: For tracking specific product revocations
     *      - revoker: For auditing who revoked (may differ from original certifier)
     *
     * @param token The token contract address being revoked
     * @param revoker The address that revoked the certification
     * @param timestamp Unix timestamp when revocation occurred
     * @param reason Human-readable explanation for revocation
     */
    event CPORevoked(
        address indexed token,
        address indexed revoker,
        uint256 timestamp,
        string reason
    );

    /**
     * @notice Emitted when a CPO-certified product is transferred
     * @dev Tracks whether CPO status is maintained through ownership transfer.
     *      Some transfers may invalidate CPO status (e.g., unauthorized channels).
     *
     *      **cpoMaintained logic:**
     *      - true: CPO status carries to new owner
     *      - false: CPO status was invalidated by transfer circumstances
     *
     *      **Indexed Parameters:**
     *      All three addresses indexed for flexible querying:
     *      - By token: Track product's transfer history
     *      - By from: Track seller's transaction history
     *      - By to: Track buyer's acquisition history
     *
     * @param token The token contract address
     * @param from The seller's address
     * @param to The buyer's address
     * @param cpoMaintained Whether CPO certification remains valid after transfer
     */
    event CPOTransferred(
        address indexed token,
        address indexed from,
        address indexed to,
        bool cpoMaintained
    );

    // =========================================================================
    // TRANSFER EVENTS (EXTENDING ERC-3643)
    // =========================================================================

    /**
     * @notice Emitted when a transfer occurs with documented reason
     * @dev Extends the standard ERC-20 Transfer event with compliance context.
     *      This event is emitted IN ADDITION TO the standard Transfer event,
     *      not as a replacement.
     *
     *      **Standard reason codes (keccak256 hashes):**
     *      - keccak256("SALE"): Primary or secondary sale
     *      - keccak256("GIFT"): Gift between individuals
     *      - keccak256("INHERITANCE"): Estate/inheritance transfer
     *      - keccak256("WARRANTY_CLAIM"): Return for warranty service
     *      - keccak256("SERVICE_TRANSFER"): Temporary transfer for repairs
     *      - keccak256("AUCTION"): Auction house transfer
     *      - keccak256("LOAN"): Temporary transfer for exhibition/loan
     *
     *      **Indexed Parameters:**
     *      - from: Filter by sender for transaction history
     *      - to: Filter by receiver for acquisition history
     *      - reasonCode: Filter by reason category for compliance reports
     *
     * @param from The sender's address
     * @param to The receiver's address
     * @param amount The amount transferred (always 1 in single-supply pattern)
     * @param reasonCode The keccak256 hash of the reason category
     * @param reasonDescription Human-readable description specific to this transfer
     */
    event TransferWithReason(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed reasonCode,
        string reasonDescription
    );

    /**
     * @notice Emitted when a transfer is blocked by compliance
     * @dev This event provides visibility into failed transfer attempts.
     *      Useful for:
     *      - Debugging transfer failures
     *      - Compliance monitoring
     *      - Fraud detection (repeated blocked attempts)
     *
     *      **Common block reasons:**
     *      - "Receiver not verified in Identity Registry"
     *      - "Compliance module check failed"
     *      - "Sender address is frozen"
     *      - "Receiver address is frozen"
     *      - "Token is paused"
     *      - "Country restriction"
     *      - "Sanctions screening failed"
     *
     *      **Indexed Parameters:**
     *      - from: Track blocked attempts by sender
     *      - to: Track blocked attempts to receiver
     *
     * @param from The attempted sender's address
     * @param to The intended receiver's address
     * @param amount The amount that was attempted
     * @param reason Human-readable reason why transfer was blocked
     */
    event TransferBlocked(
        address indexed from,
        address indexed to,
        uint256 amount,
        string reason
    );

    /**
     * @notice Emitted after successful transfer with compliance module details
     * @dev Provides detailed audit trail of which compliance modules were
     *      evaluated during the transfer.
     *
     *      **Compliance flow:**
     *      1. canTransfer() called on each bound module
     *      2. All modules must return true
     *      3. Transfer executed
     *      4. transferred() called on each module for state updates
     *      5. This event emitted with count
     *
     *      **Indexed Parameters:**
     *      All three identifiers indexed for comprehensive querying
     *
     * @param token The token contract that was transferred
     * @param from The sender's address
     * @param to The receiver's address
     * @param complianceModulesChecked Number of compliance modules that were evaluated
     */
    event TransferCompleted(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 complianceModulesChecked
    );

    // =========================================================================
    // COMPLIANCE BINDING EVENTS
    // =========================================================================

    /**
     * @notice Emitted when a Compliance contract is bound to a token
     * @dev The Compliance contract enforces transfer rules through modules.
     *      Binding occurs during token deployment or admin reconfiguration.
     *
     *      **Security note:**
     *      Compliance binding changes are security-sensitive operations.
     *      Monitor this event for unauthorized changes.
     *
     *      **Indexed Parameters:**
     *      - token: Track compliance changes for specific product
     *      - compliance: Track which tokens use specific compliance contract
     *
     * @param token The token contract address
     * @param compliance The Modular Compliance contract address being bound
     * @param timestamp Unix timestamp when binding occurred
     */
    event ComplianceContractBound(
        address indexed token,
        address indexed compliance,
        uint256 timestamp
    );

    /**
     * @notice Emitted when an Identity Registry is bound to a token
     * @dev The Identity Registry verifies participant identities before transfers.
     *      Binding occurs during token deployment or admin reconfiguration.
     *
     *      **Security note:**
     *      Registry binding changes are security-sensitive operations.
     *      An incorrect registry could allow unverified transfers.
     *
     *      **Indexed Parameters:**
     *      - token: Track registry changes for specific product
     *      - registry: Track which tokens use specific registry
     *
     * @param token The token contract address
     * @param registry The Identity Registry contract address being bound
     * @param timestamp Unix timestamp when binding occurred
     */
    event IdentityRegistryBound(
        address indexed token,
        address indexed registry,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a compliance module is added to a token's compliance contract
     * @dev Tracks which compliance modules are active for a token.
     *      Module additions affect which rules are enforced.
     *
     * @param token The token contract address
     * @param complianceContract The compliance contract address
     * @param module The compliance module being added
     * @param timestamp Unix timestamp when module was added
     */
    event ComplianceModuleAdded(
        address indexed token,
        address indexed complianceContract,
        address indexed module,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a compliance module is removed from a token's compliance contract
     * @dev Tracks compliance module removals for audit purposes.
     *
     * @param token The token contract address
     * @param complianceContract The compliance contract address
     * @param module The compliance module being removed
     * @param timestamp Unix timestamp when module was removed
     */
    event ComplianceModuleRemoved(
        address indexed token,
        address indexed complianceContract,
        address indexed module,
        uint256 timestamp
    );

    // =========================================================================
    // RECOVERY EVENTS
    // =========================================================================

    /**
     * @notice Emitted when a recovery process is initiated
     * @dev Recovery allows tokens to be moved from a lost/compromised wallet
     *      to a new wallet under the same ONCHAINID identity.
     *
     *      **Recovery process:**
     *      1. Investor contacts issuer with identity proof (off-chain)
     *      2. Issuer verifies investor identity matches ONCHAINID
     *      3. Agent calls recoveryAddress()
     *      4. RecoveryInitiated event emitted
     *      5. Tokens transferred
     *      6. RecoveryCompleted event emitted
     *
     *      **Security considerations:**
     *      - Monitor for unauthorized recovery attempts
     *      - Both wallets must be associated with same ONCHAINID
     *      - Requires agent role authorization
     *
     *      **Indexed Parameters:**
     *      All three addresses indexed for comprehensive monitoring
     *
     * @param lostWallet The wallet losing access (compromised or lost keys)
     * @param newWallet The wallet receiving recovered tokens
     * @param initiator The agent who initiated the recovery
     */
    event RecoveryInitiated(
        address indexed lostWallet,
        address indexed newWallet,
        address indexed initiator
    );

    /**
     * @notice Emitted when a recovery process completes successfully
     * @dev Indicates tokens have been successfully transferred from
     *      lostWallet to newWallet during recovery.
     *
     *      **Indexed Parameters:**
     *      - lostWallet: Track recoveries from specific addresses
     *      - newWallet: Track recoveries to specific addresses
     *      - investorOnchainID: Track all recoveries for an identity
     *
     * @param lostWallet The wallet that lost access
     * @param newWallet The wallet that received the tokens
     * @param investorOnchainID The ONCHAINID contract address of the investor
     */
    event RecoveryCompleted(
        address indexed lostWallet,
        address indexed newWallet,
        address indexed investorOnchainID
    );

    /**
     * @notice Emitted when a recovery attempt fails
     * @dev Captures failed recovery attempts for security monitoring.
     *      May indicate attempted fraud or configuration issues.
     *
     *      **Common failure reasons:**
     *      - "Identity mismatch: wallets not associated with same ONCHAINID"
     *      - "Caller not authorized agent"
     *      - "Lost wallet has no balance"
     *      - "New wallet already contains tokens"
     *
     * @param lostWallet The wallet that was attempted for recovery
     * @param newWallet The intended destination wallet
     * @param reason Human-readable failure reason
     */
    event RecoveryFailed(
        address indexed lostWallet,
        address indexed newWallet,
        string reason
    );

    // =========================================================================
    // PRODUCT LIFECYCLE EVENTS
    // =========================================================================

    /**
     * @notice Emitted when a new product token is created
     * @dev Indicates a new luxury product has been registered in the
     *      Galileo ecosystem and its token has been minted.
     *
     *      **Single-supply pattern:**
     *      Each product gets its own token deployment. This event marks
     *      the initial creation where totalSupply becomes 1.
     *
     *      **Indexed Parameters:**
     *      - token: For filtering by specific product address
     *
     *      **Non-indexed (in event data):**
     *      - productDID: Decentralized identifier for product resolution
     *      - brandDID: Brand identification
     *      - category: Product taxonomy classification
     *
     * @param token The newly created token contract address
     * @param productDID The product's decentralized identifier (did:galileo:01:{gtin}:21:{serial})
     * @param brandDID The brand's decentralized identifier (did:galileo:brand:*)
     * @param category Product category (WATCH, JEWELRY, HANDBAG, etc.)
     */
    event ProductTokenCreated(
        address indexed token,
        string productDID,
        string brandDID,
        string category
    );

    /**
     * @notice Emitted when a product token is decommissioned
     * @dev Indicates a product token has been removed from active circulation.
     *      The token contract remains but transfers are permanently disabled.
     *
     *      **Decommission reasons:**
     *      - Product destroyed (fire, flood, etc.)
     *      - Product lost permanently
     *      - Fraud discovered
     *      - Duplicate token identified
     *      - Legal order
     *
     *      **Important:**
     *      Decommissioning is irreversible. The token cannot be reactivated.
     *      The provenance history is preserved for audit purposes.
     *
     *      **Indexed Parameters:**
     *      - token: For filtering decommissioned products
     *
     * @param token The decommissioned token contract address
     * @param productDID The product's decentralized identifier
     * @param reason Human-readable explanation for decommissioning
     */
    event ProductTokenDecommissioned(
        address indexed token,
        string productDID,
        string reason
    );

    /**
     * @notice Emitted when product metadata is updated
     * @dev Tracks changes to the productURI which points to off-chain metadata.
     *      Metadata updates may occur for:
     *      - ESPR compliance updates
     *      - Additional documentation
     *      - Image/media additions
     *      - Provenance information updates
     *
     * @param token The token contract address
     * @param oldURI The previous metadata URI
     * @param newURI The new metadata URI
     */
    event ProductMetadataUpdated(
        address indexed token,
        string oldURI,
        string newURI
    );

    // =========================================================================
    // FREEZE/PAUSE EVENTS (EXTENDING ERC-3643)
    // =========================================================================

    /**
     * @notice Emitted when tokens are partially frozen for an address
     * @dev Partial freeze allows an address to still transfer unfrozen balance.
     *      Used for collateral locks or partial legal holds.
     *
     *      **Frozen balance calculation:**
     *      Transferable = balanceOf(address) - frozenTokens(address)
     *
     * @param token The token contract address
     * @param account The account whose tokens were frozen
     * @param amount The additional amount being frozen
     * @param totalFrozen The new total frozen balance for this account
     * @param frozenBy The agent who performed the freeze
     */
    event TokensPartiallyFrozen(
        address indexed token,
        address indexed account,
        uint256 amount,
        uint256 totalFrozen,
        address indexed frozenBy
    );

    /**
     * @notice Emitted when partially frozen tokens are unfrozen
     * @dev Releases previously frozen tokens back to transferable status.
     *
     * @param token The token contract address
     * @param account The account whose tokens were unfrozen
     * @param amount The amount being unfrozen
     * @param remainingFrozen The remaining frozen balance after unfreeze
     * @param unfrozenBy The agent who performed the unfreeze
     */
    event TokensUnfrozen(
        address indexed token,
        address indexed account,
        uint256 amount,
        uint256 remainingFrozen,
        address indexed unfrozenBy
    );

    // =========================================================================
    // BRAND AUTHORIZATION EVENTS
    // =========================================================================

    /**
     * @notice Emitted when a brand authorizes an address for product operations
     * @dev Brand authorization allows addresses to perform brand-specific operations
     *      such as minting new product tokens or certifying CPO status.
     *
     *      **Authorization types:**
     *      - MINTER: Can create new product tokens for the brand
     *      - CERTIFIER: Can issue CPO certification
     *      - AGENT: Can perform administrative operations
     *
     * @param brandDID The brand's decentralized identifier
     * @param authorizedAddress The address receiving authorization
     * @param authorizationType The type of authorization granted
     * @param timestamp Unix timestamp when authorization was granted
     */
    event BrandAuthorizationGranted(
        string indexed brandDID,
        address indexed authorizedAddress,
        bytes32 indexed authorizationType,
        uint256 timestamp
    );

    /**
     * @notice Emitted when brand authorization is revoked
     * @dev Removes previously granted authorization from an address.
     *
     * @param brandDID The brand's decentralized identifier
     * @param revokedAddress The address losing authorization
     * @param authorizationType The type of authorization being revoked
     * @param timestamp Unix timestamp when authorization was revoked
     */
    event BrandAuthorizationRevoked(
        string indexed brandDID,
        address indexed revokedAddress,
        bytes32 indexed authorizationType,
        uint256 timestamp
    );
}
