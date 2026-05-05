# GDPR Compliance Implementation Guide

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-02-01
**Specification ID:** GGUIDE-COMPLIANCE-001

---

## Table of Contents

1. [Overview](#1-overview)
2. [EDPB Guidelines 02/2025 - Blockchain Requirements](#2-edpb-guidelines-022025---blockchain-requirements)
3. [Data Controller/Processor Roles](#3-data-controllerprocessor-roles)
4. [Data Classification Guide](#4-data-classification-guide)
5. [Right to Erasure Implementation (Article 17)](#5-right-to-erasure-implementation-article-17)
6. [Data Minimization](#6-data-minimization)
7. [GDPR-AML Conflict Resolution](#7-gdpr-aml-conflict-resolution)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Common Pitfalls](#9-common-pitfalls)
10. [Regulatory References](#10-regulatory-references)

---

## 1. Overview

### 1.1 Purpose

This guide enables Galileo adopters to implement GDPR-compliant data processing within the hybrid on-chain/off-chain architecture. It translates the technical specifications in `hybrid-architecture.md` into actionable implementation steps.

### 1.2 Key Regulation

**EDPB Guidelines 02/2025** on the processing of personal data through blockchain technologies represent the authoritative EU regulatory position on GDPR-blockchain compatibility. These guidelines were adopted April 8, 2025 and provide definitive guidance for blockchain-based systems.

### 1.3 Core Pattern: CRAB Model

The **CRAB (Create-Read-Append-Burn)** model is the foundational pattern for GDPR compliance in Galileo:

| Operation | Description | GDPR Relevance |
|-----------|-------------|----------------|
| **C**reate | Store PII off-chain, reference (hash) on-chain | Data minimization |
| **R**ead | Access via hash lookup | Right to access |
| **A**ppend | New events add new hashes (no mutation) | Accurate records |
| **B**urn | Delete off-chain content + destroy encryption key | Right to erasure |

**Reference:** `specifications/architecture/hybrid-architecture.md` Section 4

### 1.4 Fundamental Principle

> **"When in doubt, store off-chain."**

Any data that could potentially be linked to a natural person MUST be stored off-chain in erasable storage. This is not a recommendation; it is a mandatory design constraint for GDPR compliance.

---

## 2. EDPB Guidelines 02/2025 - Blockchain Requirements

### 2.1 Key Regulatory Statements

The following direct quotes from EDPB Guidelines 02/2025 govern Galileo implementations:

**On Personal Data Storage:**
> "The EDPB recommends not storing personal data directly in a blockchain at all."

**On Technical Impossibility:**
> "Technical impossibility is not a justification for disregarding the rights of data subjects."

**On Encryption/Hashing:**
> "Encrypted or hashed data remains personal data under GDPR."

**On DPIA Requirement:**
> "Since blockchain-based processing of personal data regularly entails high risks for data subjects, a comprehensive DPIA is imperative."

### 2.2 Regulatory Implications for Galileo

| EDPB Requirement | Galileo Implementation |
|------------------|------------------------|
| No PII on blockchain | All personal data stored off-chain only |
| Erasure must be possible | CRAB model enables key destruction |
| Encrypted PII is still PII | No encrypted PII on-chain either |
| DPIA required | Template provided in this guide |
| Controller/processor roles defined | Per Section 3 of this guide |

### 2.3 Functional Erasure Standard

EDPB Guidelines 02/2025 establish a three-part test for functional anonymization (erasure):

1. **Singling out:** Cannot isolate a data subject
2. **Linkability:** Cannot link records relating to the same subject
3. **Inferability:** Cannot deduce information about a subject

The CRAB model satisfies this test by:
- Destroying encryption keys (content unreadable)
- Orphaning on-chain hashes (no content to link)
- Removing all off-chain records (no inference possible)

---

## 3. Data Controller/Processor Roles

### 3.1 Role Definitions

| Role | Definition | Galileo Context |
|------|------------|-----------------|
| **Data Controller** | Determines purposes and means of processing | Brand registering products |
| **Data Processor** | Processes data on behalf of controller | Node operators, resolver services |
| **Joint Controllers** | Jointly determine purposes | Consortium members (potential) |

### 3.2 Responsibility Matrix

| Processing Activity | Controller | Processor | Notes |
|---------------------|------------|-----------|-------|
| Product registration | Brand | Galileo infrastructure | Brand decides what data to include |
| DPP creation | Brand | Off-chain storage provider | Brand owns DPP content |
| Identity verification | Brand | KYC provider | Via ONCHAINID |
| Node operation | Consortium | Node operators | Joint controller consideration |
| Resolver queries | - | Resolver service | May be processor for Brand |

### 3.3 Legal Agreements Required

- [ ] Data Processing Agreements (DPAs) with all processors
- [ ] Joint Controller Arrangements for consortium operations
- [ ] Standard Contractual Clauses for international transfers

**Recommendation:** Legal review required for consortium liability model. Node operators in a permissioned network may be considered joint controllers under EDPB interpretation.

---

## 4. Data Classification Guide

### 4.1 On-Chain Data (Immutable - NO PII)

The following data types MAY be stored on-chain because they cannot identify a natural person:

| Data Element | Example | Rationale |
|--------------|---------|-----------|
| Product DID | `did:galileo:01:09506000134352:21:ABC123` | Identifies product, not person |
| Content Hash | `0x7a3b5c...` | Integrity verification only |
| Ownership Address | `0x1234...abcd` | Pseudonymous wallet address |
| Compliance Boolean | `true` / `false` | No personal details |
| Timestamp | `1738234800` | Event timing only |
| Claim Topic ID | `10001` | Reference only, not content |
| Event Type Enum | `transferred`, `serviced` | Category only |

**Reference:** `hybrid-architecture.md` Section 2.1

### 4.2 Off-Chain Data (Erasable - ALL PII)

The following data types MUST be stored off-chain:

| Data Element | Contains PII | Erasure Required |
|--------------|--------------|------------------|
| Full DPP Content | Potentially (artisan attribution) | Yes |
| Lifecycle Event Details | Yes (customer interactions) | Yes |
| Customer Purchase Data | Yes (direct PII) | Yes |
| Artisan/Creator Information | Yes (names, photos) | Yes |
| KYC/KYB Documents | Yes (identity documents) | Yes |
| Scanned Certificates | Potentially (signatures) | Yes |
| Claim Content (VCs) | Yes (subject information) | Yes |
| Images and Media | Potentially (faces) | Yes |

### 4.3 Explicitly Prohibited On-Chain

The following are **NEVER permitted on-chain**, regardless of encryption or hashing:

| Prohibited Data | GDPR Basis |
|-----------------|------------|
| Natural person names | Art. 4(1) - Direct identifier |
| Physical addresses | Art. 4(1) - Direct identifier |
| Email addresses | Art. 4(1) - Direct identifier |
| Phone numbers | Art. 4(1) - Direct identifier |
| Photographs of individuals | Art. 9 - Biometric potential |
| Government ID numbers | Art. 4(1) - Direct identifier |
| Date of birth | Art. 4(1) - Indirect identifier |
| **Encrypted PII** | Recital 26 - Still personal data |
| **Hashed PII** | Recital 26 - Still personal data |

**Critical Note:**
> Encryption is a security measure, not an anonymization technique. If data can be re-linked to a natural person (even theoretically), it remains personal data under GDPR.

---

## 5. Right to Erasure Implementation (Article 17)

### 5.1 CRAB Model Erasure Workflow

The CRAB model enables right-to-erasure compliance while maintaining blockchain integrity:

```
ERASURE REQUEST WORKFLOW
========================

1. RECEIVE REQUEST
   |
   +-> Accept via designated channel (email, portal, API)
   +-> Generate unique request ID (UUID v7)
   +-> Log request receipt timestamp
   +-> Start 30-day GDPR response timer
   +-> Send acknowledgment to requester
   |
   v

2. VALIDATE REQUESTER IDENTITY
   |
   +-> Verify requester is data subject (or authorized representative)
   +-> Require identity confirmation (knowledge-based or document)
   +-> Log verification outcome
   +-> If verification fails: Reject with reason, close request
   |
   v

3. INVENTORY DATA
   |
   +-> Query all systems for data subject's personal data
   +-> Categorize data by retention schedule
   +-> Identify on-chain content hashes
   +-> Map hashes to off-chain content IDs
   +-> Document complete data inventory
   |
   v

4. CHECK RETENTION OBLIGATIONS
   |
   +-> Check for AML retention (5 years)
   +-> Check for audit retention (7 years)
   +-> Check for legal holds
   +-> Check for ongoing investigations
   +-> Reference: data-retention.md Section 4
   |
   +---------------+---------------+
   |                               |
   v                               v

5A. RETENTION APPLIES          5B. NO RETENTION
   |                               |
   +-> Document legal basis        +-> Proceed to full erasure
   +-> Refuse specific data        |
   +-> Erase eligible data         |
   +-> Notify data subject         |
   |                               |
   +---------------+---------------+
                   |
                   v

6. EXECUTE ERASURE (CRAB BURN)
   |
   For each eligible data record:
   +-> Delete off-chain content from primary storage
   +-> Delete from all backup locations
   +-> Clear from caches
   +-> Destroy encryption key (if CRAB encryption used)
   +-> Log erasure action with timestamp
   +-> Verify deletion completion
   |
   v

7. ORPHAN ON-CHAIN REFERENCES
   |
   +-> On-chain hash now points to nothing
   +-> No action required on blockchain
   +-> Hash becomes meaningless without content
   +-> Document orphaned hashes in audit trail
   |
   v

8. NOTIFY DATA SUBJECT
   |
   +-> Send within 30-day GDPR deadline
   +-> Include: completed actions, retained data (with reason)
   +-> Log notification delivery
   |
   v

9. AUDIT TRAIL
   |
   +-> Record complete erasure workflow
   +-> Retain: request ID, timestamps, actions
   +-> Do NOT retain: actual deleted content
   +-> Audit trail subject to 7-year retention
```

**Reference:** `data-retention.md` Section 6

### 5.2 Code Example: Erasure Request Handler

```typescript
// erasure-handler.ts
// Reference: hybrid-architecture.md Section 4

interface ErasureRequest {
  requestId: string;
  dataSubjectId: string;
  requestDate: Date;
  dataCategories: DataCategory[];
}

interface ErasureResult {
  requestId: string;
  completedAt: Date;
  erasedCategories: DataCategory[];
  retainedCategories: { category: DataCategory; reason: string; eligibleDate: Date }[];
  orphanedHashes: string[];
}

enum DataCategory {
  CUSTOMER_PII = 'customer_pii',
  KYC_RECORDS = 'kyc_records',
  TRANSACTION_LOGS = 'transaction_logs',
  AUDIT_TRAIL = 'audit_trail',
  PRODUCT_DATA = 'product_data'
}

async function processErasureRequest(request: ErasureRequest): Promise<ErasureResult> {
  // Step 1: Validate requester identity
  await verifyDataSubjectIdentity(request.dataSubjectId);

  // Step 2: Inventory all data
  const dataInventory = await inventoryDataForSubject(request.dataSubjectId);

  // Step 3: Check retention obligations (GDPR-AML conflict resolution)
  const { eligible, retained } = categorizeByRetention(dataInventory);

  // Step 4: Execute erasure on eligible data
  const orphanedHashes: string[] = [];
  for (const record of eligible) {
    // Delete off-chain content
    await deleteOffChainContent(record.contentId);

    // Delete from backups
    await deleteFromBackups(record.contentId);

    // Clear from caches
    await clearFromCache(record.contentId);

    // Destroy encryption key (if CRAB encryption used)
    if (record.encryptionKeyId) {
      await destroyEncryptionKey(record.encryptionKeyId);
    }

    // Track orphaned hash for audit
    if (record.onChainHash) {
      orphanedHashes.push(record.onChainHash);
    }
  }

  // Step 5: Log audit trail (non-PII)
  await logErasureAudit({
    requestId: request.requestId,
    erasedCount: eligible.length,
    retainedCount: retained.length,
    orphanedHashes,
    completedAt: new Date()
  });

  return {
    requestId: request.requestId,
    completedAt: new Date(),
    erasedCategories: eligible.map(r => r.category),
    retainedCategories: retained,
    orphanedHashes
  };
}

// Helper: Categorize data by retention requirements
function categorizeByRetention(
  inventory: DataRecord[]
): { eligible: DataRecord[]; retained: { category: DataCategory; reason: string; eligibleDate: Date }[] } {
  const eligible: DataRecord[] = [];
  const retained: { category: DataCategory; reason: string; eligibleDate: Date }[] = [];

  for (const record of inventory) {
    const retentionEnd = calculateRetentionEnd(record);

    if (retentionEnd <= new Date()) {
      eligible.push(record);
    } else {
      retained.push({
        category: record.category,
        reason: getRetentionReason(record),
        eligibleDate: retentionEnd
      });
    }
  }

  return { eligible, retained };
}

// Helper: Get retention reason for refusal response
function getRetentionReason(record: DataRecord): string {
  switch (record.category) {
    case DataCategory.KYC_RECORDS:
      return 'GDPR Article 17(3)(b): 5AMLD Article 40 requires retention for 5 years';
    case DataCategory.TRANSACTION_LOGS:
      return 'GDPR Article 17(3)(b): MiCA TFR 2023/1113 requires retention for 5 years';
    case DataCategory.AUDIT_TRAIL:
      return 'GDPR Article 17(3)(b): SOX Section 802 requires retention for 7 years';
    default:
      return 'Unknown retention requirement';
  }
}
```

### 5.3 Orphaned Hash State

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

### 5.4 Key Destruction Requirements

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| Key Storage | HSM-based key management recommended | Secure destruction capability |
| Destruction Method | Cryptographic erasure (overwrite, not just delete) | Prevent recovery |
| Backup Keys | ALL backup copies must be destroyed | Complete erasure |
| Audit Trail | Key destruction must be auditable | Compliance evidence |
| Time Limit | 30 days from valid request | GDPR standard timeline |
| Verification | Independent verification of destruction | Accountability |

---

## 6. Data Minimization

### 6.1 Off-Chain-First Pattern

All product lifecycle events follow this standardized flow:

```
1. ACTION OCCURS
   - Product created, transferred, serviced

2. OFF-CHAIN FIRST (CRITICAL)
   - Store complete event details off-chain
   - Generate content ID
   - Apply encryption (if CRAB model)
   - NEVER proceed until off-chain confirmed

3. COMPUTE HASH
   - SHA-256 of canonical JSON (RFC 8785 JCS)
   - Include version for schema evolution

4. ON-CHAIN EVENT
   - Emit event with: productDID, eventType, contentHash
   - NO PII touches blockchain

5. INDEX UPDATE
   - Link contentHash -> offChainId
```

**Reference:** `hybrid-architecture.md` Section 5

### 6.2 Pseudonymization with did:galileo

For customer data that must be tracked:

| Instead Of | Use | Example |
|------------|-----|---------|
| Customer name | Anonymized DID | `did:galileo:customer:anon-a7b3c9...` |
| Email address | Off-chain lookup only | Hash reference, content off-chain |
| Physical address | Country only (if needed) | ISO 3166-1 code |

### 6.3 No PII On-Chain (Even Encrypted)

**Why encryption is not sufficient:**

1. Encryption keys may be compromised in future
2. Quantum computing may break current encryption
3. GDPR Recital 26: "Personal data which have undergone pseudonymisation... should be considered to be information on an identifiable natural person"
4. EDPB explicitly states encrypted data is still personal data

**Correct approach:** Store ALL PII off-chain. Store only content-addressable hashes on-chain.

---

## 7. GDPR-AML Conflict Resolution

### 7.1 The Conflict

| Regulation | Requirement | Data Affected |
|------------|-------------|---------------|
| **GDPR Article 17** | Erase personal data on request | All PII |
| **5AMLD Article 40** | Retain KYC/AML data 5 years | Identity verification, transactions |
| **MiCA TFR** | Retain Travel Rule data 5 years | Originator/beneficiary info |
| **SOX Section 802** | Retain audit trail 7 years | Compliance records |

### 7.2 Resolution: Article 17(3)(b) Exception

GDPR Article 17(3)(b) provides the legal basis:

> The right to erasure does NOT apply to the extent that processing is necessary for compliance with a legal obligation which requires processing by Union or Member State law to which the controller is subject.

### 7.3 Decision Matrix

| Scenario | GDPR Requirement | AML Requirement | Resolution | Legal Basis |
|----------|------------------|-----------------|------------|-------------|
| Erasure during AML retention | Delete within 30 days | Retain 5 years | **Refuse erasure** | GDPR Art. 17(3)(b) |
| Erasure after AML retention | Delete within 30 days | No longer applies | **Honor request** | GDPR Art. 17(1) |
| Rectification during retention | Correct inaccurate data | Preserve original | **Correct with audit trail** | GDPR Art. 16 |
| Access during retention | Provide data copy | Data accessible | **Honor request** | GDPR Art. 15 |

### 7.4 Retention Schedule by Data Type

| Data Category | Min Retention | Max Retention | Legal Basis | Erasure on Request |
|---------------|---------------|---------------|-------------|-------------------|
| AML/KYC records | 5 years | 7 years | 5AMLD Art. 40 | No |
| Transaction logs | 5 years | 7 years | MiCA TFR 2023/1113 | No |
| Audit trail | 7 years | 10 years | SOX Section 802 | No |
| Customer PII (non-regulated) | None | Purpose expiry | GDPR Art. 6(1)(b) | Yes |
| Product data (non-PII) | Indefinite | Indefinite | GDPR Art. 6(1)(f) | No (not personal) |

**Reference:** `specifications/infrastructure/data-retention.md` Section 4

### 7.5 Refusal Response Template

When refusing an erasure request due to legal retention:

```
ERASURE REQUEST RESPONSE - REFUSAL

Request ID: [UUID]
Data Subject: [anonymized identifier]
Request Date: [ISO 8601]
Response Date: [ISO 8601]

DECISION: Erasure request cannot be honored at this time.

LEGAL BASIS FOR REFUSAL:
- GDPR Article 17(3)(b): Processing is necessary for compliance with
  a legal obligation which requires processing by Union law.

SPECIFIC OBLIGATION:
- 5AMLD Article 40: Retention of customer due diligence data for
  5 years from end of business relationship.

DATA CATEGORIES AFFECTED:
- [List specific categories under retention]

EARLIEST ELIGIBLE ERASURE DATE:
- [Date: 5 years from end of business relationship]

DATA SUBJECT RIGHTS:
You retain the right to:
- Access your personal data (GDPR Art. 15)
- Rectify inaccurate data (GDPR Art. 16)
- Restrict processing beyond retention requirements (GDPR Art. 18)
- Lodge a complaint with supervisory authority

CONTACT:
Data Protection Officer: dpo@[domain]
```

---

## 8. Implementation Checklist

### 8.1 Data Architecture

| # | Requirement | Regulation | Verification Method | Evidence Required | Galileo Reference |
|---|-------------|------------|---------------------|-------------------|-------------------|
| 1 | No personal data stored directly on blockchain | EDPB 02/2025 | Code review, data flow audit | Architecture diagram, code samples | hybrid-architecture.md S2 |
| 2 | All PII resides in erasable off-chain storage | EDPB 02/2025 | Storage configuration review | Storage architecture document | hybrid-architecture.md S2.2 |
| 3 | Hash-to-content mapping enables orphaning | EDPB 02/2025 | Erasure test | Test results, orphaned hash logs | hybrid-architecture.md S4 |
| 4 | No encrypted PII on-chain | EDPB 02/2025, GDPR Recital 26 | Code review | Prohibited data audit | hybrid-architecture.md S2.3 |
| 5 | Content hashes use SHA-256 | Best practice | Configuration check | Hash algorithm documentation | hybrid-architecture.md S7.2 |

**Checklist:**
- [ ] 1. Data classification mapping complete
- [ ] 2. Off-chain storage configured for all PII
- [ ] 3. CRAB encryption keys managed in HSM
- [ ] 4. Hash orphaning tested and verified
- [ ] 5. No encrypted/hashed PII on-chain

### 8.2 Data Subject Rights

| # | Requirement | Regulation | Verification Method | Evidence Required | Galileo Reference |
|---|-------------|------------|---------------------|-------------------|-------------------|
| 6 | Right to access implemented | GDPR Art. 15 | Functional test | Access request workflow documentation | data-retention.md S9 |
| 7 | Right to rectification implemented | GDPR Art. 16 | Functional test | Rectification workflow with audit | data-retention.md S9.3 |
| 8 | Right to erasure implemented (CRAB) | GDPR Art. 17 | Erasure test within 30 days | Erasure logs, orphaned hash records | hybrid-architecture.md S4 |
| 9 | Right to data portability implemented | GDPR Art. 20 | Export test | JSON export format documentation | data-retention.md S9.4 |
| 10 | Erasure workflow has 30-day SLA | GDPR Art. 12(3) | Timer configuration | SLA monitoring dashboard | data-retention.md S6.3 |

**Checklist:**
- [ ] 6. Access request endpoint operational
- [ ] 7. Rectification preserves audit trail
- [ ] 8. Erasure workflow tested end-to-end
- [ ] 9. Data export in machine-readable format
- [ ] 10. 30-day response timer enforced

### 8.3 Legal Compliance

| # | Requirement | Regulation | Verification Method | Evidence Required | Galileo Reference |
|---|-------------|------------|---------------------|-------------------|-------------------|
| 11 | Retention obligation checks integrated | GDPR Art. 17(3)(b) | Retention check test | Decision matrix implementation | data-retention.md S4 |
| 12 | Legal basis documented for each processing | GDPR Art. 6 | Documentation review | Processing register | - |
| 13 | DPA executed with all processors | GDPR Art. 28 | Contract review | Signed DPAs | - |
| 14 | DPIA completed for blockchain processing | EDPB 02/2025 | DPIA document | Completed DPIA | - |
| 15 | DPO consulted (if applicable) | GDPR Art. 37-39 | Consultation record | DPO sign-off | - |

**Checklist:**
- [ ] 11. Retention checks block premature erasure
- [ ] 12. Processing register maintained
- [ ] 13. DPAs in place with all processors
- [ ] 14. DPIA completed and approved
- [ ] 15. DPO consulted on implementation

### 8.4 Technical Measures

| # | Requirement | Regulation | Verification Method | Evidence Required | Galileo Reference |
|---|-------------|------------|---------------------|-------------------|-------------------|
| 16 | Off-chain storage supports deletion within GDPR timelines | EDPB 02/2025 | Deletion test | Deletion confirmation logs | hybrid-architecture.md S7.1 |
| 17 | Audit trail of deletions maintained | GDPR Art. 5(2) | Audit log review | Audit trail records | data-retention.md S8 |
| 18 | Encryption keys can be selectively destroyed | CRAB model | Key destruction test | HSM destruction logs | hybrid-architecture.md S4.3 |
| 19 | Backup deletion possible | EDPB 02/2025 | Backup deletion test | Backup management logs | hybrid-architecture.md S7.1 |
| 20 | EU data residency option available | GDPR Chapter V | Configuration review | Data residency documentation | - |

**Checklist:**
- [ ] 16. Deletion completes within 30 days
- [ ] 17. Audit trail logging configured
- [ ] 18. HSM key destruction verified
- [ ] 19. Backup deletion procedures tested
- [ ] 20. EU data residency configurable

---

## 9. Common Pitfalls

### 9.1 Pitfall 1: Treating Encrypted/Hashed PII as Non-Personal Data

**What goes wrong:** Implementers store encrypted or hashed personal data on-chain, believing it's "anonymous"

**Why it happens:** Misunderstanding of GDPR Recital 26 - encrypted data remains personal data

**How to avoid:**
- EDPB Guidelines 02/2025: "Encrypted or hashed data remains personal data under GDPR"
- Enforce off-chain storage for ALL PII, including encrypted versions
- Use hybrid-architecture.md Section 2.3 "Explicitly Prohibited On-Chain" as definitive list

**Warning signs:** Any design storing encrypted user data on-chain

### 9.2 Pitfall 2: Assuming "Technical Impossibility" Exempts Blockchain

**What goes wrong:** Claiming blockchain immutability prevents erasure compliance

**Why it happens:** Legacy blockchain mental model; not understanding CRAB model

**How to avoid:**
- EDPB explicitly states: "Technical impossibility is not a justification for disregarding the rights of data subjects"
- If erasure is impossible, the data should not have been stored there
- CRAB model provides compliant solution via content orphaning + key destruction

**Warning signs:** Arguments that "blockchain can't delete data so we can't comply"

### 9.3 Pitfall 3: Ignoring AML Retention When Processing Erasure

**What goes wrong:** Deleting KYC/transaction data on erasure request, violating 5AMLD

**Why it happens:** Prioritizing GDPR over AML retention obligations

**How to avoid:**
- Reference data-retention.md Section 4 (GDPR-AML Conflict Resolution)
- GDPR Article 17(3)(b) exception for legal obligations
- Clear decision matrix: "AML data retained for 5 years minimum despite erasure request"

**Warning signs:** Erasure workflows that don't check retention obligations first

### 9.4 Pitfall 4: Incomplete Data Inventory

**What goes wrong:** Missing data locations during erasure, leaving PII in backups or caches

**Why it happens:** Decentralized storage without comprehensive inventory

**How to avoid:**
- Maintain complete data mapping (primary, backup, cache, CDN)
- Include all third-party processors in inventory
- Test erasure with verification across all locations

**Warning signs:** No documented data flow diagram; "we think" statements about data locations

### 9.5 Pitfall 5: No Audit Trail of Deletions

**What goes wrong:** Cannot prove erasure was completed

**Why it happens:** Focus on deletion, not documentation

**How to avoid:**
- Log all erasure actions (request ID, timestamp, data category, completion)
- Do NOT log deleted content
- Retain audit trail for 7 years (SOX requirement)

**Warning signs:** Erasure endpoint returns success without logging

---

## 10. Regulatory References

### 10.1 Primary Regulations

| Regulation | Citation | Key Articles |
|------------|----------|--------------|
| **GDPR** | Regulation (EU) 2016/679 | Art. 12, 15, 16, 17, 17(3)(b), 20, 25 |
| **EDPB Guidelines 02/2025** | [PDF](https://www.edpb.europa.eu/system/files/2025-04/edpb_guidelines_202502_blockchain_en.pdf) | Full document |
| **5AMLD** | Directive (EU) 2018/843 | Art. 40 (retention) |
| **MiCA TFR** | Regulation (EU) 2023/1113 | Transfer retention requirements |

### 10.2 Galileo Specifications

| Specification | Path | Relevant Sections |
|---------------|------|-------------------|
| Hybrid Architecture | `specifications/architecture/hybrid-architecture.md` | S2 (Classification), S4 (CRAB), S5 (Event Flow) |
| Data Retention | `specifications/infrastructure/data-retention.md` | S4 (Conflict Resolution), S6 (Erasure Workflow) |
| KYC Hooks | `specifications/compliance/kyc-hooks.md` | S9 (Travel Rule), S5 (Claim Data) |
| AML Screening | `specifications/compliance/aml-screening.md` | S8 (Audit Trail), S8.3 (Retention) |

### 10.3 External Resources

- [EDPB Blockchain Guidelines Announcement](https://www.edpb.europa.eu/news/news/2025/edpb-adopts-guidelines-processing-personal-data-through-blockchains-and-ready_en)
- [GDPR Official Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [5AMLD Official Text](https://eur-lex.europa.eu/eli/dir/2018/843/oj)

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Guide ID** | GGUIDE-COMPLIANCE-001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-02-01 |
| **Last Modified** | 2026-02-01 |
| **Authors** | Galileo Luxury Standard TSC |
| **Target Audience** | Implementers, Compliance Officers, DPOs |
| **Compliance** | GDPR, EDPB Guidelines 02/2025, 5AMLD |

---

*End of GDPR Compliance Implementation Guide*
