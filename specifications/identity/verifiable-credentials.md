# W3C Verifiable Credentials Specification for Galileo

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-IDENTITY-006

---

## Table of Contents

1. [Overview](#1-overview)
2. [W3C VC 2.0 Alignment](#2-w3c-vc-20-alignment)
3. [Galileo Credential Types](#3-galileo-credential-types)
4. [On-Chain Hash Anchoring](#4-on-chain-hash-anchoring)
5. [BitstringStatusList Integration](#5-bitstringststatuslist-integration)
6. [Off-Chain Storage](#6-off-chain-storage)
7. [Proof Types](#7-proof-types)

---

## 1. Overview

### 1.1 Purpose

Galileo uses W3C Verifiable Credentials Data Model 2.0 for off-chain claim storage. Only cryptographic hashes are stored on-chain (in ONCHAINID claim `data` field), preserving privacy while enabling verification. This architecture ensures GDPR compliance (no PII on blockchain) while maintaining the integrity guarantees of blockchain verification.

### 1.2 Architecture Principle

```
CREDENTIAL ARCHITECTURE

+------------------------+          +------------------------+
|      ON-CHAIN          |          |      OFF-CHAIN         |
|      (ONCHAINID)       |          |      (VC Storage)      |
+------------------------+          +------------------------+
| - Content hash         |  ----->  | - Full VC JSON         |
| - Issuer address       |  verify  | - Subject PII          |
| - Topic ID             |          | - Proof signatures     |
| - Scheme               |          | - Supporting evidence  |
+------------------------+          +------------------------+
         |                                    |
         |                                    |
         v                                    v
  Immutable reference             Erasable per GDPR Art. 17
  Tamper-evident                  Privacy-preserving
```

### 1.3 Key Benefits

| Benefit | Description |
|---------|-------------|
| **GDPR Compliance** | No PII on blockchain; off-chain content erasable |
| **Integrity** | On-chain hash proves VC wasn't modified |
| **Interoperability** | W3C standard enables cross-system verification |
| **Selective Disclosure** | Future BBS+ support per v2 roadmap |
| **Revocation** | BitstringStatusList enables efficient revocation |

### 1.4 Regulatory Alignment

Per EDPB Guidelines 02/2025 and hybrid-architecture.md:

- **On-chain:** Only content hash + URI reference (no PII)
- **Off-chain:** Full VC with subject information (erasable)
- **Hash orphaning:** Deleting off-chain content makes hash meaningless

---

## 2. W3C VC 2.0 Alignment

### 2.1 Specification Reference

This specification aligns with **W3C Verifiable Credentials Data Model v2.0** (May 2025 W3C Recommendation):

- https://www.w3.org/TR/vc-data-model-2.0/

### 2.2 Required @context

All Galileo Verifiable Credentials MUST include both the W3C and Galileo contexts:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/contexts/galileo.jsonld"
  ]
}
```

**Context Order:**

1. W3C context MUST be first (base vocabulary)
2. Galileo context MUST be second (domain extensions)
3. Additional contexts MAY follow (e.g., Schema.org)

### 2.3 Required Properties

Per W3C VC 2.0, all Galileo credentials MUST include:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `@context` | Array | Yes | Context array (see above) |
| `type` | Array | Yes | Must include "VerifiableCredential" |
| `issuer` | String or Object | Yes | DID of issuing entity |
| `validFrom` | DateTime | Yes | When credential becomes valid |
| `credentialSubject` | Object | Yes | Claims about the subject |
| `proof` | Object | Yes | Cryptographic proof |

**Optional but Recommended:**

| Property | Type | Purpose |
|----------|------|---------|
| `validUntil` | DateTime | Credential expiry |
| `credentialStatus` | Object | Revocation/suspension status |
| `id` | URI | Unique credential identifier |

### 2.4 Galileo-Specific Requirements

| Requirement | Specification |
|-------------|---------------|
| Issuer DID | Must be `did:galileo:*` format |
| Subject DID | Must be `did:galileo:*` format |
| Galileo Properties | Must use `galileo:` prefix |
| Status List | Must use BitstringStatusList for revocable credentials |

---

## 3. Galileo Credential Types

### 3.1 GalileoKYCCredential

For compliance claims (KYC/KYB verification). These credentials have expiry dates and require periodic renewal.

**Subject DID Format:** Individual participants use `did:galileo:artisan:anon-{hash}` format. Note: Until a dedicated customer entity type is added, individual participants use the existing artisan type with anonymized identifiers.

**Full Example:**

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/contexts/galileo.jsonld"
  ],
  "id": "https://vc.galileoprotocol.io/credentials/kyc/2026/abc123",
  "type": ["VerifiableCredential", "GalileoKYCCredential"],
  "issuer": {
    "id": "did:galileo:issuer:onfido",
    "name": "Onfido KYC Services"
  },
  "validFrom": "2026-01-31T00:00:00Z",
  "validUntil": "2027-01-31T00:00:00Z",
  "credentialSubject": {
    "id": "did:galileo:artisan:anon-a1b2c3d4e5f6",
    "galileo:kycLevel": "enhanced",
    "galileo:jurisdiction": "EU",
    "galileo:verificationDate": "2026-01-30",
    "galileo:verificationMethod": "document_and_biometric"
  },
  "credentialStatus": {
    "id": "https://status.galileoprotocol.io/credentials/1#94567",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "94567",
    "statusListCredential": "https://status.galileoprotocol.io/credentials/1"
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-31T00:00:00Z",
    "verificationMethod": "did:galileo:issuer:onfido#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3FXQjecWufY46yg7irDpXEeGpPJbzS4LCCjjJK6W..."
  }
}
```

**Required Subject Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | DID | Subject's Galileo DID |
| `galileo:kycLevel` | Enum | "basic" or "enhanced" |
| `galileo:jurisdiction` | String | ISO 3166-1 alpha-2 country code |

**Optional Subject Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `galileo:verificationDate` | Date | When verification was performed |
| `galileo:verificationMethod` | String | Method used (document_only, biometric, document_and_biometric) |

### 3.2 GalileoLuxuryCredential

For luxury-specific authorization claims (retailer certification, service center authorization, authenticator accreditation).

**Subject DID Format:** Uses entity DIDs like `did:galileo:retailer:*`, `did:galileo:brand:*`, `did:galileo:issuer:*`

**Full Example (Authorized Retailer):**

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/contexts/galileo.jsonld"
  ],
  "id": "https://vc.galileoprotocol.io/credentials/luxury/2026/ret-456",
  "type": ["VerifiableCredential", "GalileoLuxuryCredential"],
  "issuer": {
    "id": "did:galileo:brand:hermes",
    "name": "Hermes International"
  },
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2027-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:galileo:retailer:24sevres",
    "galileo:credentialType": "authorized_retailer",
    "galileo:brandAuthorization": "did:galileo:brand:hermes",
    "galileo:territory": ["FR", "BE", "LU"],
    "galileo:categories": ["leather_goods", "ready_to_wear", "accessories"],
    "galileo:authorizedSince": "2018-03-15"
  },
  "credentialStatus": {
    "id": "https://status.galileoprotocol.io/credentials/2#12345",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "12345",
    "statusListCredential": "https://status.galileoprotocol.io/credentials/2"
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-01T00:00:00Z",
    "verificationMethod": "did:galileo:brand:hermes#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z4jArnPwJx5v9Db8M5PzKs7nVJxPJVqW9dZLmr1..."
  }
}
```

**Full Example (Service Center):**

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/contexts/galileo.jsonld"
  ],
  "id": "https://vc.galileoprotocol.io/credentials/luxury/2026/svc-789",
  "type": ["VerifiableCredential", "GalileoLuxuryCredential"],
  "issuer": {
    "id": "did:galileo:brand:rolex",
    "name": "Rolex SA"
  },
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2027-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:galileo:retailer:watchbox-service",
    "galileo:credentialType": "service_center",
    "galileo:brandAuthorization": "did:galileo:brand:rolex",
    "galileo:serviceTypes": ["routine_maintenance", "complete_service", "restoration"],
    "galileo:certifiedTechnicians": 12,
    "galileo:facilityInspectionDate": "2025-11-15"
  },
  "credentialStatus": {
    "id": "https://status.galileoprotocol.io/credentials/2#23456",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "23456",
    "statusListCredential": "https://status.galileoprotocol.io/credentials/2"
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-01T00:00:00Z",
    "verificationMethod": "did:galileo:brand:rolex#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58Kj2pLwE3vN9r7Hc1mXq4sFyGb6tUdA8wZ..."
  }
}
```

**Required Subject Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | DID | Subject's Galileo DID |
| `galileo:credentialType` | Enum | Type of authorization |
| `galileo:brandAuthorization` | DID | Authorizing brand's DID |

**Credential Type Values:**

| Value | Description |
|-------|-------------|
| `authorized_retailer` | Licensed retail partner |
| `service_center` | Authorized repair facility |
| `authenticator` | Third-party authentication service |
| `auction_house` | Authorized auction house |

### 3.3 GalileoHeritageCredential

For permanent heritage claims (origin certification, authenticity verification). These credentials do NOT expire but can be revoked if fraud is discovered.

**Subject DID Format:** Uses product DIDs in GS1 format: `did:galileo:01:{gtin}:21:{serial}`

**Full Example (Authenticity Verification):**

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/contexts/galileo.jsonld"
  ],
  "id": "https://vc.galileoprotocol.io/credentials/heritage/2026/auth-xyz",
  "type": ["VerifiableCredential", "GalileoHeritageCredential"],
  "issuer": {
    "id": "did:galileo:issuer:entrupy",
    "name": "Entrupy Authentication"
  },
  "validFrom": "2026-01-31T00:00:00Z",
  "credentialSubject": {
    "id": "did:galileo:01:03426795123456:21:ABC123",
    "galileo:credentialType": "authenticity_verified",
    "galileo:verificationDate": "2026-01-31",
    "galileo:methodology": "microscopic_analysis",
    "galileo:confidence": 0.9987,
    "galileo:reportURI": "https://reports.entrupy.com/verify/abc123"
  },
  "credentialStatus": {
    "id": "https://status.galileoprotocol.io/credentials/3#67890",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "67890",
    "statusListCredential": "https://status.galileoprotocol.io/credentials/3"
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-31T00:00:00Z",
    "verificationMethod": "did:galileo:issuer:entrupy#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z7wRk3pMnQ8yX2cD5vL1sF6gH9jB4tA..."
  }
}
```

**Full Example (Origin Certification):**

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/contexts/galileo.jsonld"
  ],
  "id": "https://vc.galileoprotocol.io/credentials/heritage/2026/origin-def",
  "type": ["VerifiableCredential", "GalileoHeritageCredential"],
  "issuer": {
    "id": "did:galileo:brand:hermes",
    "name": "Hermes International"
  },
  "validFrom": "2026-01-15T00:00:00Z",
  "credentialSubject": {
    "id": "did:galileo:01:03426795123456:21:DEF456",
    "galileo:credentialType": "origin_certified",
    "galileo:verificationDate": "2026-01-15",
    "galileo:methodology": "brand_attestation",
    "galileo:confidence": 1.0,
    "galileo:manufacturingLocation": {
      "facility": "Atelier Hermes Pantin",
      "country": "FR"
    },
    "galileo:materialsOrigin": [
      {
        "material": "Togo leather",
        "origin": "FR",
        "supplier": "did:galileo:brand:tannerie-degermann"
      }
    ]
  },
  "credentialStatus": {
    "id": "https://status.galileoprotocol.io/credentials/3#78901",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "78901",
    "statusListCredential": "https://status.galileoprotocol.io/credentials/3"
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-15T00:00:00Z",
    "verificationMethod": "did:galileo:brand:hermes#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z9mNp4qR2sT7uW3xY6zA..."
  }
}
```

**Required Subject Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | DID | Product's Galileo DID (GS1 format) |
| `galileo:credentialType` | Enum | "origin_certified", "authenticity_verified", "provenance_documented" |
| `galileo:verificationDate` | Date | When verification was performed |
| `galileo:methodology` | String | Verification method used |
| `galileo:confidence` | Number | Confidence score (0.0-1.0) |

**Credential Type Values:**

| Value | Description |
|-------|-------------|
| `origin_certified` | Manufacturing origin verified |
| `authenticity_verified` | Product confirmed genuine |
| `provenance_documented` | Ownership history documented |

---

## 4. On-Chain Hash Anchoring

### 4.1 Claim Data Encoding

When a VC is registered on-chain, the ONCHAINID claim `data` field contains:

```solidity
bytes memory claimData = abi.encode(
    keccak256(canonicalVCJson),  // Content hash of canonical VC
    vcURI                         // Retrieval URI for off-chain VC
);
```

**Example Decoded:**

| Component | Value |
|-----------|-------|
| Content Hash | `0x7a3b5c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b` |
| VC URI | `https://vc.galileoprotocol.io/credentials/kyc/2026/abc123` |

### 4.2 Canonicalization (RFC 8785 JCS)

Before hashing, the VC JSON MUST be canonicalized per RFC 8785 JSON Canonicalization Scheme (JCS):

**Canonicalization Rules:**

1. **Sort object keys** alphabetically (recursive, all levels)
2. **Remove insignificant whitespace** (no spaces, newlines between elements)
3. **Number formatting**: Use shortest representation, no trailing zeros
4. **String escaping**: Minimal escaping, UTF-8 NFC normalization
5. **No comments**: JSON does not allow comments

**JavaScript Implementation:**

```javascript
import { canonicalize } from 'json-canonicalize'; // RFC 8785 library
import { keccak256, toUtf8Bytes } from 'ethers';

function computeVCHash(vc) {
  // 1. Canonicalize per RFC 8785
  const canonical = canonicalize(vc);

  // 2. Compute keccak256 hash
  const hash = keccak256(toUtf8Bytes(canonical));

  return hash;
}
```

**Solidity Verification:**

```solidity
function verifyVCHash(
    bytes memory vcJson,
    bytes32 expectedHash
) internal pure returns (bool) {
    // Note: Canonicalization must happen off-chain before passing to contract
    // This function verifies pre-canonicalized JSON
    return keccak256(vcJson) == expectedHash;
}
```

### 4.3 Verification Flow

Complete verification of an on-chain claim with off-chain VC:

```
VERIFICATION FLOW (7 Steps)

Step 1: RETRIEVE CLAIM
        └─> identity.getClaim(claimId)
        └─> Returns: topic, scheme, issuer, signature, data, uri

Step 2: DECODE CLAIM DATA
        └─> (contentHash, vcURI) = abi.decode(claim.data, (bytes32, string))

Step 3: FETCH VC FROM URI
        └─> HTTP GET vcURI
        └─> Returns: Full VC JSON document

Step 4: CANONICALIZE VC
        └─> canonical = RFC8785.canonicalize(vcJson)

Step 5: VERIFY CONTENT HASH
        └─> computedHash = keccak256(canonical)
        └─> ASSERT: computedHash == contentHash
        └─> If mismatch: VC has been tampered

Step 6: VERIFY VC SIGNATURE
        └─> Extract proof from VC
        └─> Verify proof.proofValue against VC content
        └─> Verify proof.verificationMethod matches issuer DID

Step 7: CHECK STATUS
        └─> Fetch BitstringStatusList from credentialStatus.statusListCredential
        └─> Check bit at statusListIndex
        └─> If bit is 1: Credential is revoked/suspended

Step 8: CHECK TEMPORAL VALIDITY
        └─> ASSERT: now >= validFrom
        └─> ASSERT: now < validUntil (if present)
```

**Implementation Example:**

```typescript
interface VerificationResult {
  valid: boolean;
  checks: {
    hashMatch: boolean;
    signatureValid: boolean;
    notRevoked: boolean;
    temporallyValid: boolean;
  };
  error?: string;
}

async function verifyGalileoVC(
  identity: string,
  claimId: string
): Promise<VerificationResult> {
  // Step 1: Retrieve on-chain claim
  const claim = await identityContract.getClaim(claimId);

  // Step 2: Decode claim data
  const [contentHash, vcURI] = ethers.AbiCoder.defaultAbiCoder().decode(
    ['bytes32', 'string'],
    claim.data
  );

  // Step 3: Fetch VC
  const vcResponse = await fetch(vcURI);
  const vc = await vcResponse.json();

  // Step 4: Canonicalize
  const canonical = canonicalize(vc);

  // Step 5: Verify hash
  const computedHash = ethers.keccak256(ethers.toUtf8Bytes(canonical));
  const hashMatch = computedHash === contentHash;

  // Step 6: Verify signature (simplified)
  const signatureValid = await verifyDataIntegrityProof(vc);

  // Step 7: Check revocation status
  const notRevoked = await checkBitstringStatus(vc.credentialStatus);

  // Step 8: Check temporal validity
  const now = new Date();
  const validFrom = new Date(vc.validFrom);
  const validUntil = vc.validUntil ? new Date(vc.validUntil) : null;
  const temporallyValid = now >= validFrom && (!validUntil || now < validUntil);

  return {
    valid: hashMatch && signatureValid && notRevoked && temporallyValid,
    checks: { hashMatch, signatureValid, notRevoked, temporallyValid }
  };
}
```

---

## 5. BitstringStatusList Integration

### 5.1 Overview

Galileo uses W3C BitstringStatusList v1.0 for efficient credential revocation and suspension:

- https://www.w3.org/TR/vc-bitstring-status-list/

### 5.2 Status Credential Example

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2"
  ],
  "id": "https://status.galileoprotocol.io/credentials/1",
  "type": ["VerifiableCredential", "BitstringStatusListCredential"],
  "issuer": "did:galileo:consortium",
  "validFrom": "2026-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "https://status.galileoprotocol.io/credentials/1#list",
    "type": "BitstringStatusList",
    "statusPurpose": "revocation",
    "encodedList": "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAfgYnLJ..."
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-01T00:00:00Z",
    "verificationMethod": "did:galileo:consortium#status-key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z..."
  }
}
```

### 5.3 Status Purposes

| Purpose | Use Case | Reversible | Description |
|---------|----------|------------|-------------|
| `revocation` | Permanent invalidity | No | Credential permanently invalid |
| `suspension` | Temporary invalidity | Yes | Credential temporarily invalid, may be reinstated |

**When to Use Each:**

| Scenario | Purpose | Rationale |
|----------|---------|-----------|
| Fraud discovered | revocation | Permanent, cannot be undone |
| Investigation pending | suspension | May be cleared |
| KYC expired | revocation | New credential required |
| Authorization terminated | revocation | Business relationship ended |
| Temporary compliance issue | suspension | May be resolved |

### 5.4 Galileo Status Lists

Galileo operates three status list credentials, organized by credential type:

| Status List | URL | Credential Types | Purposes |
|-------------|-----|------------------|----------|
| KYC/Compliance | `https://status.galileoprotocol.io/credentials/1` | GalileoKYCCredential | revocation, suspension |
| Luxury Authorizations | `https://status.galileoprotocol.io/credentials/2` | GalileoLuxuryCredential | revocation, suspension |
| Heritage Claims | `https://status.galileoprotocol.io/credentials/3` | GalileoHeritageCredential | revocation only |

**Why No Suspension for Heritage:**

Heritage credentials (origin, authenticity) represent historical facts. If they're wrong, they should be revoked (fraud), not suspended. There's no valid "temporarily wrong" state for authenticity.

### 5.5 Status List Entry Format

Each credential includes a status entry pointing to its position in the list:

```json
"credentialStatus": {
  "id": "https://status.galileoprotocol.io/credentials/1#94567",
  "type": "BitstringStatusListEntry",
  "statusPurpose": "revocation",
  "statusListIndex": "94567",
  "statusListCredential": "https://status.galileoprotocol.io/credentials/1"
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (list URL + # + index) |
| `type` | Always "BitstringStatusListEntry" |
| `statusPurpose` | "revocation" or "suspension" |
| `statusListIndex` | Position in the bitstring |
| `statusListCredential` | URL of the status list credential |

### 5.6 Caching Strategy

| Credential Type | TTL | Rationale |
|-----------------|-----|-----------|
| KYC/Compliance | 5 minutes | Compliance status changes matter quickly |
| Luxury Authorizations | 5 minutes | Authorization revocations need fast propagation |
| Heritage Claims | 24 hours | Revocations are rare; prioritize availability |

**Cache Invalidation:**

- On-chain ClaimRemoved event triggers cache purge
- Status list includes `validFrom` for cache validation
- Verifiers SHOULD subscribe to status list updates

---

## 6. Off-Chain Storage

### 6.1 Storage Requirements

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **Availability** | 99.9% uptime SLA | Critical for verification |
| **Integrity** | Hash verification on every retrieval | Tamper detection |
| **Privacy** | Access control based on consent | GDPR compliance |
| **Retention** | 10+ years for heritage claims | Luxury product lifecycle |
| **Erasure** | 30-day deletion capability | GDPR Article 17 |
| **Encryption** | At-rest encryption (AES-256) | Data protection |

### 6.2 Architecture

```
                     VC STORAGE ARCHITECTURE

+-------------------+
|    VC Gateway     |
|  (Access Control) |
+-------------------+
         |
         |  1. Request VC (with auth token)
         |  2. Check ONCHAINID.hasConsent(requester, topic)
         |  3. Return VC or 403
         |
+--------+---------+
|                  |
v                  v
+----------------+ +------------------+
| Brand Storage  | | Consortium IPFS  |
| (Private VCs)  | | (Shared VCs)     |
+----------------+ +------------------+
|                | |                  |
| - KYC creds    | | - Heritage creds |
| - Brand-issued | | - Public attrs   |
|   authoriz.    | |                  |
+----------------+ +------------------+
```

### 6.3 Storage Location by Credential Type

| Credential Type | Primary Storage | Backup | Access Pattern |
|-----------------|-----------------|--------|----------------|
| GalileoKYCCredential | Brand/Issuer private storage | Encrypted backup | Consent-gated |
| GalileoLuxuryCredential | Issuing brand storage | Consortium replica | Consent-gated |
| GalileoHeritageCredential | Consortium IPFS (pinned) | Multi-region backup | Public metadata, consent for details |

### 6.4 Access Control

Access to off-chain VCs is controlled via the ONCHAINID consent mechanism:

**Request Flow:**

```
1. Verifier requests VC from gateway
   └─> GET /credentials/{id}
   └─> Authorization: Bearer {verifier_token}

2. Gateway identifies verifier
   └─> Decode token -> verifier_did

3. Gateway checks on-chain consent
   └─> identity.hasConsent(verifier_address, claim_topic)

4. Access decision
   └─> If consent valid and not expired: Return VC (200)
   └─> If no consent: Return 403 Forbidden
   └─> If consent expired: Return 403 Forbidden
```

**Exception Cases:**

| Case | Consent Required | Rationale |
|------|------------------|-----------|
| Subject requesting own VC | No | Data subject right of access |
| Issuer retrieving issued VC | No | Issuer is data controller |
| Regulator with legal basis | Configurable | May have statutory access |

### 6.5 GDPR Erasure Support

When a data subject requests erasure:

1. **Off-chain deletion**: VC removed from storage
2. **Backup deletion**: VC removed from all backups
3. **Cache purge**: All caches invalidated
4. **On-chain orphaning**: Hash remains but points to nothing
5. **Audit log**: Deletion logged (without PII)

Per hybrid-architecture.md CRAB model, the on-chain hash becomes meaningless without off-chain content.

---

## 7. Proof Types

### 7.1 DataIntegrityProof (Recommended)

Galileo VCs use W3C Data Integrity Proofs with the following cryptosuites:

```json
{
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "created": "2026-01-31T00:00:00Z",
    "verificationMethod": "did:galileo:issuer:xyz#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3FXQjecWufY46yg7irDpXEeGpPJbzS4L..."
  }
}
```

### 7.2 Supported Cryptosuites

| Cryptosuite | Algorithm | Status | Use Case |
|-------------|-----------|--------|----------|
| `eddsa-rdfc-2022` | Ed25519 | Recommended | Default for all credentials |
| `ecdsa-rdfc-2019` | secp256k1 | Supported | EVM-native key compatibility |

### 7.3 Proof Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Always "DataIntegrityProof" |
| `cryptosuite` | Yes | Algorithm identifier |
| `created` | Yes | Proof creation timestamp |
| `verificationMethod` | Yes | DID URL of signing key |
| `proofPurpose` | Yes | Always "assertionMethod" for VCs |
| `proofValue` | Yes | Multibase-encoded signature |

### 7.4 Future: Post-Quantum Proofs

Per crypto-agility.md Phase 2 timeline:

| Timeline | Proof Strategy |
|----------|----------------|
| 2026 (Now) | Classical only (eddsa-rdfc-2022) |
| 2027-2029 | Hybrid: Classical + PQC dual proofs |
| 2030+ | PQC acceptable alone (ML-DSA based) |

**Hybrid Proof Example (2027+):**

```json
{
  "proof": [
    {
      "type": "DataIntegrityProof",
      "cryptosuite": "eddsa-rdfc-2022",
      "verificationMethod": "did:galileo:issuer:xyz#key-classical",
      "proofPurpose": "assertionMethod",
      "proofValue": "z..."
    },
    {
      "type": "DataIntegrityProof",
      "cryptosuite": "mldsa-rdfc-2027",
      "verificationMethod": "did:galileo:issuer:xyz#key-pqc",
      "proofPurpose": "assertionMethod",
      "proofValue": "z..."
    }
  ]
}
```

During hybrid period, BOTH proofs must be valid. After 2030, PQC-only credentials may be accepted.

---

## Appendix A: Context File Reference

The Galileo JSON-LD context is published at:

```
https://vocab.galileoprotocol.io/contexts/galileo.jsonld
```

This context defines all `galileo:` prefixed terms used in credentials.

## Appendix B: Schema Validation

All Galileo VCs can be validated against:

```
https://schemas.galileoprotocol.io/credentials/v1/galileo-vc.schema.json
```

See `specifications/schemas/identity/galileo-vc.schema.json` for the complete JSON Schema.

## Appendix C: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [onchainid-specification.md](./onchainid-specification.md) | On-chain identity contracts |
| [claim-topics.md](./claim-topics.md) | Claim topic definitions |
| [DID-METHOD.md](./DID-METHOD.md) | DID resolution |
| [hybrid-architecture.md](../architecture/hybrid-architecture.md) | On-chain/off-chain boundary |
| [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/) | Base specification |
| [W3C BitstringStatusList](https://www.w3.org/TR/vc-bitstring-status-list/) | Revocation mechanism |
| [RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785) | JSON Canonicalization Scheme |

---

*Galileo Luxury Standard - Identity Layer*
*Specification: GSPEC-IDENTITY-006*
*Classification: Public*
