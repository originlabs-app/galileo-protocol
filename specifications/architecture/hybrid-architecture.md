# Hybrid On-Chain/Off-Chain Architecture Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-30
**Requirement:** FOUND-01 (Architecture Document)

---

## 1. Overview

### 1.1 Purpose

This specification defines the foundational data boundaries that enable the Galileo Luxury Standard to operate on blockchain while maintaining full GDPR compliance. It establishes a strict separation between immutable on-chain records and erasable off-chain storage, ensuring that the right to erasure (GDPR Article 17) can always be honored.

### 1.2 Regulatory Basis

This architecture is designed to comply with **EDPB Guidelines 02/2025** on the processing of personal data through blockchain technologies. These guidelines represent the authoritative EU regulatory position on GDPR-blockchain compatibility.

Key regulatory requirements addressed:
- GDPR Article 17: Right to erasure ("right to be forgotten")
- GDPR Article 5(1)(e): Storage limitation principle
- GDPR Article 25: Data protection by design and by default
- EDPB Guidelines 02/2025: Blockchain-specific compliance guidance

### 1.3 Core Principle

> **"When in doubt, store off-chain."**

The hybrid architecture follows a conservative approach: any data that could potentially be linked to a natural person MUST be stored off-chain in erasable storage. On-chain storage is reserved exclusively for non-personal references, hashes, and boolean attestation results.

This is not merely a recommendation; it is a mandatory design constraint for GDPR compliance.

---

## 2. Data Classification Matrix

### 2.1 On-Chain Data (Immutable)

The following data types MAY be stored on-chain because they cannot identify a natural person:

| Data Element | Description | Example | Rationale |
|--------------|-------------|---------|-----------|
| Product DID | Hash-based reference only | `did:galileo:01:09506000134352:21:ABC123` | Identifies product, not person |
| Content Hash | SHA-256 of off-chain content | `0x7a3b5c...` | Integrity verification only |
| Ownership Address | Blockchain wallet address | `0x1234...abcd` | Pseudonymous, not personal |
| Compliance Boolean | Attestation result (pass/fail) | `true` / `false` | No personal details |
| Timestamp | Block timestamp | `1738234800` | Event timing only |
| Claim Topic ID | Numeric reference to claim type | `10001` (age verification) | Reference only, not content |
| Event Type Enum | Lifecycle state | `created`, `transferred`, `serviced`, `decommissioned` | Category only |

### 2.2 Off-Chain Data (Erasable)

The following data types MUST be stored off-chain because they contain or could reveal personal information:

| Data Element | Description | Contains PII | Erasure Required |
|--------------|-------------|--------------|------------------|
| Full DPP Content | Materials, sustainability, origin | Potentially (artisan attribution) | Yes |
| Lifecycle Event Details | Repair notes, service records | Yes (customer interactions) | Yes |
| Customer Purchase Data | Name, address, preferences | Yes (direct PII) | Yes |
| Artisan/Creator Information | Craftsperson attribution | Yes (names, photos) | Yes |
| KYC/KYB Documents | Identity verification evidence | Yes (identity documents) | Yes |
| Scanned Certificates | Authenticity certificates | Potentially (signatures) | Yes |
| Claim Content | W3C Verifiable Credentials | Yes (subject information) | Yes |
| Images and Media | Product and person photographs | Potentially (faces) | Yes |

### 2.3 Explicitly Prohibited On-Chain

The following data types are **NEVER permitted on-chain**, regardless of encryption or hashing:

| Prohibited Data | Reason | GDPR Basis |
|-----------------|--------|------------|
| Natural person names | Direct identifier | Art. 4(1) |
| Physical addresses | Direct identifier | Art. 4(1) |
| Email addresses | Direct identifier | Art. 4(1) |
| Phone numbers | Direct identifier | Art. 4(1) |
| Photographs of individuals | Biometric data potential | Art. 9 |
| Government ID numbers | Direct identifier | Art. 4(1) |
| Date of birth | Indirect identifier | Art. 4(1) |
| **Encrypted PII** | Still personal data under GDPR | Recital 26 |
| **Hashed PII** | Still personal data under GDPR | Recital 26 |

**Critical Note on Encryption and Hashing:**

> Encrypted or hashed personal data remains personal data under GDPR. The EDPB explicitly states: "Encrypted or hashed data remains personal data under GDPR." Encryption is a security measure, not an anonymization technique. If the data can be re-linked to a natural person (even theoretically), it is still personal data.

---

## 3. EDPB Guidelines 02/2025 Compliance Checklist

### 3.1 Implementation Checklist

Use this checklist to verify GDPR compliance for any Galileo Luxury Standard implementation:

**Data Storage:**
- [ ] No personal data stored directly on blockchain
- [ ] All PII resides in erasable off-chain storage
- [ ] Hash-to-content mapping enables orphaning for erasure
- [ ] Content hashes do not contain embedded personal data

**Data Subject Rights:**
- [ ] Right to access: Can provide all stored data to subject
- [ ] Right to rectification: Can correct off-chain data
- [ ] Right to erasure: Can delete within 30 days (GDPR standard)
- [ ] Right to portability: Can export in machine-readable format

**Legal Basis:**
- [ ] Legal basis documented for each processing operation
- [ ] Consent obtained where required (not legitimate interest overreach)
- [ ] Purpose limitation respected (no scope creep)

**Accountability:**
- [ ] DPIA completed for blockchain processing
- [ ] Controller/processor relationships defined for node operators
- [ ] Records of processing activities maintained
- [ ] DPO consulted (if applicable)

**Technical Measures:**
- [ ] "Technical impossibility" NOT used as compliance defense
- [ ] Off-chain storage supports deletion within GDPR timelines
- [ ] Audit trail of deletions maintained
- [ ] Encryption keys can be selectively destroyed

### 3.2 Key EDPB Statements

The following direct quotes from EDPB Guidelines 02/2025 govern this architecture:

> "The EDPB recommends not storing personal data directly in a blockchain at all."

This is not optional guidance; implementations MUST follow this recommendation.

> "Technical impossibility is not a justification for disregarding the rights of data subjects."

Claims that blockchain immutability prevents GDPR compliance are invalid. If the architecture cannot comply, it must not store personal data.

> "Encrypted or hashed data remains personal data under GDPR."

Encryption and hashing are security measures, not anonymization. Encrypted PII on-chain is still personal data on-chain.

> "A data protection impact assessment (DPIA) is required for blockchain processing of personal data."

Any implementation processing personal data through blockchain technology requires a DPIA before deployment.

### 3.3 Controller/Processor Considerations

EDPB Guidelines 02/2025 raise important questions about liability:

| Role | Responsibility | Galileo Context |
|------|----------------|-----------------|
| Data Controller | Determines purposes and means | Brand registering products |
| Data Processor | Processes on behalf of controller | Node operators, resolver services |
| Joint Controllers | Jointly determine purposes | Consortium members (potential) |

**Recommendation:** Legal review required for consortium liability model. Node operators in a permissioned network may be considered joint controllers under EDPB interpretation.

---

## 4. CRAB Model (Create-Read-Append-Burn)

### 4.1 Model Overview

The CRAB model enables right-to-erasure compliance while maintaining blockchain integrity:

| Operation | Description | GDPR Relevance |
|-----------|-------------|----------------|
| **C**reate | Store PII off-chain, reference (hash) on-chain | Data minimization |
| **R**ead | Access via hash lookup | Right to access |
| **A**ppend | New events add new hashes (no mutation) | Accurate records |
| **B**urn | Delete off-chain content + destroy encryption key | Right to erasure |

### 4.2 Erasure Request Flow

When a data subject exercises their right to erasure (GDPR Article 17):

```
Erasure Request Flow:

1. RECEIVE REQUEST
   - Data subject submits deletion request
   - Verify identity and right to request
   - Document request receipt timestamp

2. LOCATE DATA
   - Query on-chain hash references for subject
   - Map hashes to off-chain content IDs
   - Identify all affected off-chain records

3. DELETE OFF-CHAIN CONTENT
   - Remove PII from off-chain storage
   - Remove from all backup locations
   - Remove from any caches

4. DESTROY ENCRYPTION KEY (if CRAB encryption used)
   - Locate encryption key in HSM/key store
   - Execute secure key destruction
   - Remove key from all backup locations

5. ORPHAN ON-CHAIN REFERENCES
   - On-chain hash now points to nothing
   - Hash becomes meaningless without content
   - Blockchain integrity preserved

6. AUDIT LOGGING
   - Log key destruction event
   - Log off-chain deletion confirmation
   - Maintain audit trail (non-PII)

7. CONFIRM TO DATA SUBJECT
   - Notify completion within GDPR timeline
   - Document compliance evidence
```

### 4.3 Key Destruction Requirements

When CRAB encryption is used, key destruction is the final guarantor of erasure:

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| Key Storage | HSM-based key management recommended | Secure destruction capability |
| Destruction Method | Cryptographic erasure (overwrite, not just delete) | Prevent recovery |
| Backup Keys | ALL backup copies must be destroyed | Complete erasure |
| Audit Trail | Key destruction must be auditable | Compliance evidence |
| Time Limit | 30 days from valid request | GDPR standard timeline |
| Verification | Independent verification of destruction | Accountability |

### 4.4 Orphaned Hash State

After successful erasure:

```
BEFORE ERASURE:
+------------------+          +------------------+
| On-Chain         |  --ref-> | Off-Chain        |
| Hash: 0x7a3b5c   |          | PII Content      |
+------------------+          +------------------+

AFTER ERASURE:
+------------------+          +------------------+
| On-Chain         |  --ref-> | [DELETED]        |
| Hash: 0x7a3b5c   |          |                  |
+------------------+          +------------------+
       |
       v
  Orphaned: points to nothing
  Blockchain intact
  PII erased
```

The on-chain hash remains (blockchain immutability preserved), but it now references nothing. Without the off-chain content and/or encryption key, the hash is meaningless data.

### 4.5 Limitations and Considerations

| Consideration | Impact | Mitigation |
|---------------|--------|------------|
| Hash cannot be removed | Blockchain immutability | Acceptable - orphaned hash is not personal data |
| Metadata leakage | Timestamps, addresses remain | Design to minimize metadata; addresses are pseudonymous |
| Proof of deletion | Cannot prove negative | Maintain audit trail of deletion actions |
| Third-party copies | Others may have cached content | Erasure obligations extend to processors |

---

## 5. Event Sourcing Protocol

### 5.1 Source of Truth Hierarchy

The hybrid architecture requires clear rules for which system is authoritative for different data types:

```
SOURCE OF TRUTH HIERARCHY

+----------------------------------------------------------------+
|  OWNERSHIP & ATTESTATION: On-Chain is Authoritative            |
|                                                                |
|  - Token ownership (who owns the product)                      |
|  - Compliance attestation results (pass/fail)                  |
|  - Timestamp of events (block timestamp)                       |
|  - Identity claim validity (claim topic + result)              |
|                                                                |
|  Reason: Blockchain provides finality and tamper-evidence      |
+----------------------------------------------------------------+

+----------------------------------------------------------------+
|  CONTENT & PII: Off-Chain is Authoritative                     |
|                                                                |
|  - Full product details (DPP content)                          |
|  - Personal information (customer, artisan)                    |
|  - Document attachments (certificates, images)                 |
|  - Claim content (W3C Verifiable Credentials)                  |
|                                                                |
|  Reason: Must support updates, corrections, and deletion       |
+----------------------------------------------------------------+

+----------------------------------------------------------------+
|  CONFLICT RESOLUTION                                           |
|                                                                |
|  - Ownership disputes: On-chain wins (blockchain finality)     |
|  - Content disputes: Off-chain wins (latest version)           |
|  - Hash mismatch: Flag for reconciliation, do NOT auto-resolve |
|                                                                |
|  Reason: Preserve data integrity while enabling GDPR rights    |
+----------------------------------------------------------------+
```

### 5.2 Event Flow Protocol

All product lifecycle events follow this standardized flow to ensure consistency between on-chain and off-chain systems:

```
PRODUCT LIFECYCLE EVENT FLOW

+-------------------------------------------------------------------+
|  1. ACTION OCCURS                                                 |
|     - Product created, transferred, serviced, or decommissioned   |
|     - Trigger: User action, system automation, or external event  |
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|  2. OFF-CHAIN FIRST                                               |
|     - Store complete event details in off-chain store             |
|     - Generate unique off-chain content ID                        |
|     - Include all PII and documents                               |
|     - Encryption applied if CRAB model used                       |
|                                                                   |
|     CRITICAL: Never proceed to step 3 until off-chain confirmed   |
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|  3. COMPUTE HASH                                                  |
|     - SHA-256 hash of canonical JSON representation               |
|     - Include version field for schema evolution                  |
|     - Hash algorithm ID in metadata for crypto-agility            |
|                                                                   |
|     Hash Input: { version: "1.0", data: {...}, algorithm: "sha256" }
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|  4. ON-CHAIN EVENT                                                |
|     - Emit event with: productDID, eventType, contentHash,        |
|       timestamp                                                   |
|     - No PII ever touches blockchain                              |
|     - Emitter address recorded automatically                      |
|                                                                   |
|     Event: ProductLifecycleEvent(did, type, hash, block.timestamp)|
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|  5. INDEX UPDATE                                                  |
|     - Off-chain indexer links contentHash -> offChainId           |
|     - Enable forward lookup (hash to content)                     |
|     - Enable reverse lookup (product to events)                   |
|                                                                   |
|     Index Entry: { hash: "0x...", contentId: "uuid", productDid } |
+-------------------------------------------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|  6. VERIFICATION                                                  |
|     - Re-hash off-chain content                                   |
|     - Compare with on-chain hash                                  |
|     - Flag discrepancies for investigation                        |
|                                                                   |
|     Result: VERIFIED | MISMATCH | ORPHANED                        |
+-------------------------------------------------------------------+
```

### 5.3 Failure Handling

Robust failure handling ensures data consistency across the hybrid architecture:

| Failure Scenario | Detection | Recovery Procedure | Data State |
|------------------|-----------|-------------------|------------|
| **Off-chain write fails** | HTTP error, timeout | Retry with exponential backoff; do NOT emit on-chain event until confirmed | No data loss; action not recorded |
| **On-chain write fails** | Transaction revert, gas error | Content exists off-chain; retry on-chain emission | Content safe; retry without data loss |
| **Hash mismatch detected** | Verification step fails | Quarantine record; investigate; manual resolution required | Both versions preserved for audit |
| **Indexer lag** | Query returns stale data | Graceful degradation; on-chain events always available | Eventually consistent |
| **Network partition** | Off-chain unavailable | Queue on-chain events; replay to off-chain when recovered | Temporary inconsistency |

**Critical Recovery Principle:**

> Off-chain write MUST complete before on-chain event emission. If off-chain fails, the event never happened. If on-chain fails, retry is safe because off-chain content is idempotent.

### 5.4 Canonical JSON Format

To ensure consistent hashing across implementations, use canonical JSON serialization:

```json
{
  "$schema": "https://schemas.galileoprotocol.io/event/v1.0/schema.json",
  "version": "1.0",
  "algorithm": "sha256",
  "timestamp": "2026-01-30T13:05:19Z",
  "eventType": "created",
  "productDid": "did:galileo:01:09506000134352:21:ABC123",
  "content": {
    // Sorted keys, no whitespace, UTF-8 normalized
  }
}
```

**Canonicalization Rules:**
- Keys sorted alphabetically (recursive)
- No trailing commas
- No whitespace between elements
- UTF-8 NFC normalization
- Dates in ISO 8601 format (UTC)
- Numbers as JSON numbers (not strings)

---

## 6. Component Interaction Diagrams

### 6.1 Core Architecture Components

```
                           GALILEO LUXURY STANDARD ARCHITECTURE

+----------------------------------------------------------------------------------------+
|                                     ON-CHAIN LAYER                                     |
|                                                                                        |
|  +-------------------+     +-------------------+     +-------------------+              |
|  |                   |     |                   |     |                   |              |
|  |  Product Token    |<--->|  Identity         |<--->|  Compliance       |              |
|  |  (ERC-3643)       |     |  Registry         |     |  Module           |              |
|  |                   |     |  (ONCHAINID)      |     |                   |              |
|  |  - tokenId        |     |  - identityAddr   |     |  - rules[]        |              |
|  |  - owner          |     |  - claimTopics[]  |     |  - canTransfer()  |              |
|  |  - contentHash    |     |  - claimIssuers[] |     |  - checkClaim()   |              |
|  |                   |     |                   |     |                   |              |
|  +-------------------+     +-------------------+     +-------------------+              |
|           |                         |                         |                        |
+-----------|-------------------------|-------------------------|------------------------+
            |                         |                         |
============|=========================|=========================|========================
            |    ON-CHAIN/OFF-CHAIN   |       BOUNDARY          |
============|=========================|=========================|========================
            |                         |                         |
+-----------|-------------------------|-------------------------|------------------------+
|           v                         v                         v                        |
|  +-------------------+     +-------------------+     +-------------------+              |
|  |                   |     |                   |     |                   |              |
|  |  DPP Content      |     |  Claim Storage    |     |  Compliance       |              |
|  |  Store            |     |  (VCs)            |     |  Evidence         |              |
|  |                   |     |                   |     |                   |              |
|  |  - productDetails |     |  - vcDocuments    |     |  - kycDocs        |              |
|  |  - lifecycle[]    |     |  - proofs         |     |  - auditLogs      |              |
|  |  - media[]        |     |  - revocations    |     |  - reports        |              |
|  |                   |     |                   |     |                   |              |
|  +-------------------+     +-------------------+     +-------------------+              |
|                                                                                        |
|                                     OFF-CHAIN LAYER                                    |
+----------------------------------------------------------------------------------------+
```

### 6.2 GS1 Resolution Flow

```
                              CONSUMER SCAN FLOW

[Physical Product] --scan--> [QR Code / NFC Tag]
        |
        |  contains: https://id.gs1.org/01/09506000134352/21/ABC123
        |
        v
+------------------+
|  GS1 Digital     |
|  Link Resolver   |
|                  |
|  (id.gs1.org or  |
|  resolver.galileo|
|  .luxury)        |
+------------------+
        |
        |  HTTP 303 redirect based on:
        |  - Accept header (application/ld+json, text/html)
        |  - Link relations (gs1:pip, gs1:hasRetailers)
        |  - Query parameters (?linkType=gs1:pip)
        |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+     +---------------+     +---------------+
|               |     |               |     |               |
| Consumer View |     | Brand View    |     | Regulator     |
| (Public DPP)  |     | (Full Access) |     | View          |
|               |     |               |     |               |
| - Materials   |     | - All history |     | - Compliance  |
| - Care info   |     | - Customer    |     | - Audit trail |
| - Origin      |     |   data        |     | - Evidence    |
| - Sustain.    |     | - Analytics   |     |               |
|               |     |               |     |               |
+---------------+     +---------------+     +---------------+

        ^                     ^                     ^
        |                     |                     |
        +---------------------+---------------------+
                              |
                    (Context detection via
                     authentication/headers)
```

### 6.3 Ownership Transfer Flow

```
                           OWNERSHIP TRANSFER FLOW

+----------------------------------------------------------------------------+
|  1. INITIATE TRANSFER                                                      |
|                                                                            |
|  Seller: "I want to transfer product X to buyer Y"                         |
|  Input: productDID, buyerIdentity                                          |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  2. BUYER IDENTITY VERIFICATION                                            |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | Buyer Identity    |-------->| Identity Registry     |                   |
|  | (wallet address)  |         | (ONCHAINID)           |                   |
|  +-------------------+         |                       |                   |
|                                | - Has required claims?|                   |
|                                | - Claims not expired? |                   |
|                                | - Claims not revoked? |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
                                    |
                                    v (claims verified)
+----------------------------------------------------------------------------+
|  3. COMPLIANCE CHECK                                                       |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | Transfer Request  |-------->| Compliance Module     |                   |
|  |                   |         |                       |                   |
|  +-------------------+         | - Check country rules |                   |
|                                | - Check investor      |                   |
|                                |   limits              |                   |
|                                | - Custom rules        |                   |
|                                |                       |                   |
|                                | Returns: true/false   |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
                                    |
                                    v (if compliant: true)
+----------------------------------------------------------------------------+
|  4. TOKEN TRANSFER                                                         |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | Execute Transfer  |-------->| Product Token         |                   |
|  | (safeTransferFrom)|         | (ERC-3643)            |                   |
|  +-------------------+         |                       |                   |
|                                | - Update owner        |                   |
|                                | - Emit Transfer event |                   |
|                                | - Record timestamp    |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  5. OFF-CHAIN SYNC                                                         |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | Transfer Event    |-------->| Event Listener        |                   |
|  | (on-chain)        |         | (Indexer)             |                   |
|  +-------------------+         |                       |                   |
|                                | - Capture event       |                   |
|                                | - Lookup contentHash  |                   |
|                                | - Update off-chain    |                   |
|                                +-----------------------+                   |
|                                           |                                |
|                                           v                                |
|                                +-----------------------+                   |
|                                | DPP Content Store     |                   |
|                                |                       |                   |
|                                | - Add transfer record |                   |
|                                | - Update current owner|                   |
|                                | - Compute new hash    |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  6. COMPLETION                                                             |
|                                                                            |
|  - On-chain: New owner recorded, event emitted                             |
|  - Off-chain: DPP updated with transfer history                            |
|  - Hashes: Verified to match                                               |
+----------------------------------------------------------------------------+
```

### 6.4 Product Creation Flow

```
                            PRODUCT CREATION FLOW

Brand Admin: "Register new product in Galileo"

+----------------------------------------------------------------------------+
|  1. PREPARE OFF-CHAIN DATA                                                 |
|                                                                            |
|  +------------------------------------------+                              |
|  | DPP Content:                             |                              |
|  | - Product details (materials, origin)    |                              |
|  | - Artisan attribution (if applicable)    |                              |
|  | - Certifications                         |                              |
|  | - Images and media                       |                              |
|  +------------------------------------------+                              |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  2. STORE OFF-CHAIN (must complete before on-chain)                        |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | DPP Content       |-------->| Off-Chain Store       |                   |
|  |                   |         |                       |                   |
|  +-------------------+         | - Store content       |                   |
|                                | - Generate contentId  |                   |
|                                | - Apply encryption    |                   |
|                                | - Return: contentId   |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  3. COMPUTE CONTENT HASH                                                   |
|                                                                            |
|  +------------------------------------------+                              |
|  | Input: Canonical JSON of DPP content     |                              |
|  | Algorithm: SHA-256                        |                              |
|  | Output: 0x7a3b5c2d1e...                   |                              |
|  +------------------------------------------+                              |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  4. MINT TOKEN (on-chain)                                                  |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | Mint Request      |-------->| Product Token         |                   |
|  | - productDID      |         | (ERC-3643)            |                   |
|  | - contentHash     |         |                       |                   |
|  | - brandIdentity   |         | - Mint new token      |                   |
|  +-------------------+         | - Set initial owner   |                   |
|                                | - Store contentHash   |                   |
|                                | - Emit Created event  |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------------+
|  5. INDEX AND VERIFY                                                       |
|                                                                            |
|  +-------------------+         +-----------------------+                   |
|  | Created Event     |-------->| Indexer               |                   |
|  |                   |         |                       |                   |
|  +-------------------+         | - Link hash->content  |                   |
|                                | - Verify hash match   |                   |
|                                | - Update search index |                   |
|                                +-----------------------+                   |
+----------------------------------------------------------------------------+
```

---

## 7. Implementation Notes

### 7.1 Off-Chain Storage Requirements

Implementations MUST choose off-chain storage that supports GDPR compliance:

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **Deletion Support** | Must support deletion within 30 days | GDPR Art. 17 timeline |
| **Audit Trail** | Must maintain audit trail of deletions | Accountability |
| **Encryption at Rest** | AES-256 or equivalent | Data protection |
| **Access Control** | Role-based with audit logging | Principle of least privilege |
| **Geographic Control** | EU data residency option | Cross-border transfer rules |
| **Backup Management** | Backups must be deletable | Complete erasure |

**Recommended Storage Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **PostgreSQL/MySQL** | Mature, full GDPR toolkit | Centralized | Good for MVP |
| **IPFS + Garbage Collection** | Decentralized, content-addressable | Complex deletion | Advanced use |
| **Traditional Object Store (S3)** | Scalable, lifecycle policies | Vendor lock-in | Production scale |
| **Encrypted Database + HSM** | Maximum CRAB support | Complex key management | High security |

**NOT Recommended:**

| Option | Reason |
|--------|--------|
| **IPFS without pinning control** | Immutable by default; cannot guarantee deletion |
| **Public IPFS gateways** | No deletion capability |
| **Filecoin** | Designed for permanence; conflicts with erasure |
| **Arweave** | Explicitly permanent; GDPR incompatible for PII |

### 7.2 Hash Algorithm Selection

**Current Standard:**
```
Algorithm: SHA-256
Output: 256 bits (32 bytes)
Encoding: Hexadecimal with 0x prefix
Example: 0x7a3b5c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
```

**Crypto-Agility Path:**

| Timeline | Algorithm | Status | Action |
|----------|-----------|--------|--------|
| 2026 (Now) | SHA-256 | Production | Use as default |
| 2027-2028 | SHA-3-256 | Available | Add as option |
| 2028-2030 | BLAKE3 | Emerging | Evaluate for performance |

**Implementation Pattern:**
```
Content Hash Format:
{
  "hash": "0x7a3b5c...",
  "algorithm": "sha256",      // Algorithm identifier
  "version": "1.0"            // Schema version
}
```

Always include algorithm ID in metadata to enable future migration without breaking verification.

### 7.3 Indexer Requirements

The off-chain indexer bridges on-chain events with off-chain content:

| Requirement | Specification | Notes |
|-------------|---------------|-------|
| **Consistency Model** | Eventually consistent acceptable | 5-second typical lag |
| **Reorg Handling** | Must handle chain reorganizations | 12+ block confirmation |
| **Point-in-Time Queries** | Must support historical queries | For audit purposes |
| **Hash Lookup** | O(1) hash to content lookup | Primary use case |
| **Product Lookup** | O(log n) product to events lookup | Secondary use case |

**Recommended Indexer Technologies:**

| Technology | Use Case | Scalability |
|------------|----------|-------------|
| **The Graph (Subgraph)** | EVM event indexing | High |
| **EventStoreDB** | Event sourcing native | High |
| **PostgreSQL + pg_notify** | Simple implementation | Medium |
| **Apache Kafka** | High-throughput streaming | Very High |

### 7.4 ERC-3643 Integration Notes

The hybrid architecture aligns with existing ERC-3643 ONCHAINID patterns:

```
ERC-3643 HYBRID PATTERN

+-----------------------------------+
|  ONCHAINID (On-Chain)             |
|  - Identity address               |
|  - Claim topic IDs (10001, etc.)  |
|  - Claim issuer addresses         |
|  - Claim validity boolean         |
+-----------------------------------+
            |
            | topic ID references
            v
+-----------------------------------+
|  Claim Issuer (Off-Chain)         |
|  - W3C Verifiable Credential      |
|  - Full claim content             |
|  - Subject PII                    |
|  - Evidence documents             |
+-----------------------------------+
```

The Galileo Luxury Standard extends this pattern to product data:

| ERC-3643 Concept | Galileo Extension |
|------------------|-------------------|
| Identity Token | Product Token |
| Claim Topics | Product Events |
| Claim Issuers | Authorized Event Emitters |
| Claim Content | DPP Content |

### 7.5 Security Considerations

| Consideration | Mitigation |
|---------------|------------|
| **Content Hash Collision** | SHA-256 collision is computationally infeasible |
| **Rainbow Table for Hashes** | Content is complex; salt optional but unnecessary |
| **Off-Chain Tampering** | Hash verification detects any modification |
| **Replay Attacks** | Timestamps and transaction ordering prevent replay |
| **Key Compromise (CRAB)** | HSM with hardware attestation recommended |

### 7.6 Performance Considerations

| Operation | Target Latency | Notes |
|-----------|---------------|-------|
| Hash Computation | < 10ms | SHA-256 is fast |
| Off-Chain Write | < 100ms | Database dependent |
| On-Chain Event | 12-15 seconds | Block time dependent |
| Index Update | < 5 seconds | Eventually consistent |
| Full Resolution | < 500ms | Cache-dependent |

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Specification ID** | HYBRID-ARCH-001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-01-30 |
| **Last Modified** | 2026-01-30 |
| **Authors** | Galileo Luxury Standard TSC |
| **Requirement** | FOUND-01 |
| **Compliance** | EDPB Guidelines 02/2025, GDPR |

---

*End of Hybrid Architecture Specification*
