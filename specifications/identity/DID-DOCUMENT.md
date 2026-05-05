# Galileo DID Document Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-30
**Specification Series:** GSPEC-IDENTITY-002

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Properties](#2-core-properties)
3. [Verification Methods](#3-verification-methods)
4. [Service Endpoints](#4-service-endpoints)
5. [Complete DID Document Examples](#5-complete-did-document-examples)
6. [Lifecycle States](#6-lifecycle-states)
7. [Galileo JSON-LD Context](#7-galileo-json-ld-context)
8. [Integration with Hybrid Architecture](#8-integration-with-hybrid-architecture)

---

## 1. Overview

### 1.1 Purpose

This specification defines the DID document structure for Galileo products and entities, including:
- **Verification methods** for cryptographic operations
- **Service endpoints** for discovering product services
- **Lifecycle states** for tracking product status
- **JSON-LD context** for semantic interoperability

### 1.2 Conformance

Per W3C DID Core v1.0, a DID document is a set of data describing the DID subject, including mechanisms to authenticate and authorize interactions.

This specification conforms to:
- [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [W3C DID Document Properties](https://www.w3.org/TR/did-core/#did-document-properties)

### 1.3 Document Storage

DID documents are stored **off-chain** per the Galileo hybrid architecture:

- Full document in off-chain storage (IPFS, S3, etc.)
- Content hash stored on-chain for integrity verification
- Service endpoints enable retrieval via resolver

See [hybrid-architecture.md](../architecture/hybrid-architecture.md) for data boundary specification.

---

## 2. Core Properties

### 2.1 Required Properties

Every Galileo DID document MUST include:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://galileoprotocol.io/ns/v1"
  ],
  "id": "did:galileo:01:09506000134352:21:ABC123",
  "controller": "did:galileo:brand:hermesparis"
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `@context` | array | Yes | JSON-LD context, MUST include W3C DID v1 and Galileo context |
| `id` | string | Yes | The DID this document describes |
| `controller` | string or array | Yes | DID(s) authorized to make changes to this document |

**Context Requirements:**

The `@context` array MUST contain:
1. `https://www.w3.org/ns/did/v1` - W3C DID Core context (REQUIRED, FIRST)
2. Appropriate security suite contexts for verification methods used
3. `https://galileoprotocol.io/ns/v1` - Galileo-specific terms

### 2.2 Optional Properties

| Property | Type | Description |
|----------|------|-------------|
| `verificationMethod` | array | Cryptographic keys for verification |
| `authentication` | array | Keys or references for authentication |
| `assertionMethod` | array | Keys or references for signing claims/credentials |
| `keyAgreement` | array | Keys or references for encryption/key exchange |
| `capabilityInvocation` | array | Keys for invoking capabilities |
| `capabilityDelegation` | array | Keys for delegating capabilities |
| `service` | array | Service endpoints |
| `alsoKnownAs` | array | Alternative identifiers (URIs) |

### 2.3 Extended Properties (Galileo-Specific)

```json
{
  "galileo:productType": "luxury-good",
  "galileo:category": "leather-goods",
  "galileo:gtin": "09506000134352",
  "galileo:serialNumber": "ABC123"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `galileo:productType` | string | Product classification |
| `galileo:category` | string | Product category |
| `galileo:gtin` | string | GS1 GTIN (extracted from DID) |
| `galileo:serialNumber` | string | Serial number (extracted from DID) |

---

## 3. Verification Methods

### 3.1 Key Types Supported

Per the Galileo crypto-agility specification ([crypto-agility.md](../crypto/crypto-agility.md)):

| Type | Suite | Usage | Status |
|------|-------|-------|--------|
| `EcdsaSecp256k1VerificationKey2019` | secp256k1-2019 | Ethereum-native signatures | Current |
| `Ed25519VerificationKey2020` | ed25519-2020 | High-performance signatures | Current |
| `JsonWebKey2020` | JWK 2020 | Generic JWK wrapper | Current |
| `Multikey` | Multikey 2021 | Future PQC keys (ML-DSA) | Planned (2027) |

**Key Usage Recommendations:**

- **Products:** Ed25519 preferred for performance
- **Brands:** secp256k1 for Ethereum compatibility
- **High-value items:** Dual keys (Ed25519 + secp256k1)
- **Post-2027:** Hybrid classical + PQC per crypto-agility roadmap

### 3.2 Verification Method Structure

**Ed25519 Key:**

```json
{
  "verificationMethod": [{
    "id": "did:galileo:01:09506000134352:21:ABC123#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
  }]
}
```

**secp256k1 Key (Ethereum-compatible):**

```json
{
  "verificationMethod": [{
    "id": "did:galileo:01:09506000134352:21:ABC123#key-2",
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyHex": "04a1b2c3d4e5f60708091011121314151617181920212223242526272829303132"
  }]
}
```

**JSON Web Key (Generic):**

```json
{
  "verificationMethod": [{
    "id": "did:galileo:01:09506000134352:21:ABC123#key-3",
    "type": "JsonWebKey2020",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyJwk": {
      "kty": "EC",
      "crv": "secp256k1",
      "x": "WE1dQJL1B38g...",
      "y": "LXe8TjGPL..."
    }
  }]
}
```

### 3.3 Key ID Convention

Key identifiers follow a consistent pattern:

```
key-id = did "#" key-fragment

key-fragment = "key-" key-number
             / "auth-" key-number
             / "assert-" key-number
             / "encrypt-" key-number

key-number = 1*3DIGIT
```

**Examples:**

| Key ID | Purpose |
|--------|---------|
| `did:galileo:01:09506000134352:21:ABC123#key-1` | Primary verification key |
| `did:galileo:01:09506000134352:21:ABC123#key-2` | Secondary key (different algorithm) |
| `did:galileo:01:09506000134352:21:ABC123#auth-1` | Authentication-specific key |
| `did:galileo:01:09506000134352:21:ABC123#assert-1` | Assertion/claim signing key |
| `did:galileo:01:09506000134352:21:ABC123#encrypt-1` | Key agreement/encryption key |

### 3.4 Verification Relationships

Define how keys are used:

```json
{
  "authentication": [
    "did:galileo:01:09506000134352:21:ABC123#key-1"
  ],
  "assertionMethod": [
    "did:galileo:01:09506000134352:21:ABC123#key-1",
    "did:galileo:01:09506000134352:21:ABC123#key-2"
  ],
  "keyAgreement": [
    "did:galileo:01:09506000134352:21:ABC123#encrypt-1"
  ]
}
```

| Relationship | Use Case |
|--------------|----------|
| `authentication` | Prove control of DID (login, API access) |
| `assertionMethod` | Sign verifiable credentials and claims |
| `keyAgreement` | Establish encrypted channels |
| `capabilityInvocation` | Execute delegated permissions |
| `capabilityDelegation` | Grant permissions to others |

---

## 4. Service Endpoints

### 4.1 Service Types

| Type | Purpose | Endpoint Pattern |
|------|---------|------------------|
| `DigitalProductPassport` | ESPR DPP access | `https://resolver.galileoprotocol.io/dpp/{gtin}/{serial}` |
| `TraceabilityService` | Lifecycle events | `https://resolver.galileoprotocol.io/trace/{gtin}/{serial}` |
| `AuthenticityVerification` | Verify product authenticity | `https://resolver.galileoprotocol.io/verify/{gtin}/{serial}` |
| `LinkedDomains` | Brand website link | Brand's verified domain |
| `CredentialRegistry` | VC status list | Claim issuer endpoint |
| `OwnershipTransfer` | Initiate transfer | Transfer service endpoint |
| `ProductRegistry` | Brand's product catalog | Brand API endpoint |

### 4.2 Service Structure

Each service endpoint follows the W3C service structure:

```json
{
  "service": [{
    "id": "did:galileo:01:09506000134352:21:ABC123#dpp",
    "type": "DigitalProductPassport",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/dpp/09506000134352/ABC123"
  }, {
    "id": "did:galileo:01:09506000134352:21:ABC123#trace",
    "type": "TraceabilityService",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/trace/09506000134352/ABC123"
  }, {
    "id": "did:galileo:01:09506000134352:21:ABC123#verify",
    "type": "AuthenticityVerification",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/verify/09506000134352/ABC123"
  }, {
    "id": "did:galileo:01:09506000134352:21:ABC123#brand",
    "type": "LinkedDomains",
    "serviceEndpoint": "https://www.hermes.com/products/ABC123"
  }]
}
```

**Service ID Convention:**

```
service-id = did "#" service-fragment

service-fragment = "dpp"       ; Digital Product Passport
                 / "trace"     ; Traceability
                 / "verify"    ; Authenticity verification
                 / "brand"     ; Brand website
                 / "transfer"  ; Ownership transfer
                 / "creds"     ; Credential registry
```

### 4.3 Service Endpoint Security

**MUST Requirements:**

| Requirement | Specification |
|-------------|---------------|
| Transport Security | HTTPS with TLS 1.3 minimum |
| CORS | Support browser access with appropriate headers |
| Cache Control | Return appropriate cache headers |
| Write Auth | Require authentication for any write operations |

**MAY Features:**

| Feature | Description |
|---------|-------------|
| Role-based views | Return different data based on requester role |
| Rate limiting | Prevent abuse via request throttling |
| Authentication | Require auth for sensitive data access |

### 4.4 Service Endpoint Response

Service endpoints SHOULD return data according to their type:

**DigitalProductPassport Response:**

```json
{
  "dpp": {
    "version": "1.0",
    "product": {
      "gtin": "09506000134352",
      "serial": "ABC123",
      "name": "Kelly Bag 25",
      "brand": "Hermes Paris"
    },
    "sustainability": { ... },
    "materials": { ... },
    "certifications": [ ... ]
  }
}
```

**TraceabilityService Response:**

```json
{
  "events": [
    {
      "type": "creation",
      "timestamp": "2026-01-15T10:30:00Z",
      "location": "Paris, France",
      "actor": "did:galileo:artisan:pierresmith"
    },
    {
      "type": "quality-check",
      "timestamp": "2026-01-16T14:00:00Z",
      "result": "passed"
    }
  ]
}
```

---

## 5. Complete DID Document Examples

### 5.1 Product DID Document

A complete DID document for a luxury product:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1",
    "https://galileoprotocol.io/ns/v1"
  ],
  "id": "did:galileo:01:09506000134352:21:ABC123",
  "controller": "did:galileo:brand:hermesparis",
  "alsoKnownAs": [
    "https://id.galileoprotocol.io/01/09506000134352/21/ABC123"
  ],
  "verificationMethod": [{
    "id": "did:galileo:01:09506000134352:21:ABC123#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
  }, {
    "id": "did:galileo:01:09506000134352:21:ABC123#key-2",
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyHex": "04a1b2c3d4e5f60708091011121314151617181920212223242526272829303132"
  }],
  "authentication": [
    "did:galileo:01:09506000134352:21:ABC123#key-1"
  ],
  "assertionMethod": [
    "did:galileo:01:09506000134352:21:ABC123#key-1",
    "did:galileo:01:09506000134352:21:ABC123#key-2"
  ],
  "service": [{
    "id": "did:galileo:01:09506000134352:21:ABC123#dpp",
    "type": "DigitalProductPassport",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/dpp/09506000134352/ABC123"
  }, {
    "id": "did:galileo:01:09506000134352:21:ABC123#trace",
    "type": "TraceabilityService",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/trace/09506000134352/ABC123"
  }, {
    "id": "did:galileo:01:09506000134352:21:ABC123#verify",
    "type": "AuthenticityVerification",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/verify/09506000134352/ABC123"
  }],
  "galileo:productType": "luxury-good",
  "galileo:category": "leather-goods",
  "galileo:gtin": "09506000134352",
  "galileo:serialNumber": "ABC123"
}
```

### 5.2 Brand DID Document

A complete DID document for a brand entity:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://galileoprotocol.io/ns/v1"
  ],
  "id": "did:galileo:brand:hermesparis",
  "controller": "did:galileo:brand:hermesparis",
  "verificationMethod": [{
    "id": "did:galileo:brand:hermesparis#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyMultibase": "z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH"
  }, {
    "id": "did:galileo:brand:hermesparis#key-2",
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": "did:galileo:brand:hermesparis",
    "publicKeyHex": "04b2c3d4e5f607080910111213141516171819202122232425262728293031323334"
  }],
  "authentication": [
    "did:galileo:brand:hermesparis#key-1"
  ],
  "assertionMethod": [
    "did:galileo:brand:hermesparis#key-1",
    "did:galileo:brand:hermesparis#key-2"
  ],
  "capabilityDelegation": [
    "did:galileo:brand:hermesparis#key-1"
  ],
  "service": [{
    "id": "did:galileo:brand:hermesparis#website",
    "type": "LinkedDomains",
    "serviceEndpoint": "https://www.hermes.com"
  }, {
    "id": "did:galileo:brand:hermesparis#products",
    "type": "ProductRegistry",
    "serviceEndpoint": "https://api.galileoprotocol.io/brands/hermesparis/products"
  }, {
    "id": "did:galileo:brand:hermesparis#verify",
    "type": "AuthenticityVerification",
    "serviceEndpoint": "https://api.galileoprotocol.io/brands/hermesparis/verify"
  }],
  "galileo:entityType": "brand",
  "galileo:legalName": "Hermes International SCA",
  "galileo:gs1CompanyPrefix": "9506000"
}
```

### 5.3 Artisan DID Document

A DID document for an individual artisan:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://galileoprotocol.io/ns/v1"
  ],
  "id": "did:galileo:artisan:pierresmith",
  "controller": [
    "did:galileo:artisan:pierresmith",
    "did:galileo:brand:hermesparis"
  ],
  "verificationMethod": [{
    "id": "did:galileo:artisan:pierresmith#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:galileo:artisan:pierresmith",
    "publicKeyMultibase": "z6MkrHKzgsahxBLyNMb4VGaP1R3k8e3xVPsvdE7aFJvPTzwT"
  }],
  "authentication": [
    "did:galileo:artisan:pierresmith#key-1"
  ],
  "assertionMethod": [
    "did:galileo:artisan:pierresmith#key-1"
  ],
  "service": [{
    "id": "did:galileo:artisan:pierresmith#profile",
    "type": "ArtisanProfile",
    "serviceEndpoint": "https://resolver.galileoprotocol.io/artisans/pierresmith"
  }]
}
```

**Note:** Personal data about the artisan (name, photo, biography) is stored OFF-CHAIN at the service endpoint, not in the DID document, per GDPR requirements.

---

## 6. Lifecycle States

### 6.1 State Diagram

```
                        [Created]
                            |
                +-----------+-----------+
                |                       |
                v                       v
            [Active]              [Pending Transfer]
                |                       |
        +-------+-------+               |
        |       |       |               |
        v       v       v               v
    [Updated] [Key    [Service      [Transferred]
               Rotated] Added]          |
        |       |       |               |
        +-------+-------+---------------+
                |
                v
          [Deactivated]
                |
                v
            (Terminal)
                |
    +-----------+-----------+
    |           |           |
    v           v           v
[DESTROYED] [LOST]    [RECALLED]
```

### 6.2 State Definitions

| State | Description | DID Document Flag |
|-------|-------------|-------------------|
| **Created** | DID registered, awaiting DPP content | `status: "created"` |
| **Active** | Fully operational, DPP linked | `status: "active"` |
| **Updated** | Document content changed | `status: "active"` |
| **Key Rotated** | Verification keys changed | `status: "active"` |
| **Service Added** | New service endpoint added | `status: "active"` |
| **Pending Transfer** | Ownership transfer initiated | `status: "pending-transfer"` |
| **Transferred** | Ownership transferred to new controller | `status: "active"` |
| **Deactivated** | Product decommissioned | `deactivated: true` |

### 6.3 State Transitions

| From | To | Trigger | Authorization | Event |
|------|-----|---------|---------------|-------|
| - | Created | Product registration | Brand controller | `ProductCreated` |
| Created | Active | DPP content linked | Brand controller | `ProductActivated` |
| Active | Updated | DPP content change | Controller | `ProductUpdated` |
| Active | Key Rotated | Key rotation | Controller | `ProductUpdated` |
| Active | Service Added | New service endpoint | Controller | `ProductUpdated` |
| Active | Pending Transfer | Transfer initiated | Controller | `TransferInitiated` |
| Pending Transfer | Transferred | Transfer accepted | New controller | `TransferCompleted` |
| Pending Transfer | Active | Transfer cancelled | Original controller | `TransferCancelled` |
| Any Active | Deactivated | Product decommissioned | Controller | `ProductDeactivated` |
| Deactivated | - | Terminal state | - | - |

### 6.4 Deactivation Reasons

```typescript
/**
 * Reasons for product deactivation.
 * Products are never deleted, only deactivated with a reason.
 */
enum DeactivationReason {
  /** Physical product no longer exists (destroyed, recycled) */
  DESTROYED = "destroyed",

  /** Product location unknown (lost, stolen) */
  LOST = "lost",

  /** Product recalled by manufacturer */
  RECALLED = "recalled",

  /** Identified as counterfeit (original DID marked, not fake) */
  COUNTERFEIT = "counterfeit",

  /** Merged with another product DID (consolidation) */
  MERGED = "merged",

  /** Created in error, never represented real product */
  ERROR = "error"
}
```

**Deactivation Metadata:**

```json
{
  "deactivated": true,
  "deactivationReason": "destroyed",
  "deactivationDate": "2030-06-15T10:30:00Z",
  "deactivationNote": "Product destroyed per customer request after end of life"
}
```

### 6.5 Resolution After Deactivation

Deactivated DIDs remain resolvable. The resolution response indicates deactivation:

```json
{
  "didDocument": { ... },
  "didResolutionMetadata": {
    "error": "deactivated",
    "contentType": "application/did+json"
  },
  "didDocumentMetadata": {
    "created": "2026-01-15T10:30:00Z",
    "updated": "2030-06-15T10:30:00Z",
    "deactivated": true,
    "versionId": "ba7816bf..."
  }
}
```

---

## 7. Galileo JSON-LD Context

### 7.1 Context Definition

The Galileo JSON-LD context extends W3C DID with luxury product-specific terms:

```json
{
  "@context": {
    "@version": 1.1,
    "galileo": "https://galileoprotocol.io/ns/v1#",

    "DigitalProductPassport": "galileo:DigitalProductPassport",
    "TraceabilityService": "galileo:TraceabilityService",
    "AuthenticityVerification": "galileo:AuthenticityVerification",
    "ProductRegistry": "galileo:ProductRegistry",
    "ArtisanProfile": "galileo:ArtisanProfile",
    "OwnershipTransfer": "galileo:OwnershipTransfer",
    "CredentialRegistry": "galileo:CredentialRegistry",

    "gtin": {
      "@id": "galileo:gtin",
      "@type": "xsd:string"
    },
    "serialNumber": {
      "@id": "galileo:serialNumber",
      "@type": "xsd:string"
    },
    "productType": {
      "@id": "galileo:productType",
      "@type": "@vocab"
    },
    "category": {
      "@id": "galileo:category",
      "@type": "@vocab"
    },
    "entityType": {
      "@id": "galileo:entityType",
      "@type": "@vocab"
    },
    "legalName": {
      "@id": "galileo:legalName",
      "@type": "xsd:string"
    },
    "gs1CompanyPrefix": {
      "@id": "galileo:gs1CompanyPrefix",
      "@type": "xsd:string"
    },
    "deactivationReason": {
      "@id": "galileo:deactivationReason",
      "@type": "@vocab"
    },

    "ProductTypeVocab": {
      "@id": "galileo:ProductTypeVocab",
      "@context": {
        "luxury-good": "galileo:LuxuryGood",
        "accessory": "galileo:Accessory",
        "apparel": "galileo:Apparel",
        "watch": "galileo:Watch",
        "jewelry": "galileo:Jewelry",
        "art": "galileo:Art"
      }
    },

    "CategoryVocab": {
      "@id": "galileo:CategoryVocab",
      "@context": {
        "leather-goods": "galileo:LeatherGoods",
        "silk-goods": "galileo:SilkGoods",
        "ready-to-wear": "galileo:ReadyToWear",
        "fine-jewelry": "galileo:FineJewelry",
        "high-jewelry": "galileo:HighJewelry",
        "haute-horlogerie": "galileo:HauteHorlogerie"
      }
    }
  }
}
```

### 7.2 Context URL

Published at: `https://galileoprotocol.io/ns/v1`

**Requirements:**

- Implementations MUST fetch and cache this context
- Context SHOULD be cached for 24 hours
- Context version changes require DID document migration

### 7.3 Context Versioning

| Version | URL | Status |
|---------|-----|--------|
| v1 | `https://galileoprotocol.io/ns/v1` | Current |
| v2 | `https://galileoprotocol.io/ns/v2` | Planned |

**Migration Policy:**

- New context versions are additive (backward compatible)
- Deprecated terms receive 2-year sunset period
- Breaking changes require major version bump

---

## 8. Integration with Hybrid Architecture

### 8.1 On-Chain Storage

Per [hybrid-architecture.md](../architecture/hybrid-architecture.md), the on-chain registry stores:

| Field | Type | Description |
|-------|------|-------------|
| `didHash` | bytes32 | keccak256 of normalized DID string |
| `controller` | address | Ethereum address of controller (ONCHAINID) |
| `contentHash` | bytes32 | SHA-256 of full DID document |
| `createdAt` | uint256 | Block timestamp of creation |
| `updatedAt` | uint256 | Block timestamp of last modification |
| `active` | bool | false = decommissioned |

**What is NOT on-chain:**

- Full DID document content
- Verification key material
- Service endpoint URLs
- Any metadata beyond essential hashes

### 8.2 Off-Chain Storage

The full DID document is stored off-chain because:

1. **Service endpoints** may contain session tokens or dynamic URLs
2. **Extended metadata** can be large and frequently updated
3. **Privacy** - endpoint details may reveal business relationships
4. **Cost** - full documents would be expensive to store on-chain
5. **GDPR** - erasure requires modifiable storage

**Storage Options:**

| Option | Use Case | Durability |
|--------|----------|------------|
| IPFS | Decentralized, content-addressed | High (with pinning) |
| Arweave | Permanent storage | Very high |
| S3/GCS | Enterprise, high availability | High |
| Brand Infrastructure | Full control | Variable |

### 8.3 Resolution Path

The complete resolution flow from DID to document:

```
1. Client requests: did:galileo:01:09506000134352:21:ABC123

2. Resolver normalizes: did:galileo:01:09506000134352:21:ABC123

3. Resolver computes: keccak256("did:galileo:01:09506000134352:21:ABC123")
   Result: 0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad

4. Resolver queries: ProductRegistry.getRecord(didHash)
   Returns: { controller, contentHash, createdAt, updatedAt, active }

5. Resolver fetches: Off-chain store by contentHash
   URL: https://storage.galileoprotocol.io/docs/{contentHash}

6. Resolver verifies: SHA-256(canonicalize(document)) === contentHash
   If mismatch: Log integrity alert, continue with warning

7. Resolver returns: DIDResolutionResult
   {
     didDocument: { full document },
     didResolutionMetadata: { contentType, retrieved },
     didDocumentMetadata: { created, updated, versionId }
   }
```

### 8.4 GDPR Compliance

**Product DIDs contain NO personal data:**

| Data Element | Classification | Location |
|--------------|----------------|----------|
| GTIN | Commercial identifier | DID string, on-chain |
| Serial number | Product attribute | DID string, on-chain |
| Content hash | Technical reference | On-chain |
| Controller address | Pseudonymous | On-chain |
| Verification keys | Cryptographic material | Off-chain document |
| Service URLs | Technical | Off-chain document |

**Entity DIDs (brands, artisans):**

| Data Element | Classification | Location |
|--------------|----------------|----------|
| Entity identifier | Pseudonymous | DID string |
| Legal name | May be personal | Off-chain only |
| Contact info | Personal data | Off-chain service endpoint |
| Biography | Personal data | Off-chain service endpoint |

**Right to Erasure:**

For entity DIDs with personal data:

1. Personal data is ONLY at service endpoints (off-chain)
2. Service endpoint content is erasable
3. DID document updated to remove service reference
4. On-chain hash updated to reflect new document
5. Old off-chain content deleted
6. Hash becomes orphaned (CRAB model)

### 8.5 Event Correlation

DID document changes trigger on-chain events:

| DID Document Change | On-Chain Event | Indexed Fields |
|---------------------|----------------|----------------|
| Create document | `ProductCreated` | did, controller |
| Update content | `ProductUpdated` | did, updateType |
| Rotate keys | `ProductUpdated` | did, "key-rotation" |
| Add service | `ProductUpdated` | did, "service" |
| Transfer control | `TransferCompleted` | did, newController |
| Deactivate | `ProductDeactivated` | did, reason |

---

## Appendix A: Validation Schema

JSON Schema for DID document validation:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://galileoprotocol.io/schemas/did-document.json",
  "title": "Galileo DID Document",
  "type": "object",
  "required": ["@context", "id", "controller"],
  "properties": {
    "@context": {
      "type": "array",
      "contains": {
        "const": "https://www.w3.org/ns/did/v1"
      }
    },
    "id": {
      "type": "string",
      "pattern": "^did:galileo:"
    },
    "controller": {
      "oneOf": [
        { "type": "string", "pattern": "^did:" },
        { "type": "array", "items": { "type": "string", "pattern": "^did:" } }
      ]
    },
    "verificationMethod": {
      "type": "array",
      "items": { "$ref": "#/$defs/verificationMethod" }
    },
    "service": {
      "type": "array",
      "items": { "$ref": "#/$defs/service" }
    }
  },
  "$defs": {
    "verificationMethod": {
      "type": "object",
      "required": ["id", "type", "controller"],
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "controller": { "type": "string" }
      }
    },
    "service": {
      "type": "object",
      "required": ["id", "type", "serviceEndpoint"],
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string" },
        "serviceEndpoint": { "type": "string", "format": "uri" }
      }
    }
  }
}
```

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [DID-METHOD.md](./DID-METHOD.md) | Method syntax and resolution protocol |
| [hybrid-architecture.md](../architecture/hybrid-architecture.md) | On-chain/off-chain data boundary |
| [crypto-agility.md](../crypto/crypto-agility.md) | Cryptographic algorithm requirements |
| [W3C DID Core v1.0](https://www.w3.org/TR/did-core/) | Base specification |

---

*Galileo Luxury Standard - Identity Layer*
*Specification: GSPEC-IDENTITY-002*
*Classification: Public*
