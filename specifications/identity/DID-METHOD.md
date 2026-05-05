# Galileo DID Method Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-30
**Specification Series:** GSPEC-IDENTITY-001

---

## Table of Contents

1. [Overview](#1-overview)
2. [Method Syntax](#2-method-syntax)
3. [DID Document Operations](#3-did-document-operations)
4. [Resolution Protocol](#4-resolution-protocol)
5. [Security Considerations](#5-security-considerations)

---

## 1. Overview

### 1.1 Purpose

This specification defines the `did:galileo` DID method for identifying luxury products, brands, and participants within the Galileo Luxury Standard ecosystem.

The `did:galileo` method provides:
- **Persistent identifiers** for physical luxury products
- **Non-revocable references** that survive the product lifecycle
- **GS1 integration** for compatibility with existing supply chain infrastructure
- **Decentralized resolution** via blockchain registry

### 1.2 Conformance

This specification conforms to **W3C DID Core v1.0** (July 2022 Recommendation).

References:
- [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [W3C DID Resolution v1.0](https://w3c-ccg.github.io/did-resolution/)

**Note:** W3C DID v1.1 is experimental. This specification intentionally targets v1.0 only to ensure stability and broad tooling support.

### 1.3 Design Goals

| Goal | Description |
|------|-------------|
| **GS1 Integration** | Incorporate GS1 identifiers (GTIN, serial) for physical product mapping |
| **Dual Resolution** | Enable resolution via both blockchain registry and GS1 Digital Link |
| **Multi-Entity** | Support brand, retailer, and participant identities alongside products |
| **Non-Revocability** | Products exist forever, even if decommissioned (provenance never disappears) |
| **Crypto-Agility** | Support algorithm migration per crypto-agility.md specification |
| **GDPR Compliance** | DID contains no personal data; personal data only in off-chain documents |

### 1.4 Terminology

| Term | Definition |
|------|------------|
| **DID** | Decentralized Identifier per W3C DID Core v1.0 |
| **DID Document** | Set of data describing DID subject (see DID-DOCUMENT.md) |
| **Controller** | Entity authorized to make changes to DID document |
| **GTIN** | Global Trade Item Number (GS1 standard) |
| **AI** | Application Identifier (GS1 element identifier) |

---

## 2. Method Syntax

### 2.1 Method Name

The method name for Galileo identifiers is:

```
method-name = "galileo"
```

### 2.2 Method-Specific Identifier

The complete DID syntax is defined as:

```
did-galileo = "did:galileo:" galileo-specific-id

galileo-specific-id = product-id / entity-id

product-id = application-identifier ":" identifier-value [ ":" serial-component ]

entity-id = entity-type ":" entity-name

application-identifier = "01" / "8006" / "8010" / "253"
    ; 01 = GTIN-13/GTIN-14 (Global Trade Item Number)
    ; 8006 = ITIP (Identification of an Individual Trade Item Piece)
    ; 8010 = CPID (Component/Part Identifier)
    ; 253 = GDTI (Global Document Type Identifier)

identifier-value = 1*DIGIT
    ; GTIN (AI 01): 13-14 digits
    ; ITIP (AI 8006): 14 digits + piece
    ; CPID (AI 8010): 1-30 characters
    ; GDTI (AI 253): 13 digits + optional serial

serial-component = "21:" serial-value
    ; AI 21 = Serial number per GS1 specification
    ; Provides item-level uniqueness

serial-value = 1*ALPHANUM
    ; 1-20 alphanumeric characters per GS1

entity-type = "brand" / "retailer" / "issuer" / "artisan" / "verifier" / "customer" / "regulator" / "facility" / "technician" / "supplier" / "inspector" / "operator" / "recycler" / "marketplace" / "workshop" / "associate" / "official"

entity-name = 1*80(ALPHA / DIGIT / "-")
```

### 2.3 GS1 Application Identifiers

The following GS1 Application Identifiers are supported:

| AI | Name | Use Case | Format |
|----|------|----------|--------|
| `01` | GTIN | Primary product identifier | 13-14 digits |
| `8006` | ITIP | Individual piece of trade item | 18 digits (GTIN + piece) |
| `8010` | CPID | Component/part identifier | 1-30 chars |
| `253` | GDTI | Document type identifier | 13 digits + serial |
| `21` | Serial | Item serial number (suffix) | 1-20 alphanumeric |

### 2.4 Examples

**Products (with GS1 identifiers):**

```
did:galileo:01:09506000134352:21:ABC123
    ; GTIN 09506000134352, Serial ABC123
    ; Uniquely identifies one physical item

did:galileo:01:09506000134352
    ; GTIN only (model-level identifier)
    ; References product SKU, not unique item

did:galileo:8006:095060001343521:21:LOT001-001
    ; ITIP for individual trade item piece
    ; Used for components or sets

did:galileo:253:4000001123457:21:DOC-2026-001
    ; GDTI for certificates of authenticity
    ; Document identifier with serial
```

**Entities:**

```
did:galileo:brand:hermesparis
    ; Brand organization

did:galileo:retailer:24sevres
    ; Retail partner

did:galileo:issuer:verisart
    ; Certificate/claim issuer

did:galileo:artisan:pierresmith
    ; Individual craftsperson

did:galileo:verifier:sgs
    ; Third-party verification service

did:galileo:customer:0x1234abcd
    ; End customer (pseudonymous identifier)

did:galileo:regulator:dgccrf-fr
    ; Regulatory authority (e.g., DGCCRF France)
```

### 2.5 ABNF Grammar

Formal ABNF grammar per RFC 5234:

```abnf
did-galileo        = "did:galileo:" galileo-specific-id
galileo-specific-id = product-id / entity-id

; Product identifiers (with GS1 AIs)
product-id         = ai ":" ai-value *1(":" "21:" serial)
ai                 = "01" / "8006" / "8010" / "253"
ai-value           = 8*14DIGIT
serial             = 1*20(ALPHA / DIGIT / "-" / ".")

; Entity identifiers
entity-id          = entity-type ":" entity-name
entity-type        = "brand" / "retailer" / "issuer" / "artisan" / "verifier" / "customer" / "regulator" / "facility" / "technician" / "supplier" / "inspector" / "operator" / "recycler" / "marketplace" / "workshop" / "associate" / "official"
entity-name        = 1*80(ALPHA / DIGIT / "-")

; Character classes
DIGIT              = %x30-39          ; 0-9
ALPHA              = %x41-5A / %x61-7A ; A-Z / a-z
```

### 2.6 Normalization

Before any operation (create, resolve, compare), DIDs MUST be normalized:

1. **Lowercase method:** `did:galileo:` (always lowercase)
2. **Preserve AI value case:** GTIN digits unchanged
3. **Serial case-sensitive:** Serial numbers preserve original case
4. **Entity name lowercase:** Entity names normalized to lowercase

**Example:**

```
Input:  DID:GALILEO:01:09506000134352:21:ABC123
Output: did:galileo:01:09506000134352:21:ABC123
```

---

## 3. DID Document Operations

### 3.1 Create

**Purpose:** Register a new product or entity in the Galileo ecosystem.

**Process:**

1. Brand generates product DID based on GTIN + serial
2. Brand creates initial DID document (see DID-DOCUMENT.md)
3. Brand computes content hash of DID document
4. Brand stores DID document in off-chain storage
5. Brand submits registration transaction to on-chain registry
6. Registry validates and stores on-chain record

**On-Chain Record Structure:**

```solidity
struct ProductRecord {
    bytes32 didHash;          // keccak256 of normalized DID string
    address controller;       // Brand's identity address (ONCHAINID)
    bytes32 contentHash;      // SHA-256 of off-chain DID document
    uint256 createdAt;        // Block timestamp of creation
    uint256 updatedAt;        // Block timestamp of last modification
    bool active;              // false = decommissioned
}
```

**On-Chain Event:**

```solidity
event ProductCreated(
    string indexed did,
    address indexed controller,
    bytes32 contentHash,
    uint256 timestamp
);
```

**Authorization:**

- Only verified brand ONCHAINID addresses can create product DIDs
- Brand must prove GTIN ownership (GS1 Company Prefix)
- Entity DIDs require governance approval

### 3.2 Read (Resolve)

Resolution is the primary read operation. See [Section 4](#4-resolution-protocol) for the complete resolution protocol.

**Quick Resolution:**

```
GET https://resolver.galileoprotocol.io/1.0/identifiers/{did}
```

Returns `DIDResolutionResult` per W3C DID Resolution specification.

### 3.3 Update

**Purpose:** Modify DID document while preserving DID identifier.

**Allowed Updates:**

| Update Type | Description | Authorization |
|-------------|-------------|---------------|
| Key Rotation | Add/remove/rotate verification methods | Controller |
| Service Endpoints | Add/modify service endpoints | Controller |
| Controller Change | Transfer control to new address | Controller + new controller confirmation |
| Metadata Update | Update extended metadata | Controller |

**Prohibited Updates:**

- DID identifier itself (immutable once created)
- Creation timestamp
- Historical event references
- GTIN/serial components

**Update Process:**

1. Controller prepares updated DID document
2. Controller computes new content hash
3. Controller stores new document in off-chain storage
4. Controller submits update transaction with previous hash (optimistic locking)
5. Registry validates controller authorization and hash chain
6. Registry updates on-chain record

**On-Chain Event:**

```solidity
event ProductUpdated(
    string indexed did,
    bytes32 previousHash,
    bytes32 newHash,
    string updateType,        // "key-rotation" | "service" | "controller" | "metadata"
    uint256 timestamp
);
```

### 3.4 Deactivate

**Purpose:** Mark a product as decommissioned while preserving provenance.

**Critical:** Products are NEVER truly deleted. The DID and its history remain resolvable forever. Deactivation sets a flag that indicates the physical product is no longer active.

**Process:**

1. Controller calls deactivate function with reason
2. Registry sets `active` to false
3. Registry emits deactivation event
4. DID document metadata updated with `deactivated: true`
5. Historical resolution continues to work

**Deactivation Reasons:**

```solidity
enum DeactivationReason {
    DESTROYED,      // Physical product destroyed
    LOST,           // Product location unknown
    RECALLED,       // Manufacturer recall
    COUNTERFEIT,    // Identified as counterfeit (original DID marked)
    MERGED,         // Merged into another product DID
    ERROR           // Created in error, never represented real product
}
```

**On-Chain Event:**

```solidity
event ProductDeactivated(
    string indexed did,
    DeactivationReason reason,
    string metadata,          // Optional JSON metadata
    uint256 timestamp
);
```

**Resolution After Deactivation:**

Deactivated DIDs still resolve, but the response includes:

```json
{
  "didResolutionMetadata": {
    "error": "deactivated"
  },
  "didDocumentMetadata": {
    "deactivated": true,
    "deactivationReason": "destroyed"
  }
}
```

---

## 4. Resolution Protocol

### 4.1 Resolution Architecture

```
DID Resolution Flow:

[Client] --resolve--> [did:galileo Resolver]
                            |
            +---------------+---------------+
            |                               |
            v                               v
    [On-Chain Registry]             [Off-Chain Store]
    (ProductRecord)                 (Full DID Document)
            |                               |
            +---------------+---------------+
                            |
                            v
                    [DIDResolutionResult]
```

**Components:**

| Component | Role | Data |
|-----------|------|------|
| **Client** | Initiates resolution | DID string |
| **Resolver** | Orchestrates resolution | Caches, validates |
| **On-Chain Registry** | Authoritative metadata | didHash, contentHash, active |
| **Off-Chain Store** | Full document | Complete DID document |

### 4.2 Resolution Endpoints

**Primary (HTTPS):**

```
GET https://resolver.galileoprotocol.io/1.0/identifiers/{did}
```

**GS1 Digital Link (for products):**

```
GET https://id.galileoprotocol.io/01/{gtin}/21/{serial}?linkType=gs1:did
```

**Example Requests:**

```bash
# Standard resolution
curl https://resolver.galileoprotocol.io/1.0/identifiers/did:galileo:01:09506000134352:21:ABC123

# GS1 Digital Link resolution
curl "https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:did"

# With specific representation
curl -H "Accept: application/did+ld+json" \
  https://resolver.galileoprotocol.io/1.0/identifiers/did:galileo:01:09506000134352:21:ABC123
```

### 4.3 Resolution Result

Per W3C DID Core v1.0, resolution returns a `DIDResolutionResult`:

```typescript
/**
 * Complete DID resolution result per W3C DID Core v1.0
 */
interface DIDResolutionResult {
  /**
   * The resolved DID document, or null if resolution failed.
   * See DID-DOCUMENT.md for document structure.
   */
  didDocument: DIDDocument | null;

  /**
   * Metadata about the resolution process itself.
   * Describes how resolution was performed.
   */
  didResolutionMetadata: {
    /** MIME type of the representation */
    contentType?: string;           // "application/did+json"

    /** Error code if resolution failed */
    error?: ResolutionError;

    /** Timestamp when resolution was performed */
    retrieved?: string;             // ISO 8601 timestamp

    /** Duration of resolution in milliseconds */
    duration?: number;

    /** Whether result was served from cache */
    cached?: boolean;
  };

  /**
   * Metadata about the DID document itself.
   * Describes the document's lifecycle and state.
   */
  didDocumentMetadata: {
    /** When the DID was created */
    created?: string;               // ISO 8601 timestamp

    /** When the DID document was last updated */
    updated?: string;               // ISO 8601 timestamp

    /** Whether the DID is deactivated */
    deactivated?: boolean;

    /** Reason for deactivation if applicable */
    deactivationReason?: string;

    /** Content hash serving as version identifier */
    versionId?: string;             // SHA-256 content hash

    /** Next version if update pending */
    nextVersionId?: string;

    /** Scheduled update time if applicable */
    nextUpdate?: string;
  };
}

/**
 * Resolution error codes per W3C DID Resolution
 */
type ResolutionError =
  | "invalidDid"                    // DID syntax invalid
  | "notFound"                      // DID not in registry
  | "representationNotSupported"    // Requested format unavailable
  | "deactivated"                   // Product decommissioned
  | "methodNotSupported"            // Not a did:galileo
  | "internalError";                // Resolver error
```

### 4.4 Content Negotiation

The resolver supports multiple DID document representations:

| Accept Header | Response Type | Use Case |
|---------------|---------------|----------|
| `application/did+json` | JSON DID document | Default, most clients |
| `application/did+ld+json` | JSON-LD DID document | Semantic web applications |
| `application/did+cbor` | CBOR-encoded | IoT/embedded devices |

**Default:** If no Accept header, returns `application/did+json`.

### 4.5 Resolution Algorithm

```typescript
/**
 * Resolves a did:galileo identifier to its DID document.
 *
 * @param did - The DID to resolve (e.g., "did:galileo:01:09506000134352:21:ABC123")
 * @returns DIDResolutionResult per W3C specification
 */
async function resolveGalileoDID(did: string): Promise<DIDResolutionResult> {
  const startTime = Date.now();

  // 1. Parse and validate DID syntax
  const parsed = parseGalileoDID(did);
  if (!parsed) {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: "invalidDid",
        retrieved: new Date().toISOString(),
        duration: Date.now() - startTime
      },
      didDocumentMetadata: {}
    };
  }

  // 2. Normalize DID
  const normalizedDID = normalizeDID(did);

  // 3. Compute DID hash for registry lookup
  const didHash = keccak256(normalizedDID);

  // 4. Query on-chain registry
  const record = await productRegistry.getRecord(didHash);

  if (!record || record.createdAt === 0) {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: "notFound",
        retrieved: new Date().toISOString(),
        duration: Date.now() - startTime
      },
      didDocumentMetadata: {}
    };
  }

  // 5. Fetch off-chain document by content hash
  const doc = await fetchOffChainDocument(record.contentHash);

  if (!doc) {
    // Off-chain content unavailable (integrity issue)
    await logIntegrityAlert(did, record.contentHash, "content_missing");
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: "internalError",
        retrieved: new Date().toISOString(),
        duration: Date.now() - startTime
      },
      didDocumentMetadata: {
        created: toISO(record.createdAt),
        updated: toISO(record.updatedAt),
        versionId: record.contentHash
      }
    };
  }

  // 6. Verify content integrity
  const computedHash = sha256(canonicalizeJSON(doc));
  if (computedHash !== record.contentHash) {
    // Hash mismatch - log for investigation but still return
    await logIntegrityAlert(did, record.contentHash, computedHash);
  }

  // 7. Check deactivation status
  if (!record.active) {
    return {
      didDocument: doc,
      didResolutionMetadata: {
        error: "deactivated",
        contentType: "application/did+json",
        retrieved: new Date().toISOString(),
        duration: Date.now() - startTime
      },
      didDocumentMetadata: {
        created: toISO(record.createdAt),
        updated: toISO(record.updatedAt),
        deactivated: true,
        versionId: record.contentHash
      }
    };
  }

  // 8. Return successful resolution
  return {
    didDocument: doc,
    didResolutionMetadata: {
      contentType: "application/did+json",
      retrieved: new Date().toISOString(),
      duration: Date.now() - startTime
    },
    didDocumentMetadata: {
      created: toISO(record.createdAt),
      updated: toISO(record.updatedAt),
      versionId: record.contentHash
    }
  };
}

/**
 * Parses a did:galileo DID into its components.
 * Returns null if syntax is invalid.
 */
function parseGalileoDID(did: string): ParsedDID | null {
  const regex = /^did:galileo:(?:(?:(01|8006|8010|253):(\d{8,14})(?::21:([A-Za-z0-9\-\.]{1,20}))?)|(?:(brand|retailer|issuer|artisan|verifier|customer|regulator|facility|technician|supplier|inspector|operator|recycler|marketplace|workshop|associate|official):([a-z0-9\-]{1,80})))$/i;

  const match = did.match(regex);
  if (!match) return null;

  if (match[1]) {
    // Product DID
    return {
      type: "product",
      ai: match[1],
      aiValue: match[2],
      serial: match[3] || null
    };
  } else {
    // Entity DID
    return {
      type: "entity",
      entityType: match[4].toLowerCase(),
      entityName: match[5].toLowerCase()
    };
  }
}
```

### 4.6 Caching Strategy

To optimize resolution performance while maintaining freshness:

| Resource | Cache Duration | Validation |
|----------|----------------|------------|
| Active DID documents | 5 minutes | ETag / If-None-Match |
| Deactivated DIDs | 1 hour | Content hash validation |
| Entity DIDs | 15 minutes | ETag / If-None-Match |
| Resolution errors | 1 minute | TTL expiry |

**Cache Invalidation:**

- On-chain events (ProductUpdated, ProductDeactivated) trigger cache purge
- Resolver subscribes to registry events for real-time invalidation

---

## 5. Security Considerations

### 5.1 DID Uniqueness

**Guarantees:**

- GTIN + Serial combination guarantees global uniqueness per GS1 specification
- On-chain registry enforces uniqueness via `didHash` check
- Collision-resistant: keccak256 hash of normalized DID string
- Second registration attempt for same DID reverts with error

**Attack Mitigation:**

| Attack | Mitigation |
|--------|------------|
| Duplicate registration | Registry rejects if didHash exists |
| Hash collision | keccak256 provides 256-bit security |
| Namespace squatting | Brand verification required for GTIN |

### 5.2 Controller Authorization

**Authorization Model:**

- Only the `controller` address can update or deactivate
- Controller address is an ONCHAINID smart contract (not EOA)
- Multi-sig or governance rules enforced at ONCHAINID level

**Controller Transfer:**

1. Current controller initiates transfer
2. New controller confirms acceptance
3. Both signatures required for completion
4. Transfer event emitted for audit

**Brand Verification:**

- Brand must prove GS1 Company Prefix ownership
- Verification via ONCHAINID claims from trusted issuers
- Only verified brands can create product DIDs

### 5.3 Replay Protection

**Protections:**

| Protection | Mechanism |
|------------|-----------|
| Nonce | Each update includes nonce from on-chain state |
| Timestamp bounds | Updates rejected if timestamp > 1 hour old |
| Chain ID | Signature includes chain ID (EIP-155) |
| Content hash chain | Each update references previous contentHash |

**Signature Verification:**

```solidity
function verifyUpdateSignature(
    string calldata did,
    bytes32 previousHash,
    bytes32 newHash,
    uint256 nonce,
    uint256 timestamp,
    uint256 chainId,
    bytes calldata signature
) internal view returns (bool) {
    require(timestamp > block.timestamp - 1 hours, "Timestamp too old");
    require(timestamp <= block.timestamp, "Timestamp in future");
    require(nonce == records[keccak256(bytes(did))].nonce, "Invalid nonce");
    require(chainId == block.chainid, "Invalid chain");

    bytes32 messageHash = keccak256(abi.encodePacked(
        did, previousHash, newHash, nonce, timestamp, chainId
    ));

    address signer = ECDSA.recover(messageHash, signature);
    return isController(did, signer);
}
```

### 5.4 Privacy Considerations

**DID Privacy:**

- DID itself contains no personal data (only product/entity identifiers)
- GTIN is commercial data, not personal data under GDPR
- Serial number is product attribute, not personal identifier
- Controller address is pseudonymous (blockchain address)

**Personal Data Location:**

- All personal data stored OFF-CHAIN only
- Off-chain content erasable per GDPR Article 17
- On-chain hash becomes orphaned upon key destruction (CRAB model)
- See hybrid-architecture.md for data boundary specification

**Correlation Risks:**

| Risk | Mitigation |
|------|------------|
| Owner tracking | Ownership changes emit minimal data |
| Purchase history | Transfer events do not include transaction details |
| Location tracking | No geolocation in on-chain records |

### 5.5 Integrity Verification

**Hash Chain:**

Every DID document update creates a verifiable chain:

```
create: contentHash_0 (initial)
update: previousHash=contentHash_0, newHash=contentHash_1
update: previousHash=contentHash_1, newHash=contentHash_2
...
```

**Verification Process:**

1. Resolver fetches off-chain document
2. Resolver computes SHA-256 of canonicalized JSON
3. Resolver compares with on-chain contentHash
4. Mismatch triggers integrity alert (but document still returned with warning)

**Canonicalization:**

Per hybrid-architecture.md:
- Sorted keys (alphabetical)
- No whitespace
- UTF-8 NFC normalization
- IEEE 754 double precision for numbers

---

## Appendix A: Reference Implementation

See `galileo-sdk` package for reference resolver implementation.

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [DID-DOCUMENT.md](./DID-DOCUMENT.md) | DID document schema and lifecycle |
| [hybrid-architecture.md](../architecture/hybrid-architecture.md) | On-chain/off-chain data boundary |
| [crypto-agility.md](../crypto/crypto-agility.md) | Cryptographic algorithm requirements |
| [W3C DID Core v1.0](https://www.w3.org/TR/did-core/) | Base specification |
| [GS1 General Specifications](https://www.gs1.org/standards/barcodes-epcrfid-id-keys/gs1-general-specifications) | GS1 identifier format |

---

*Galileo Luxury Standard - Identity Layer*
*Specification: GSPEC-IDENTITY-001*
*Classification: Public*
