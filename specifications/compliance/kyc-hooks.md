# KYC/KYB Verification Hooks Specification

**Specification ID:** GSPEC-COMPLIANCE-002
**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-31

---

## 1. Overview

### 1.1 Purpose

KYC (Know Your Customer) and KYB (Know Your Business) hooks provide pre-transfer identity verification in the Galileo token ecosystem. These hooks ensure that all parties involved in token transfers meet regulatory requirements before any ownership change occurs.

### 1.2 Integration with Phase 4 Identity Infrastructure

KYC/KYB hooks integrate directly with the Phase 4 identity layer:

- **IGalileoIdentityRegistry**: Central registry for identity verification
- **GalileoClaimTopics**: Standardized claim topic constants for KYC/KYB claims
- **ONCHAINID**: ERC-734/735 identity contracts holding verifiable claims

### 1.3 Compliance Drivers

| Regulation | Requirement | Impact on Hooks |
|------------|-------------|-----------------|
| **MiCA (EU)** | Customer identification for crypto-asset transfers | KYC claims required for all EU parties |
| **Travel Rule (FATF)** | Originator/beneficiary data for transfers >EUR 1,000 | Identity data must be retrievable from claims |
| **TFR (EU 2023/1113)** | No de minimis threshold for EU CASPs | All transfers require identity verification |
| **5AMLD/6AMLD** | Enhanced due diligence for high-risk | KYC_ENHANCED claims for high-value items |
| **OFAC** | Sanctions screening | Separate AML hooks (see aml-screening.md) |

---

## 2. Hook Architecture

### 2.1 Pre-Transfer Hook Flow

```
                     transfer() called
                           |
                           v
              +------------------------+
              | 1. Global Pause Check  |
              +------------------------+
                           |
                           v
              +------------------------+
              | 2. Address Freeze Check|
              +------------------------+
                           |
                           v
    +------------------------------------------+
    |          KYC/KYB HOOK SEQUENCE           |
    +------------------------------------------+
    |                                          |
    |  +------------------------------------+  |
    |  | 3. Verify Sender KYC Claims       |  |
    |  |    - identityRegistry.isVerified  |  |
    |  |    - batchVerify(sender, topics)  |  |
    |  +------------------------------------+  |
    |                    |                     |
    |                    v                     |
    |  +------------------------------------+  |
    |  | 4. Verify Receiver KYC Claims     |  |
    |  |    - identityRegistry.isVerified  |  |
    |  |    - batchVerify(receiver, topics)|  |
    |  +------------------------------------+  |
    |                    |                     |
    |                    v                     |
    |  +------------------------------------+  |
    |  | 5. Transaction-Specific Checks    |  |
    |  |    - High-value threshold         |  |
    |  |    - Cross-border requirements    |  |
    |  |    - Transfer type requirements   |  |
    |  +------------------------------------+  |
    |                                          |
    +------------------------------------------+
                           |
                           v
              +------------------------+
              | 6. Compliance Module   |
              |    canTransfer() check |
              +------------------------+
                           |
                           v
              +------------------------+
              | 7. Execute Transfer    |
              +------------------------+
                           |
                           v
              +------------------------+
              | 8. Post-transfer Hook  |
              |    compliance.transferred() |
              +------------------------+
```

### 2.2 Integration Points

The KYC hooks integrate at two levels:

1. **Identity Registry Level**: Direct verification via `IGalileoIdentityRegistry`
2. **Compliance Module Level**: Modular checks via `IModularCompliance`

---

## 3. Claim Topic Requirements by Transfer Type

### 3.1 Transfer Type Matrix

| Transfer Type | Sender Claims | Receiver Claims | Notes |
|---------------|---------------|-----------------|-------|
| **Primary Sale (Brand to Retailer)** | - | `AUTHORIZED_RETAILER` | Brand is issuer; no sender verification |
| **Primary Sale (Retailer to Consumer)** | `AUTHORIZED_RETAILER` | `KYC_BASIC` | First ownership transfer |
| **Secondary Sale (C2C)** | `KYC_BASIC` | `KYC_BASIC` | Consumer-to-consumer resale |
| **High-Value Sale (>EUR 10,000)** | `KYC_ENHANCED` | `KYC_ENHANCED` | Enhanced due diligence |
| **B2B Transfer** | `KYB_VERIFIED` | `KYB_VERIFIED` | Business entity transfers |
| **MRO Transfer (to Service Center)** | `KYC_BASIC` | `SERVICE_CENTER` | Maintenance/Repair/Overhaul |
| **Auction House Sale** | `KYC_BASIC` | `AUCTION_HOUSE` or `KYC_BASIC` | Via licensed auction house |
| **Cross-Border EU-US** | `KYC_EU_MIFID` | `KYC_US_SEC` | Jurisdiction-specific |
| **Cross-Border EU-SG** | `KYC_EU_MIFID` | `KYC_APAC_SG` | Jurisdiction-specific |

### 3.2 Claim Topic Constants

From `GalileoClaimTopics` library (Phase 4):

```solidity
// Compliance Topics (365-day expiry)
uint256 constant KYC_BASIC = 0xd89b93fa...;      // galileo.kyc.basic
uint256 constant KYC_ENHANCED = 0xa1fecd52...;  // galileo.kyc.enhanced
uint256 constant KYB_VERIFIED = 0x1dd51298...;  // galileo.kyb.verified

// Jurisdiction-Specific Topics
uint256 constant KYC_EU_MIFID = 0xdef3dcc6...;  // galileo.kyc.eu.mifid
uint256 constant KYC_US_SEC = 0x2a049593...;    // galileo.kyc.us.sec
uint256 constant KYC_APAC_SG = 0x15a36587...;   // galileo.kyc.apac.sg

// Luxury-Specific Topics
uint256 constant AUTHORIZED_RETAILER = 0xfc1ed254...;  // galileoprotocol.io.authorized_retailer
uint256 constant SERVICE_CENTER = 0x10830870...;       // galileoprotocol.io.service_center
uint256 constant AUCTION_HOUSE = 0x4c471013...;        // galileoprotocol.io.auction_house
```

---

## 4. Integration with IGalileoIdentityRegistry

### 4.1 Single Claim Verification

```solidity
// Basic verification - checks if user has required claims from trusted issuers
bool verified = identityRegistry.isVerified(receiver);
```

### 4.2 Multi-Claim Batch Verification

```solidity
// Efficient multi-topic verification in single call
uint256[] memory topics = new uint256[](2);
topics[0] = GalileoClaimTopics.KYC_BASIC;
topics[1] = GalileoClaimTopics.AUTHORIZED_RETAILER;

// Returns array parallel to input: results[i] = verification for topics[i]
bool[] memory results = identityRegistry.batchVerify(receiver, topics);

// Check all required claims are verified
require(results[0] && results[1], "Missing required claims");
```

### 4.3 Cross-Brand Verification with Consent

```solidity
// Verify claim from another brand's issuer with user consent
bool verified = identityRegistry.isVerifiedWithConsent(
    receiver,                           // User to verify
    GalileoClaimTopics.KYC_BASIC,       // Claim topic
    requestingBrand                     // Brand requesting verification
);
```

### 4.4 Batch Verification with Consent

```solidity
// Multiple claims with consent check for each
uint256[] memory topics = new uint256[](2);
topics[0] = GalileoClaimTopics.KYC_ENHANCED;
topics[1] = GalileoClaimTopics.ORIGIN_CERTIFIED;

bool[] memory results = identityRegistry.batchVerifyWithConsent(
    user,
    topics,
    requestingBrand
);
```

---

## 5. KYC Levels

### 5.1 Level Definitions

| Level | Claim Topic | Requirements | Use Cases |
|-------|-------------|--------------|-----------|
| **Basic (Tier 1)** | `KYC_BASIC` | ID document verification + liveness check | Standard consumer transactions |
| **Enhanced (Tier 2)** | `KYC_ENHANCED` | Basic + proof of address + source of funds | High-value items (>EUR 10,000) |
| **Business (Tier 3)** | `KYB_VERIFIED` | Company verification + UBO identification | B2B transactions |

### 5.2 Level Escalation Rules

```
Transaction Value         Required Level
--------------------     ----------------
< EUR 1,000              KYC_BASIC (may be relaxed per jurisdiction)
EUR 1,000 - 10,000       KYC_BASIC
EUR 10,000 - 50,000      KYC_ENHANCED
> EUR 50,000             KYC_ENHANCED + manual review flag
```

### 5.3 Claim Data Requirements

**KYC_BASIC Claim Data:**
```json
{
  "level": "basic",
  "verificationMethod": "document_liveness",
  "documentTypes": ["passport", "national_id", "drivers_license"],
  "livenessScore": 0.95,
  "verifiedAt": "2026-01-15T10:00:00Z",
  "expiresAt": "2027-01-15T10:00:00Z"
}
```

**KYC_ENHANCED Claim Data:**
```json
{
  "level": "enhanced",
  "verificationMethod": "enhanced_due_diligence",
  "documentTypes": ["passport"],
  "proofOfAddress": true,
  "sourceOfFunds": "verified",
  "riskScore": 25,
  "verifiedAt": "2026-01-15T10:00:00Z",
  "expiresAt": "2027-01-15T10:00:00Z"
}
```

**KYB_VERIFIED Claim Data:**
```json
{
  "level": "business",
  "companyName": "Luxury Retail GmbH",
  "registrationNumber": "HRB 123456",
  "jurisdiction": "DE",
  "uboVerified": true,
  "uboCount": 2,
  "verifiedAt": "2026-01-15T10:00:00Z",
  "expiresAt": "2027-01-15T10:00:00Z"
}
```

---

## 6. Jurisdiction-Specific Requirements

### 6.1 Jurisdiction Claim Mapping

| Jurisdiction | Claim Topic | Regulatory Reference | Additional Requirements |
|--------------|-------------|---------------------|------------------------|
| **EU (MiFID II)** | `KYC_EU_MIFID` | Directive 2014/65/EU | Appropriateness assessment |
| **US (SEC)** | `KYC_US_SEC` | Securities Act 1933, AML/BSA | Accredited investor check |
| **Singapore (MAS)** | `KYC_APAC_SG` | MAS Notice SFA04-N02 | Technology risk management |
| **UK (FCA)** | `KYC_UK_FCA` | FCA COBS | Consumer duty compliance |
| **Switzerland (FINMA)** | `KYC_CH_FINMA` | AMLA/AMLO | Beneficial owner verification |

### 6.2 Cross-Border Transfer Requirements

```
Sender Jurisdiction    Receiver Jurisdiction    Required Claims
-------------------    ---------------------    ---------------
EU                     EU                       KYC_EU_MIFID (both)
EU                     US                       KYC_EU_MIFID + KYC_US_SEC
EU                     Singapore                KYC_EU_MIFID + KYC_APAC_SG
US                     EU                       KYC_US_SEC + KYC_EU_MIFID
Any                    Sanctioned               BLOCKED (see AML hooks)
```

---

## 7. Hook Interface Specification

### 7.1 IKYCComplianceHook Interface

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title IKYCComplianceHook
 * @notice Interface for KYC/KYB verification hooks in token transfers
 * @dev Integrates with IGalileoIdentityRegistry for claim verification
 */
interface IKYCComplianceHook {
    // ============ View Functions ============

    /**
     * @notice Get the required claim topics for this hook
     * @dev Topics are defined in GalileoClaimTopics library
     * @return Array of claim topic IDs required for transfer eligibility
     */
    function requiredClaimTopics() external view returns (uint256[] memory);

    /**
     * @notice Verify sender has required KYC claims
     * @param _sender Address to verify
     * @return True if sender has all required claims from trusted issuers
     */
    function verifySenderEligibility(address _sender) external view returns (bool);

    /**
     * @notice Verify receiver has required KYC claims
     * @param _receiver Address to verify
     * @return True if receiver has all required claims from trusted issuers
     */
    function verifyReceiverEligibility(address _receiver) external view returns (bool);

    /**
     * @notice Batch verify both parties (gas efficient)
     * @param _sender Sender address
     * @param _receiver Receiver address
     * @return senderOk True if sender is eligible
     * @return receiverOk True if receiver is eligible
     */
    function verifyTransferEligibility(
        address _sender,
        address _receiver
    ) external view returns (bool senderOk, bool receiverOk);

    /**
     * @notice Get detailed verification status for an address
     * @param _address Address to check
     * @return topics Array of required topics
     * @return results Array of verification results per topic
     */
    function getVerificationDetails(address _address)
        external view returns (uint256[] memory topics, bool[] memory results);

    /**
     * @notice Get the identity registry used for verification
     * @return Address of the IGalileoIdentityRegistry
     */
    function identityRegistry() external view returns (address);

    // ============ Configuration Functions ============

    /**
     * @notice Set required claim topics for sender verification
     * @param _topics Array of claim topic IDs
     */
    function setSenderRequiredTopics(uint256[] calldata _topics) external;

    /**
     * @notice Set required claim topics for receiver verification
     * @param _topics Array of claim topic IDs
     */
    function setReceiverRequiredTopics(uint256[] calldata _topics) external;

    /**
     * @notice Set the identity registry address
     * @param _registry Address of IGalileoIdentityRegistry
     */
    function setIdentityRegistry(address _registry) external;

    // ============ Events ============

    /**
     * @notice Emitted when KYC verification fails
     * @param party Address that failed verification
     * @param missingClaimTopic The claim topic that was not found
     */
    event KYCVerificationFailed(
        address indexed party,
        uint256 indexed missingClaimTopic
    );

    /**
     * @notice Emitted when KYC verification succeeds
     * @param party Address that passed verification
     * @param verifiedTopics Topics that were verified
     */
    event KYCVerificationPassed(
        address indexed party,
        uint256[] verifiedTopics
    );

    /**
     * @notice Emitted when required topics are updated
     * @param partyType "sender" or "receiver"
     * @param newTopics New required topics
     */
    event RequiredTopicsUpdated(
        string partyType,
        uint256[] newTopics
    );
}
```

### 7.2 Implementation Pattern

```solidity
// Example implementation pattern
contract KYCComplianceHook is IKYCComplianceHook, IComplianceModule {
    IGalileoIdentityRegistry private _identityRegistry;
    uint256[] private _senderTopics;
    uint256[] private _receiverTopics;

    function moduleCheck(
        address _from,
        address _to,
        uint256 _value,
        address _compliance
    ) external view override returns (bool) {
        // Skip sender check for mints (from == address(0))
        if (_from != address(0)) {
            if (!verifySenderEligibility(_from)) {
                return false;
            }
        }

        // Skip receiver check for burns (to == address(0))
        if (_to != address(0)) {
            if (!verifyReceiverEligibility(_to)) {
                return false;
            }
        }

        return true;
    }

    function verifySenderEligibility(address _sender) public view returns (bool) {
        if (_senderTopics.length == 0) return true;

        bool[] memory results = _identityRegistry.batchVerify(_sender, _senderTopics);

        for (uint256 i = 0; i < results.length; i++) {
            if (!results[i]) return false;
        }
        return true;
    }

    function verifyReceiverEligibility(address _receiver) public view returns (bool) {
        if (_receiverTopics.length == 0) return true;

        bool[] memory results = _identityRegistry.batchVerify(_receiver, _receiverTopics);

        for (uint256 i = 0; i < results.length; i++) {
            if (!results[i]) return false;
        }
        return true;
    }
}
```

---

## 8. Error Handling

### 8.1 Error Codes

| Error Code | Name | Description | Resolution |
|------------|------|-------------|------------|
| `0x01` | `SENDER_NOT_VERIFIED` | Sender lacks required KYC claims | Sender must complete KYC |
| `0x02` | `RECEIVER_NOT_VERIFIED` | Receiver lacks required KYC claims | Receiver must complete KYC |
| `0x03` | `CLAIM_EXPIRED` | Required claim has expired | Renew claim with issuer |
| `0x04` | `CLAIM_REVOKED` | Required claim has been revoked | Contact issuer for resolution |
| `0x05` | `CONSENT_NOT_GRANTED` | Cross-brand consent not provided | User must grant consent |
| `0x06` | `ISSUER_NOT_TRUSTED` | Claim issuer not in trusted list | Use claims from trusted issuers |
| `0x07` | `IDENTITY_NOT_REGISTERED` | Address not in identity registry | Register identity first |
| `0x08` | `INSUFFICIENT_KYC_LEVEL` | KYC level too low for transaction | Upgrade to higher KYC level |

### 8.2 Custom Errors (Solidity)

```solidity
/// @notice Thrown when sender fails KYC verification
/// @param sender The sender address
/// @param missingTopic The claim topic that was missing or invalid
error SenderNotVerified(address sender, uint256 missingTopic);

/// @notice Thrown when receiver fails KYC verification
/// @param receiver The receiver address
/// @param missingTopic The claim topic that was missing or invalid
error ReceiverNotVerified(address receiver, uint256 missingTopic);

/// @notice Thrown when a required claim has expired
/// @param holder The claim holder
/// @param topic The expired claim topic
/// @param expiredAt Timestamp when claim expired
error ClaimExpired(address holder, uint256 topic, uint256 expiredAt);

/// @notice Thrown when a required claim has been revoked
/// @param holder The claim holder
/// @param topic The revoked claim topic
error ClaimRevoked(address holder, uint256 topic);

/// @notice Thrown when cross-brand consent is not granted
/// @param user The user whose consent is required
/// @param requestingBrand The brand requesting access
/// @param topic The claim topic requiring consent
error ConsentNotGranted(address user, address requestingBrand, uint256 topic);

/// @notice Thrown when KYC level is insufficient for transaction value
/// @param party The address with insufficient KYC
/// @param required The required KYC level claim topic
/// @param actual The actual KYC level claim topic (0 if none)
error InsufficientKYCLevel(address party, uint256 required, uint256 actual);
```

---

## 9. Travel Rule Compliance

### 9.1 Overview

The Travel Rule (FATF Recommendation 16) requires VASPs to collect and share originator and beneficiary information for transfers. In the EU (TFR 2023/1113), there is no de minimis threshold for CASP-to-CASP transfers.

### 9.2 Data Requirements per TFR

**Originator Data (from sender's ONCHAINID):**
- Full name
- Account number (wallet address)
- Address or national identity number or customer ID or date/place of birth

**Beneficiary Data (from receiver's ONCHAINID):**
- Full name
- Account number (wallet address)

### 9.3 KYC Hook Integration

```solidity
/**
 * @notice Get Travel Rule data from identity claims
 * @param _address The party address
 * @return originatorData Encoded originator/beneficiary data
 */
function getTravelRuleData(address _address)
    external view returns (bytes memory originatorData)
{
    IIdentity identity = identityRegistry.identity(_address);

    // Retrieve KYC claim data
    uint256 kycTopic = GalileoClaimTopics.KYC_BASIC;
    bytes memory claimData = identity.getClaimData(kycTopic);

    // Claim data contains hash and URI for off-chain retrieval
    // (vcHash, vcURI) = abi.decode(claimData, (bytes32, string))
    return claimData;
}
```

### 9.4 Travel Rule Verification Flow

```
1. Pre-Transfer
   |
   +-> Retrieve sender identity from registry
   |     identity(senderAddress) -> IIdentity
   |
   +-> Retrieve receiver identity from registry
   |     identity(receiverAddress) -> IIdentity
   |
   +-> Verify both have KYC claims with Travel Rule data
   |     batchVerify(address, [KYC_BASIC]) -> true
   |
   +-> If high-value (>EUR 10,000):
         - Verify enhanced claims
         - Flag for off-chain Travel Rule message

2. Post-Transfer
   |
   +-> Emit TravelRuleTransfer event with claim references
   |
   +-> Off-chain: Exchange Travel Rule messages (TRISA/OpenVASP)
```

### 9.5 High-Value Transfer Handling

For transfers exceeding EUR 10,000:

```solidity
event HighValueTransfer(
    address indexed from,
    address indexed to,
    uint256 amount,
    bytes32 senderClaimHash,
    bytes32 receiverClaimHash,
    uint256 timestamp
);
```

---

## 10. Verification Flows

### 10.1 Primary Sale Flow

```
Brand                   Retailer                Consumer
  |                         |                       |
  |   [1] Issue Token       |                       |
  |------------------------>|                       |
  |                         |                       |
  |   [2] Verify Retailer   |                       |
  |   has AUTHORIZED_RETAILER                       |
  |------------------------>|                       |
  |                         |                       |
  |                         |   [3] Consumer buys   |
  |                         |<----------------------|
  |                         |                       |
  |                         |   [4] Verify Consumer |
  |                         |   has KYC_BASIC       |
  |                         |---+                   |
  |                         |   |                   |
  |                         |<--+                   |
  |                         |                       |
  |                         |   [5] Transfer Token  |
  |                         |---------------------->|
```

### 10.2 Secondary Sale (Resale) Flow

```
Seller                                              Buyer
  |                                                    |
  |   [1] List item for sale                           |
  |--+                                                 |
  |  |                                                 |
  |<-+                                                 |
  |                                                    |
  |   [2] Buyer initiates purchase                     |
  |<---------------------------------------------------|
  |                                                    |
  |   [3] Pre-transfer KYC checks                      |
  |       - Verify Seller has KYC_BASIC                |
  |       - Verify Buyer has KYC_BASIC                 |
  |       - If >EUR 10,000: verify KYC_ENHANCED        |
  |---+                                                |
  |   |                                                |
  |<--+                                                |
  |                                                    |
  |   [4] CPO Check (if required)                      |
  |       - Verify AUTHENTICITY_VERIFIED claim         |
  |---+                                                |
  |   |                                                |
  |<--+                                                |
  |                                                    |
  |   [5] Transfer Token                               |
  |--------------------------------------------------->|
```

### 10.3 Cross-Border Flow

```
EU Seller                                        US Buyer
   |                                                 |
   |   [1] Initiate transfer                         |
   |<------------------------------------------------|
   |                                                 |
   |   [2] Verify EU Seller claims                   |
   |       - KYC_EU_MIFID required                   |
   |---+                                             |
   |   |                                             |
   |<--+                                             |
   |                                                 |
   |   [3] Verify US Buyer claims                    |
   |       - KYC_US_SEC required                     |
   |---+                                             |
   |   |                                             |
   |<--+                                             |
   |                                                 |
   |   [4] Travel Rule data exchange                 |
   |       (off-chain via TRISA/OpenVASP)            |
   |---+                                             |
   |   |                                             |
   |<--+                                             |
   |                                                 |
   |   [5] Transfer Token                            |
   |------------------------------------------------>|
```

---

## 11. Performance Considerations

### 11.1 Gas Optimization

| Operation | Estimated Gas | Optimization |
|-----------|---------------|--------------|
| Single isVerified() | ~25,000 | Use when only one claim needed |
| batchVerify() 2 topics | ~35,000 | Preferred for multi-claim checks |
| batchVerify() 5 topics | ~55,000 | Marginal increase per topic |
| isVerifiedWithConsent() | ~40,000 | Includes consent SLOAD |

### 11.2 Caching Strategy

For compliance modules, claim verification results can be cached:

```solidity
// Cache verification results with TTL
mapping(address => mapping(uint256 => VerificationCache)) private _cache;

struct VerificationCache {
    bool verified;
    uint64 cachedAt;
    uint64 validUntil;
}

uint64 constant CACHE_TTL = 5 minutes; // Short TTL for compliance
```

### 11.3 Batch Operations

For bulk transfers (e.g., batch minting to retailers):

```solidity
function batchVerifyAddresses(
    address[] calldata _addresses,
    uint256[] calldata _topics
) external view returns (bool[] memory results) {
    results = new bool[](_addresses.length);
    for (uint256 i = 0; i < _addresses.length; i++) {
        bool[] memory topicResults = identityRegistry.batchVerify(_addresses[i], _topics);
        results[i] = _allTrue(topicResults);
    }
}
```

---

## 12. Security Considerations

### 12.1 Trust Model

- **Trusted Issuers**: Only claims from issuers in the Trusted Issuers Registry are valid
- **Claim Expiry**: Claims have mandatory expiry; expired claims are rejected
- **Revocation**: Issuers can revoke claims; revoked claims are rejected
- **Consent**: Cross-brand verification requires explicit user consent

### 12.2 Attack Vectors

| Attack | Mitigation |
|--------|------------|
| Claim forgery | Claims are signed by trusted issuers; signature verification on-chain |
| Expired claim use | Expiry checked on every verification |
| Revoked claim use | Status lists checked via on-chain or off-chain verification |
| Identity theft | Liveness check required for KYC claims |
| Sybil attack | Each identity bound to verified real-world identity |

### 12.3 Fail-Safe Defaults

- If identity registry is unreachable: **BLOCK** transfer
- If claim data is malformed: **BLOCK** transfer
- If issuer status unknown: **BLOCK** transfer
- If claim expiry unclear: **BLOCK** transfer

---

## 13. Integration Checklist

### 13.1 Pre-Deployment

- [ ] IGalileoIdentityRegistry deployed and configured
- [ ] Claim Topics Registry populated with KYC/KYB topics
- [ ] Trusted Issuers Registry configured with KYC providers
- [ ] KYC compliance module deployed and bound to token compliance

### 13.2 Runtime Verification

- [ ] All parties have registered identities
- [ ] Required claims issued by trusted issuers
- [ ] Claims not expired
- [ ] Claims not revoked
- [ ] Cross-brand consent granted (if applicable)

---

## References

- **Phase 4 Identity Specification**: `specifications/contracts/identity/IIdentityRegistry.sol`
- **Claim Topics Specification**: `specifications/contracts/identity/IClaimTopicsRegistry.sol`
- **ERC-3643 Standard**: https://eips.ethereum.org/EIPS/eip-3643
- **MiCA TFR**: Regulation (EU) 2023/1113
- **FATF Travel Rule**: Recommendation 16

---

*Specification: GSPEC-COMPLIANCE-002*
*Phase: 05-token-compliance*
