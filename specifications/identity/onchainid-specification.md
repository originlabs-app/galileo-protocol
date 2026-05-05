# ONCHAINID Specification for Galileo

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-IDENTITY-005

---

## Table of Contents

1. [Overview](#1-overview)
2. [Key Management (ERC-734)](#2-key-management-erc-734)
3. [Claims Management (ERC-735)](#3-claims-management-erc-735)
4. [Galileo Identity Extension](#4-galileo-identity-extension)
5. [Factory Deployment](#5-factory-deployment)
6. [Participant Types](#6-participant-types)
7. [Recovery (v2 Scope)](#7-recovery-v2-scope)

---

## 1. Overview

### 1.1 Purpose

ONCHAINID is the identity contract standard for Galileo participants. Based on ERC-734 (key management) and ERC-735 (claims management), it provides a persistent, self-sovereign identity layer that enables compliant participation in the luxury goods ecosystem.

### 1.2 Key Capabilities

| Capability | Description |
|------------|-------------|
| **Persistent Identity** | Identity not tied to wallet addresses; survives key rotation |
| **Key Rotation** | Add/remove/rotate keys without losing claims or history |
| **Cross-Chain Consistency** | Deterministic addresses via CREATE2 deployment |
| **Consent-Based Sharing** | GDPR-compliant consent mechanism for claim access |
| **Multi-Signature Support** | MANAGEMENT keys can require multi-sig at identity level |

### 1.3 Design Principles

1. **Identity != Wallet**: ONCHAINID contracts ARE the identity; wallet addresses are just keys
2. **Claims are Attestations**: Claims reference off-chain content, never store PII on-chain
3. **Key Rotation Preserves History**: Rotating keys does NOT invalidate historical claims
4. **Consent is Explicit**: Cross-brand data sharing requires on-chain consent grants

### 1.4 Related Standards

| Standard | Relationship |
|----------|--------------|
| ERC-734 | Key management foundation |
| ERC-735 | Claims management foundation |
| ERC-3643 | T-REX compliant security token standard |
| W3C VC 2.0 | Off-chain claim content format |
| did:galileo | DID method for identity resolution |

---

## 2. Key Management (ERC-734)

### 2.1 Key Purposes

Keys in ONCHAINID have specific purposes that determine what operations they can authorize:

| Purpose | Value | Description | Who Typically Holds |
|---------|-------|-------------|---------------------|
| MANAGEMENT | 1 | Add/remove keys, recover identity, set participant type | Owner, designated guardians |
| ACTION | 2 | Sign transactions, execute calls on behalf of identity | Owner, authorized delegates |
| CLAIM | 3 | Issue claims to this identity (held by external issuers) | Trusted issuers only |
| ENCRYPTION | 4 | Encrypt data destined for this identity | Messaging services, secure channels |

**Purpose Assignment Rules:**

- Every identity MUST have at least one MANAGEMENT key
- ACTION keys allow transaction execution without MANAGEMENT authority
- CLAIM keys are granted to external parties (issuers) to add claims
- ENCRYPTION keys enable secure communication channels

### 2.2 Key Types

Keys are stored as `bytes32` values computed from the key material:

```solidity
// Key type constants
uint256 constant ECDSA = 1;        // keccak256(abi.encodePacked(address))
uint256 constant RSA = 2;          // Reserved for RSA keys
uint256 constant ML_DSA = 3;       // Future: ML-DSA post-quantum keys

// Computing key hash for ECDSA
bytes32 keyHash = keccak256(abi.encodePacked(walletAddress));
```

**Key Type Support Timeline:**

| Timeline | Key Type | Status | Notes |
|----------|----------|--------|-------|
| 2026 (Now) | ECDSA (type=1) | Production | secp256k1 standard |
| 2027-2029 | ML-DSA (type=3) | Hybrid | Per crypto-agility.md Phase 2 |
| 2030+ | ML-DSA | Primary | Classical keys deprecated |

**Important:** Key rotation NEVER invalidates historical claims. Claims signed by keys that have since been rotated remain valid because:
- The claim signature is permanent record of attestation at time of issuance
- Verification checks issuer validity at claim issuance time
- Revocation (not key rotation) is the mechanism for claim invalidation

### 2.3 Key Lifecycle

#### addKey

```solidity
/**
 * @notice Adds a key to the identity
 * @param _key The key hash (keccak256 of address for ECDSA)
 * @param _purpose The purpose (1=MANAGEMENT, 2=ACTION, 3=CLAIM, 4=ENCRYPTION)
 * @param _keyType The key type (1=ECDSA, 2=RSA, 3=ML_DSA)
 * @return success True if key was added
 *
 * Requirements:
 * - Caller must have MANAGEMENT key
 * - Key must not already exist with same purpose
 *
 * Emits KeyAdded event
 */
function addKey(
    bytes32 _key,
    uint256 _purpose,
    uint256 _keyType
) external returns (bool success);
```

**Event:**

```solidity
event KeyAdded(
    bytes32 indexed key,
    uint256 indexed purpose,
    uint256 indexed keyType
);
```

#### removeKey

```solidity
/**
 * @notice Removes a key from the identity
 * @param _key The key hash to remove
 * @param _purpose The purpose to remove (key may have multiple purposes)
 * @return success True if key was removed
 *
 * Requirements:
 * - Caller must have MANAGEMENT key
 * - Cannot remove the last MANAGEMENT key (prevents lockout)
 *
 * Important: Historical claims remain valid after key removal
 *
 * Emits KeyRemoved event
 */
function removeKey(
    bytes32 _key,
    uint256 _purpose
) external returns (bool success);
```

**Event:**

```solidity
event KeyRemoved(
    bytes32 indexed key,
    uint256 indexed purpose,
    uint256 indexed keyType
);
```

#### keyHasPurpose

```solidity
/**
 * @notice Checks if a key has a specific purpose
 * @param _key The key hash to check
 * @param _purpose The purpose to verify
 * @return exists True if key exists with the specified purpose
 *
 * Note: This is a view function used by verification contracts
 */
function keyHasPurpose(
    bytes32 _key,
    uint256 _purpose
) external view returns (bool exists);
```

#### getKey

```solidity
/**
 * @notice Retrieves key details
 * @param _key The key hash
 * @return purposes Array of purposes this key has
 * @return keyType The type of key (ECDSA, RSA, ML_DSA)
 * @return key The key hash itself
 */
function getKey(bytes32 _key) external view returns (
    uint256[] memory purposes,
    uint256 keyType,
    bytes32 key
);
```

---

## 3. Claims Management (ERC-735)

### 3.1 Claim Structure

Claims are on-chain attestations that reference off-chain Verifiable Credentials:

```solidity
struct Claim {
    uint256 topic;      // keccak256 of namespace string (e.g., "galileo.kyc.basic")
    uint256 scheme;     // Signature scheme: 1=ECDSA, 2=RSA, 3=ML_DSA (future)
    address issuer;     // ClaimIssuer contract address (NOT EOA)
    bytes signature;    // Issuer's signature over claim digest
    bytes data;         // Encoded claim hash + URI (never raw content)
    string uri;         // Pointer to off-chain Verifiable Credential
}
```

**Field Details:**

| Field | Description | Constraints |
|-------|-------------|-------------|
| `topic` | Claim type identifier | `uint256(keccak256(bytes(namespace)))` |
| `scheme` | Signature algorithm | Must match issuer's current key type |
| `issuer` | ClaimIssuer contract | Must be in TrustedIssuersRegistry |
| `signature` | Cryptographic proof | Covers identity + topic + data |
| `data` | Hash + URI reference | ABI-encoded, never PII |
| `uri` | Off-chain location | HTTPS or IPFS URI to VC |

### 3.2 Claim Data Encoding

**Critical:** The `data` field contains encoded references, never raw PII. This ensures GDPR compliance per hybrid-architecture.md.

```solidity
// Claim data encoding
bytes memory claimData = abi.encode(
    keccak256(canonicalVCJson),  // Content hash of canonical VC (RFC 8785 JCS)
    vcURI                         // "https://vc.galileoprotocol.io/credentials/{id}"
);
```

**Canonicalization Requirements (RFC 8785 JCS):**

1. Sort object keys alphabetically (recursive)
2. Remove insignificant whitespace
3. Use consistent number formatting (no trailing zeros)
4. UTF-8 NFC normalization

**Why Hash + URI:**

| Component | Purpose |
|-----------|---------|
| Content Hash | Integrity verification - proves VC wasn't modified |
| URI | Retrieval location - where to fetch the VC |

### 3.3 Signature Computation

The issuer creates a signature over a deterministic digest:

```solidity
// Step 1: Compute the claim digest
bytes32 digest = keccak256(abi.encode(
    identityAddress,    // ONCHAINID contract address receiving the claim
    claimTopic,         // uint256 topic ID from namespace
    claimData           // bytes encoded hash + URI
));

// Step 2: Sign the digest with issuer's key
// Using EIP-191 personal sign or EIP-712 typed data
bytes memory signature = sign(digest, issuerPrivateKey);
```

**Verification Flow:**

```solidity
function verifyClaimSignature(
    address identity,
    uint256 topic,
    bytes memory data,
    bytes memory signature,
    address issuer
) internal view returns (bool) {
    // Reconstruct digest
    bytes32 digest = keccak256(abi.encode(identity, topic, data));

    // Recover signer
    address signer = ECDSA.recover(
        keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)),
        signature
    );

    // Verify signer has CLAIM purpose on issuer identity
    IClaimIssuer issuerContract = IClaimIssuer(issuer);
    bytes32 signerKey = keccak256(abi.encodePacked(signer));

    return issuerContract.keyHasPurpose(signerKey, 3); // CLAIM purpose
}
```

### 3.4 Claim Lifecycle

#### addClaim

```solidity
/**
 * @notice Adds a claim to this identity
 * @param _topic Claim topic ID (keccak256 of namespace)
 * @param _scheme Signature scheme (1=ECDSA)
 * @param _issuer ClaimIssuer contract address
 * @param _signature Issuer signature over claim
 * @param _data Encoded content hash + URI
 * @param _uri Off-chain VC location
 * @return claimRequestId Unique identifier for this claim
 *
 * Requirements:
 * - Caller must be MANAGEMENT key OR issuer with CLAIM purpose
 * - Issuer must be in TrustedIssuersRegistry
 * - Issuer must be authorized for this topic (per ClaimTopicsRegistry)
 * - Signature must be valid
 *
 * Emits ClaimAdded event
 */
function addClaim(
    uint256 _topic,
    uint256 _scheme,
    address _issuer,
    bytes calldata _signature,
    bytes calldata _data,
    string calldata _uri
) external returns (bytes32 claimRequestId);
```

**Claim ID Computation:**

```solidity
bytes32 claimId = keccak256(abi.encode(issuer, topic));
```

**Event:**

```solidity
event ClaimAdded(
    bytes32 indexed claimId,
    uint256 indexed topic,
    uint256 scheme,
    address indexed issuer,
    bytes signature,
    bytes data,
    string uri
);
```

#### removeClaim

```solidity
/**
 * @notice Removes a claim from this identity
 * @param _claimId The claim identifier to remove
 * @return success True if claim was removed
 *
 * Requirements:
 * - Caller must be MANAGEMENT key OR original issuer
 *
 * Note: Removal triggers off-chain BitstringStatusList update
 *       (issuer responsibility to update status list)
 *
 * Emits ClaimRemoved event
 */
function removeClaim(bytes32 _claimId) external returns (bool success);
```

**Event:**

```solidity
event ClaimRemoved(
    bytes32 indexed claimId,
    uint256 indexed topic,
    uint256 scheme,
    address indexed issuer,
    bytes signature,
    bytes data,
    string uri
);
```

#### getClaim

```solidity
/**
 * @notice Retrieves a claim by ID
 * @param _claimId The claim identifier
 * @return topic Claim topic ID
 * @return scheme Signature scheme
 * @return issuer ClaimIssuer address
 * @return signature Issuer signature
 * @return data Encoded content hash + URI
 * @return uri Off-chain location
 */
function getClaim(bytes32 _claimId) external view returns (
    uint256 topic,
    uint256 scheme,
    address issuer,
    bytes memory signature,
    bytes memory data,
    string memory uri
);
```

#### getClaimIdsByTopic

```solidity
/**
 * @notice Returns all claim IDs for a given topic
 * @param _topic The topic to query
 * @return claimIds Array of claim IDs for this topic
 *
 * Note: An identity may have multiple claims for the same topic
 *       (e.g., KYC from different issuers, or renewals)
 */
function getClaimIdsByTopic(uint256 _topic) external view returns (bytes32[] memory claimIds);
```

---

## 4. Galileo Identity Extension

### 4.1 IGalileoIdentity Interface

The Galileo extension adds consent management and participant typing to standard ONCHAINID:

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@onchain-id/solidity/contracts/interface/IIdentity.sol";

/**
 * @title IGalileoIdentity
 * @notice Extended identity interface for Galileo Luxury Standard
 * @dev Adds consent management and participant type to ERC-734/735 identity
 */
interface IGalileoIdentity is IIdentity {

    // ═══════════════════════════════════════════════════════════════════════
    // CONSENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when consent is granted to a brand
     * @param brand The brand's Identity Registry address
     * @param topic The claim topic consent covers
     * @param expiry When consent expires (0 = no expiry)
     */
    event ConsentGranted(
        address indexed brand,
        uint256 indexed topic,
        uint256 expiry
    );

    /**
     * @notice Emitted when consent is revoked from a brand
     * @param brand The brand's Identity Registry address
     * @param topic The claim topic consent covered
     */
    event ConsentRevoked(
        address indexed brand,
        uint256 indexed topic
    );

    /**
     * @notice Checks if consent exists for brand to access topic
     * @param brand The brand's Identity Registry address
     * @param topic The claim topic to check
     * @return valid True if consent exists and is not expired
     */
    function hasConsent(
        address brand,
        uint256 topic
    ) external view returns (bool valid);

    /**
     * @notice Grants consent for a brand to access specific claim topic
     * @param brand The brand's Identity Registry address
     * @param topic The claim topic to grant access to
     * @param expiry When consent expires (0 = no expiry, use with caution)
     *
     * Requirements:
     * - Caller must have MANAGEMENT key
     * - Brand must be a valid Identity Registry
     * - Topic must exist in ClaimTopicsRegistry
     */
    function grantConsent(
        address brand,
        uint256 topic,
        uint256 expiry
    ) external;

    /**
     * @notice Revokes previously granted consent
     * @param brand The brand's Identity Registry address
     * @param topic The claim topic to revoke access from
     *
     * Requirements:
     * - Caller must have MANAGEMENT key
     * - Consent must exist
     */
    function revokeConsent(
        address brand,
        uint256 topic
    ) external;

    /**
     * @notice Returns all active consents for this identity
     * @return consents Array of Consent structs
     */
    function getConsents() external view returns (Consent[] memory consents);

    // ═══════════════════════════════════════════════════════════════════════
    // PARTICIPANT TYPE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Participant type within the Galileo ecosystem
     * @dev Service-center and authenticator roles are conveyed via claim
     *      topics (galileoprotocol.io.service_center, galileoprotocol.io.authenticator),
     *      not via ParticipantType enum.
     */
    enum ParticipantType {
        INDIVIDUAL,   // Individual consumer or collector
        BRAND,        // Luxury brand (can issue product tokens)
        RETAILER,     // Authorized retail partner
        ISSUER,       // Claim issuer (KYC provider, authentication lab)
        VERIFIER      // Regulatory body or audit service
    }

    /**
     * @notice Returns the participant type for this identity
     * @return participantType The type of participant
     */
    function getParticipantType() external view returns (ParticipantType participantType);

    /**
     * @notice Sets the participant type for this identity
     * @param _type The participant type to set
     *
     * Requirements:
     * - Caller must have MANAGEMENT key
     * - Type transition must be valid (see transition rules)
     */
    function setParticipantType(ParticipantType _type) external;
}
```

### 4.2 Consent Structure

```solidity
/**
 * @title Consent
 * @notice Represents granted consent for claim topic access
 */
struct Consent {
    address brand;      // Brand's Identity Registry address
    uint256 topic;      // Claim topic consent applies to
    uint256 grantedAt;  // Block timestamp when consent was granted
    uint256 expiresAt;  // Block timestamp when consent expires (0 = no expiry)
}
```

**Consent Validation:**

```solidity
function isConsentValid(Consent memory consent) internal view returns (bool) {
    if (consent.grantedAt == 0) return false;  // Never granted
    if (consent.expiresAt == 0) return true;   // No expiry
    return block.timestamp < consent.expiresAt;
}
```

### 4.3 Consent Use Cases

| Scenario | Brand | Topic | Purpose |
|----------|-------|-------|---------|
| CPO verification | Secondary market | `galileo.kyc.basic` | Verify buyer KYC for resale |
| Service booking | Original brand | `galileo.kyc.basic` | Book repair appointment |
| Insurance claim | Insurance provider | `galileo.heritage.authenticity_verified` | Process claim |
| Auction participation | Auction house | `galileo.kyc.enhanced` | Enable bidding |

### 4.4 Consent Best Practices

1. **Time-bound Consent**: Always set expiry unless ongoing relationship
2. **Topic Specificity**: Grant consent per-topic, not blanket access
3. **Regular Review**: Users should review and prune stale consents
4. **Revocation**: Revoke immediately when relationship ends

---

## 5. Factory Deployment

### 5.1 CREATE2 for Cross-Chain Consistency

ONCHAINID contracts are deployed using CREATE2 to ensure the same identity has the same address on all supported chains:

```solidity
/**
 * @title IdFactory
 * @notice Factory for deploying ONCHAINID contracts with deterministic addresses
 */
interface IIdFactory {
    /**
     * @notice Deploys a new identity contract
     * @param owner Initial MANAGEMENT key holder address
     * @param salt Deterministic salt for CREATE2
     * @return identity Address of deployed identity contract
     *
     * Note: Same salt + same factory bytecode = same address on any EVM chain
     */
    function createIdentity(
        address owner,
        bytes32 salt
    ) external returns (address identity);

    /**
     * @notice Computes the address that would result from CREATE2
     * @param owner Initial owner address
     * @param salt Deployment salt
     * @return predicted Predicted identity address
     */
    function computeAddress(
        address owner,
        bytes32 salt
    ) external view returns (address predicted);
}
```

### 5.2 Salt Derivation

For consistent cross-chain identity addresses, derive salt from the user's DID:

```solidity
// Salt derivation from user DID
bytes32 salt = keccak256(abi.encodePacked(
    "galileo.identity.v1",      // Version prefix
    userDID                      // e.g., "did:galileo:artisan:alice"
));

// Deploy identity
address identity = factory.createIdentity(initialOwner, salt);
```

**Salt Components:**

| Component | Purpose |
|-----------|---------|
| Version prefix | Enables future schema changes |
| User DID | Unique identifier for the entity |

### 5.3 Factory Requirements

For true cross-chain address consistency:

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| Same factory address | Deploy factory to identical address on all chains | CREATE2 includes deployer in address calculation |
| Same deployer | Use same EOA or CREATE2 factory-of-factories | Deployer address affects factory address |
| Same bytecode | Factory contract bytecode must be identical | Bytecode hash is CREATE2 input |
| Same salt | Salt must be identical for same identity | Salt determines final address |

### 5.4 Multi-Chain Deployment Flow

```
CROSS-CHAIN IDENTITY DEPLOYMENT

1. User requests identity on Chain A (primary)
   └─> Factory.createIdentity(owner, salt)
   └─> Identity deployed at address 0x1234...

2. User requests identity on Chain B (secondary)
   └─> Factory.createIdentity(owner, salt)  // Same parameters
   └─> Identity deployed at address 0x1234... // Same address!

3. Verification
   └─> Both chains: identity.keyHasPurpose(ownerKey, MANAGEMENT) = true
   └─> DID resolver can use same address on any chain
```

---

## 6. Participant Types

### 6.1 Participant Type Configuration

| Type | Key Configuration | Typical Claims Held | Typical Claims Issued |
|------|-------------------|---------------------|----------------------|
| INDIVIDUAL | Single MANAGEMENT key, optional guardian | `galileo.kyc.basic`, `galileo.kyc.enhanced` | None |
| BRAND | Multi-sig MANAGEMENT, separate ACTION keys | `galileo.kyb.verified`, internal brand claims | `galileoprotocol.io.authorized_retailer`, `galileoprotocol.io.service_center` |
| RETAILER | Brand-delegated ACTION key | `galileoprotocol.io.authorized_retailer` | None (receives, doesn't issue) |
| ISSUER | Lab/KYC provider MANAGEMENT | `galileo.kyb.verified`, accreditation claims | `galileo.kyc.*`, `galileo.heritage.*` |
| VERIFIER | Regulator or audit body | Regulatory authorization | `galileoprotocol.io.authenticator`, `galileoprotocol.io.auction_house` |

### 6.2 Type-Specific Behaviors

**INDIVIDUAL:**
- Simplified key management (single MANAGEMENT key default)
- Consent mechanism for data sharing
- Can hold product tokens
- Cannot issue claims to others

**BRAND:**
- Multi-signature MANAGEMENT recommended
- Separate ACTION keys for different departments
- Can mint product tokens
- Can issue authorization claims to retailers/service centers
- Subject to KYB verification

**RETAILER:**
- Operates under brand delegation
- ACTION keys granted by authorizing brand
- Cannot issue claims
- Authorization verified via `galileoprotocol.io.authorized_retailer` claim

**ISSUER:**
- Registered in TrustedIssuersRegistry
- CLAIM purpose keys used to sign attestations
- Must maintain accreditation
- Subject to granular topic authorization

**VERIFIER:**
- Read-only access pattern
- May issue regulatory attestations
- Often represents government bodies or industry associations

### 6.3 Role vs Participant Type

**Important Distinction:**

Service-center and authenticator roles are NOT ParticipantType values. They are conveyed via claim topics:

| Role | ParticipantType | Claim Topic |
|------|----------------|-------------|
| Service Center | RETAILER or BRAND | `galileoprotocol.io.service_center` |
| Authenticator | ISSUER | `galileoprotocol.io.authenticator` |
| Auction House | RETAILER | `galileoprotocol.io.auction_house` |

This design allows:
- A RETAILER to also be an authorized service center (has both claims)
- An ISSUER to authenticate for multiple brands (multiple claims)
- Role changes without identity type change

---

## 7. Recovery (v2 Scope)

### 7.1 Current Specification (v1)

For v1, identity recovery relies on secure key management:

| Approach | Description | Recommendation |
|----------|-------------|----------------|
| Single MANAGEMENT Key | One key controls identity | Secure backup required |
| Hardware Wallet | MANAGEMENT key in Ledger/Trezor | Recommended for all |
| Multi-Sig | Multiple keys required for MANAGEMENT | Recommended for BRAND |

**v1 Best Practices:**

1. Store MANAGEMENT key seed phrase in multiple secure locations
2. Use hardware wallet for MANAGEMENT key
3. Separate ACTION keys from MANAGEMENT (ACTION can be software wallet)
4. Regularly verify backup recovery works

### 7.2 Social Recovery (v2, AA-04)

Social recovery is deferred to v2 per requirement AA-04 (Account Abstraction):

```solidity
// v2 Preview: Social Recovery Interface (not implemented in v1)
interface ISocialRecovery {
    /**
     * @notice Initiates recovery by guardian quorum
     * @param newManagementKey The new MANAGEMENT key
     * @param guardianSignatures Array of guardian approvals
     *
     * Requirements (v2):
     * - Minimum quorum of guardians must approve (e.g., 3 of 5)
     * - Time delay before execution (e.g., 48 hours)
     * - Notification to current MANAGEMENT key
     */
    function initiateRecovery(
        bytes32 newManagementKey,
        bytes[] calldata guardianSignatures
    ) external;

    /**
     * @notice Executes recovery after time delay
     */
    function executeRecovery() external;

    /**
     * @notice Cancels pending recovery (by current MANAGEMENT)
     */
    function cancelRecovery() external;
}
```

**v2 Recovery Features (Planned):**

| Feature | Description |
|---------|-------------|
| Guardian Assignment | Designate trusted addresses as recovery guardians |
| Quorum Threshold | M-of-N guardians required (e.g., 3 of 5) |
| Time Delay | 24-72 hour delay before recovery executes |
| Notification | Alert current owner of pending recovery |
| Cancellation | Current owner can cancel during delay |

---

## Appendix A: Claim Topic Reference

For complete claim topic definitions, see `specifications/identity/claim-topics.md`.

Quick reference for common topics:

| Namespace | Topic ID | Classification |
|-----------|----------|----------------|
| `galileo.kyc.basic` | `0xd89b93fa...` | Compliance (365d) |
| `galileo.kyc.enhanced` | `0xa1fecd52...` | Compliance (365d) |
| `galileo.kyb.verified` | `0x1dd51298...` | Compliance (365d) |
| `galileoprotocol.io.authorized_retailer` | `0xfc1ed254...` | Compliance (365d) |
| `galileoprotocol.io.service_center` | `0x10830870...` | Compliance (365d) |
| `galileoprotocol.io.authenticator` | `0xda684ab8...` | Compliance (365d) |
| `galileo.heritage.origin_certified` | `0x1e1c32d6...` | Heritage (permanent) |
| `galileo.heritage.authenticity_verified` | `0x4fc95faf...` | Heritage (permanent) |

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [claim-topics.md](./claim-topics.md) | Predefined claim topic definitions |
| [verifiable-credentials.md](./verifiable-credentials.md) | W3C VC 2.0 off-chain claim format |
| [DID-METHOD.md](./DID-METHOD.md) | DID resolution for identities |
| [hybrid-architecture.md](../architecture/hybrid-architecture.md) | On-chain/off-chain data boundary |
| [crypto-agility.md](../crypto/crypto-agility.md) | Post-quantum key migration |

---

*Galileo Luxury Standard - Identity Layer*
*Specification: GSPEC-IDENTITY-005*
*Classification: Public*
