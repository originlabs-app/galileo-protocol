# Data Retention Policies Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-31
**Specification ID:** GSPEC-INFRA-003

---

## Table of Contents

1. [Overview](#1-overview)
2. [Regulatory Framework](#2-regulatory-framework)
3. [Data Classification Matrix](#3-data-classification-matrix)
4. [GDPR-AML Conflict Resolution](#4-gdpr-aml-conflict-resolution)
5. [Retention Period Calculation](#5-retention-period-calculation)
6. [Erasure Request Workflow](#6-erasure-request-workflow)
7. [Legal Hold Support](#7-legal-hold-support)
8. [Retention Monitoring](#8-retention-monitoring)
9. [Data Subject Rights Implementation](#9-data-subject-rights-implementation)
10. [Cross-Jurisdiction Considerations](#10-cross-jurisdiction-considerations)

---

## 1. Overview

### 1.1 Purpose

This specification defines data retention policies for the Galileo Luxury Standard that balance GDPR data subject rights with regulatory retention requirements under AML, MiCA, and SOX frameworks. The policies ensure that:

- Data subjects can exercise their right to erasure (GDPR Article 17)
- Regulatory retention obligations are honored (5AMLD Article 40, MiCA TFR)
- The CRAB model (Create-Read-Append-Burn) from hybrid-architecture.md enables compliant erasure
- Clear legal basis exists for every data retention decision

### 1.2 Scope

This specification applies to all data processed within the Galileo Luxury Standard ecosystem:

| Data Domain | In Scope | Notes |
|-------------|----------|-------|
| Customer PII | Yes | Names, addresses, purchase history |
| AML/KYC records | Yes | Identity verification, risk assessments |
| Transaction logs | Yes | Ownership transfers, payments |
| Audit trail | Yes | System access, modifications |
| Product data | Yes | DPP content, provenance records |
| On-chain hashes | No | Not personal data after erasure |

### 1.3 Relationship to hybrid-architecture.md

This specification extends the CRAB model defined in hybrid-architecture.md Section 4:

```
CRAB Model Extension for Retention:

+------------------+     +----------------------+     +------------------+
| CRAB Model       |     | Retention Policies   |     | Erasure Decision |
| (Technical)      | --> | (Legal)              | --> | (Combined)       |
+------------------+     +----------------------+     +------------------+
| Create           |     | Classification       |     | Can erase?       |
| Read             |     | Retention periods    |     | When to erase?   |
| Append           |     | Legal basis          |     | How to erase?    |
| Burn             |     | Exceptions           |     | Audit trail      |
+------------------+     +----------------------+     +------------------+
```

---

## 2. Regulatory Framework

### 2.1 Applicable Regulations

The following regulations govern data retention within the Galileo ecosystem:

| Regulation | Article/Section | Requirement | Data Affected |
|------------|-----------------|-------------|---------------|
| **GDPR** | Article 17 | Right to erasure ("right to be forgotten") | All personal data |
| **GDPR** | Article 17(3)(b) | Exception for legal obligations | Data under AML retention |
| **GDPR** | Article 5(1)(e) | Storage limitation principle | All personal data |
| **5AMLD** | Article 40 | 5-year retention for AML records | KYC, transaction records |
| **MiCA TFR** | 2023/1113 | Transaction record retention | Crypto-asset transfers |
| **SOX** | Section 802 | 7-year audit trail retention | Financial records |
| **ESPR** | 2024/1781 | DPP availability requirements | Product passport data |

### 2.2 GDPR Article 17 - Right to Erasure

Data subjects have the right to obtain erasure of personal data concerning them without undue delay where:

1. Personal data no longer necessary for collection purpose
2. Consent withdrawn (where consent was legal basis)
3. Data subject objects to processing (legitimate interest basis)
4. Personal data unlawfully processed
5. Legal obligation to erase under EU/Member State law

**Critical Exception - Article 17(3)(b):**

> The right to erasure does NOT apply to the extent that processing is necessary for compliance with a legal obligation which requires processing by Union or Member State law to which the controller is subject.

This exception enables retention of AML/KYC data despite erasure requests.

### 2.3 5AMLD Article 40 - AML Retention

> Member States shall require obliged entities to keep documents and information for a period of five years after the end of a business relationship with their customer or after the date of an occasional transaction.

**Key points:**
- 5-year minimum from end of business relationship
- Applies to customer due diligence data
- Applies to transaction records
- Member states may extend up to 10 years

### 2.4 MiCA TFR 2023/1113 - Travel Rule Records

Crypto-asset service providers (CASPs) must retain:

- Originator information
- Beneficiary information
- Transfer amounts and dates
- Transaction identifiers

Retention period aligns with AML requirements (5 years minimum).

### 2.5 SOX Section 802 - Audit Trail Retention

> Auditors must retain audit workpapers and other records relevant to the audit for 7 years from the conclusion of the audit.

Extended to financial audit trails and compliance records in EU implementations.

---

## 3. Data Classification Matrix

### 3.1 Retention Schedule by Category

| Data Category | Min Retention | Max Retention | Legal Basis | Erasure on Request | Trigger Event |
|---------------|---------------|---------------|-------------|-------------------|---------------|
| **AML/KYC records** | 5 years | 7 years | 5AMLD Art. 40 | No (Art. 17(3)(b)) | End of business relationship |
| **Transaction logs** | 5 years | 7 years | MiCA TFR 2023/1113 | No (Art. 17(3)(b)) | Transaction date |
| **Audit trail** | 7 years | 10 years | SOX Section 802 | No (Art. 17(3)(b)) | Entry creation date |
| **Customer PII** | None | Purpose expiry | GDPR Art. 6(1)(b) | Yes (with checks) | Erasure request |
| **Product data (non-PII)** | Indefinite | Indefinite | GDPR Art. 6(1)(f) | No (not personal) | Never |
| **Encryption keys** | Until erasure | Until erasure | CRAB model | On valid request | Key destruction request |

### 3.2 Detailed Category Definitions

#### 3.2.1 AML/KYC Records

| Data Element | Description | Retention | Notes |
|--------------|-------------|-----------|-------|
| Identity documents | Passport, ID card copies | 5 years | Encrypted at rest |
| Proof of address | Utility bills, bank statements | 5 years | May be redacted after verification |
| Risk assessment | Customer risk scoring | 5 years | Update on significant changes |
| PEP/sanctions screening | Results and evidence | 5 years | Include negative results |
| Source of funds | Documentation of fund origins | 5 years | Required for high-value items |
| Enhanced due diligence | Additional verification | 5 years | For high-risk customers |

#### 3.2.2 Transaction Logs

| Data Element | Description | Retention | Notes |
|--------------|-------------|-----------|-------|
| Transfer records | Ownership changes | 5 years | Includes on-chain tx hash |
| Payment records | Purchase transactions | 5 years | Currency conversion rates |
| Travel Rule data | Originator/beneficiary info | 5 years | MiCA TFR requirement |
| Timestamps | Transaction timing | 5 years | UTC normalized |

#### 3.2.3 Audit Trail

| Data Element | Description | Retention | Notes |
|--------------|-------------|-----------|-------|
| Access logs | System access records | 7 years | IP addresses, user agents |
| Modification logs | Data change records | 7 years | Before/after values |
| Permission changes | Role grants/revocations | 7 years | Who granted to whom |
| Compliance events | Verification results | 7 years | Pass/fail with evidence |
| Erasure logs | Deletion confirmations | 7 years | Proof of compliance |

#### 3.2.4 Customer PII (Non-Regulated)

| Data Element | Description | Retention | Notes |
|--------------|-------------|-----------|-------|
| Contact preferences | Communication settings | Purpose duration | Erasable on request |
| Purchase history | Non-AML transaction data | Purpose duration | After AML period |
| Marketing consent | Opt-in records | Until withdrawal | Must honor withdrawal |
| Account settings | User preferences | Account lifetime | Erasable on request |

#### 3.2.5 Product Data (Non-Personal)

| Data Element | Description | Retention | Notes |
|--------------|-------------|-----------|-------|
| Materials composition | Fabric, metal content | Indefinite | ESPR requirement |
| Manufacturing origin | Country, facility | Indefinite | Provenance record |
| Sustainability data | Environmental impact | Indefinite | DPP requirement |
| Repair instructions | Care and maintenance | Product lifetime + 10 years | Right to repair |
| Authenticity markers | Serial numbers, codes | Indefinite | Anti-counterfeiting |

#### 3.2.6 Encryption Keys (CRAB Model)

| Key Type | Description | Retention | Destruction Trigger |
|----------|-------------|-----------|---------------------|
| Content encryption keys | Per-record encryption | Until erasure | Valid erasure request |
| Key encryption keys | Wrapping keys | Until all content keys destroyed | Last content key destroyed |
| Backup keys | Disaster recovery | Mirror primary | Same as primary |

---

## 4. GDPR-AML Conflict Resolution

### 4.1 Decision Matrix

| Scenario | GDPR Requirement | AML Requirement | Resolution | Legal Basis |
|----------|------------------|-----------------|------------|-------------|
| **Erasure during AML retention** | Delete within 30 days | Retain 5 years | Refuse erasure | GDPR Art. 17(3)(b) |
| **Erasure after AML retention** | Delete within 30 days | No longer applies | Honor request | GDPR Art. 17(1) |
| **Anonymization request** | Reduce to non-personal | May need original | Pseudonymize only | Case-by-case |
| **Rectification during retention** | Correct inaccurate data | Preserve original | Correct with audit trail | GDPR Art. 16 |
| **Access during retention** | Provide data copy | Data accessible | Honor request | GDPR Art. 15 |

### 4.2 Refusal Response Template

When refusing an erasure request due to legal retention obligations:

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

### 4.3 Resolution Flowchart

```
                           ERASURE REQUEST RECEIVED
                                     |
                                     v
                    +--------------------------------+
                    | 1. Validate requester identity |
                    |    (data subject verification) |
                    +--------------------------------+
                                     |
                                     v
                    +--------------------------------+
                    | 2. Identify all data categories|
                    |    associated with subject     |
                    +--------------------------------+
                                     |
                                     v
                    +--------------------------------+
                    | 3. Check each category for     |
                    |    active retention obligation |
                    +--------------------------------+
                                     |
                         +-----------+-----------+
                         |                       |
                         v                       v
              +------------------+    +------------------+
              | ALL categories   |    | SOME/NO categories|
              | under retention  |    | under retention   |
              +------------------+    +------------------+
                         |                       |
                         v                       v
              +------------------+    +------------------+
              | FULL REFUSAL     |    | PARTIAL ERASURE  |
              | - Document basis |    | - Erase eligible |
              | - Notify subject |    | - Retain others  |
              | - Log decision   |    | - Notify subject |
              +------------------+    +------------------+
```

---

## 5. Retention Period Calculation

### 5.1 Trigger Events

| Data Category | Retention Starts | Retention Ends |
|---------------|------------------|----------------|
| AML/KYC records | End of business relationship | 5 years after trigger |
| Transaction logs | Transaction date | 5 years after trigger |
| Audit trail | Entry creation | 7 years after trigger |
| Customer PII | Data collection | Purpose fulfilled + grace period |
| Encryption keys | Key creation | Valid erasure request processed |

### 5.2 End of Business Relationship Definition

A business relationship ends when:

1. **Account closure:** Customer explicitly requests account termination
2. **Inactivity:** No transactions for 24 consecutive months
3. **Deregistration:** Brand removes product from ecosystem
4. **Death:** Data subject deceased (with documentation)
5. **Corporate dissolution:** Entity no longer exists

**Important:** Retention period starts AFTER relationship ends, not from last transaction.

### 5.3 Calculation Rules

```typescript
interface RetentionCalculation {
  // Calculate retention end date
  calculateRetentionEnd(
    category: DataCategory,
    triggerDate: Date
  ): Date;
}

// Example implementation
function calculateRetentionEnd(
  category: DataCategory,
  triggerDate: Date
): Date {
  const retentionDays = {
    'aml_kyc': 5 * 365,      // 5 years
    'transactions': 5 * 365,  // 5 years
    'audit_trail': 7 * 365,   // 7 years
    'customer_pii': 0,        // No minimum
    'product_data': Infinity  // Indefinite
  };

  const days = retentionDays[category];

  if (days === Infinity) {
    return new Date(8640000000000000); // Max date
  }

  // Add retention period
  const endDate = new Date(triggerDate);
  endDate.setDate(endDate.getDate() + days);

  // Adjust for leap years (use actual days)
  return endDate;
}
```

### 5.4 Timezone Handling

- **Storage:** All timestamps in UTC (ISO 8601 format)
- **Calculation:** Use UTC for all retention calculations
- **Display:** Convert to local timezone for user interfaces
- **Legal jurisdiction:** EU timezone (CET/CEST) for regulatory deadlines

### 5.5 Grace Period and Archival

| Phase | Duration | Data State | Access |
|-------|----------|------------|--------|
| Active retention | Retention period | Fully accessible | Normal operations |
| Grace period | 30 days | Read-only | Compliance review |
| Archival | Variable | Compressed/encrypted | Legal/audit only |
| Deletion | N/A | Permanently removed | None |

---

## 6. Erasure Request Workflow

### 6.1 Complete Workflow

```
+----------------------------------------------------------------------+
|                      ERASURE REQUEST WORKFLOW                         |
+----------------------------------------------------------------------+

STEP 1: RECEIVE REQUEST
+----------------------------------------------------------------------+
| - Accept request via designated channel (email, portal, API)          |
| - Generate unique request ID (UUID v7)                                |
| - Log request receipt timestamp                                       |
| - Start 30-day GDPR response timer                                    |
| - Send acknowledgment to requester                                    |
+----------------------------------------------------------------------+
                                    |
                                    v
STEP 2: VALIDATE REQUESTER IDENTITY
+----------------------------------------------------------------------+
| - Verify requester is data subject (or authorized representative)     |
| - Require identity confirmation (knowledge-based or document)         |
| - Log verification outcome                                            |
| - If verification fails: Reject with reason, close request            |
+----------------------------------------------------------------------+
                                    |
                                    v
STEP 3: INVENTORY DATA
+----------------------------------------------------------------------+
| - Query all systems for data subject's personal data                  |
| - Categorize data by retention schedule                               |
| - Identify on-chain references (content hashes)                       |
| - Document complete data inventory                                    |
+----------------------------------------------------------------------+
                                    |
                                    v
STEP 4: RETENTION CHECK
+----------------------------------------------------------------------+
| For each data category:                                               |
|   - Check active retention periods                                    |
|   - Check for legal holds (see Section 7)                             |
|   - Check for ongoing investigations                                  |
|   - Calculate earliest eligible erasure date                          |
+----------------------------------------------------------------------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
        +-------------------+            +-------------------+
        | RETENTION APPLIES |            | NO RETENTION      |
        | (Some/all data)   |            | (All data clear)  |
        +-------------------+            +-------------------+
                    |                               |
                    v                               v
        +-------------------+            +-------------------+
        | STEP 5A: PARTIAL  |            | STEP 5B: FULL     |
        | Process eligible  |            | Process all data  |
        +-------------------+            +-------------------+
                    |                               |
                    +---------------+---------------+
                                    |
                                    v
STEP 6: EXECUTE ERASURE (CRAB Burn)
+----------------------------------------------------------------------+
| For each eligible data record:                                        |
|   1. Delete off-chain content from primary storage                    |
|   2. Delete from backup locations                                     |
|   3. Clear from caches                                                |
|   4. Destroy encryption keys (if CRAB encryption used)                |
|   5. Log erasure action with timestamp                                |
|   6. Verify deletion completion                                       |
+----------------------------------------------------------------------+
                                    |
                                    v
STEP 7: ORPHAN ON-CHAIN REFERENCES
+----------------------------------------------------------------------+
| - On-chain content hashes now point to nothing                        |
| - No action required on blockchain (hashes remain)                    |
| - Hash becomes meaningless without off-chain content                  |
| - Document orphaned hash references in audit trail                    |
+----------------------------------------------------------------------+
                                    |
                                    v
STEP 8: NOTIFICATION
+----------------------------------------------------------------------+
| - Prepare response to data subject                                    |
| - Include: completed actions, retained data (with reason), timeline   |
| - Send within 30-day GDPR deadline                                    |
| - Log notification delivery                                           |
+----------------------------------------------------------------------+
                                    |
                                    v
STEP 9: AUDIT TRAIL
+----------------------------------------------------------------------+
| - Record complete erasure workflow execution                          |
| - Retain: request ID, timestamps, actions, verification               |
| - Do NOT retain: actual deleted content                               |
| - Audit trail itself subject to 7-year retention                      |
+----------------------------------------------------------------------+
```

### 6.2 Decision Tree for Erasure Eligibility

```
                        CAN THIS DATA BE ERASED?
                                 |
                                 v
                    +------------------------+
                    | Is it personal data?   |
                    +------------------------+
                         |              |
                        YES            NO
                         |              |
                         v              v
            +----------------+    +--------------+
            | Is there an    |    | Not subject  |
            | active legal   |    | to erasure   |
            | hold?          |    | (not GDPR    |
            +----------------+    | scope)       |
                 |       |        +--------------+
                YES     NO
                 |       |
                 v       v
        +----------+  +------------------+
        | REFUSE   |  | Is data under    |
        | until    |  | AML retention?   |
        | hold     |  +------------------+
        | released |       |         |
        +----------+      YES       NO
                           |         |
                           v         v
              +-------------+  +-------------+
              | Is retention|  | Is data     |
              | period      |  | under audit |
              | expired?    |  | retention?  |
              +-------------+  +-------------+
                  |      |        |      |
                 YES    NO       YES    NO
                  |      |        |      |
                  v      v        v      v
             +------+ +------+ +----+ +------+
             |ERASE | |REFUSE| |Same| |ERASE |
             +------+ |Art.17| |flow| +------+
                      |(3)(b)|      |
                      +------+
```

### 6.3 Response Timeline

| Milestone | Deadline | Action | Notification |
|-----------|----------|--------|--------------|
| Receipt | Day 0 | Log request, start timer | Acknowledge to subject |
| Verification | Day 5 | Complete identity verification | Request clarification if needed |
| Assessment | Day 15 | Complete retention analysis | Internal review |
| Execution | Day 25 | Complete eligible erasures | Progress update (optional) |
| Response | Day 30 | Send final response | Formal response to subject |
| Extension (complex) | Day 30 | Request extension | Notify subject of delay |
| Extended response | Day 90 | Final response (if extended) | Formal response to subject |

---

## 7. Legal Hold Support

### 7.1 Legal Hold Definition

A legal hold (litigation hold) suspends normal retention policies when data may be relevant to:

- Pending or anticipated litigation
- Government investigations
- Regulatory inquiries
- Internal investigations

### 7.2 Legal Hold Lifecycle

```
                           LEGAL HOLD LIFECYCLE

INITIATION
+----------------------------------------------------------------------+
| Trigger: Legal counsel identifies need for preservation               |
| Action:                                                               |
|   1. Issue preservation notice (internal)                             |
|   2. Define hold scope (data types, subjects, date ranges)            |
|   3. Register hold in legal hold system                               |
|   4. Notify affected data custodians                                  |
|   5. Suspend automated deletion for in-scope data                     |
+----------------------------------------------------------------------+
                                    |
                                    v
ACTIVE HOLD
+----------------------------------------------------------------------+
| Duration: Until matter concluded                                      |
| Restrictions:                                                         |
|   - No deletion of in-scope data                                      |
|   - No modification of in-scope data (except append)                  |
|   - Erasure requests for in-scope data: REFUSE                        |
|   - Retention expiry: SUSPEND                                         |
| Monitoring:                                                           |
|   - Periodic review (quarterly)                                       |
|   - Scope adjustment as needed                                        |
+----------------------------------------------------------------------+
                                    |
                                    v
RELEASE
+----------------------------------------------------------------------+
| Trigger: Matter concluded, legal counsel authorizes release           |
| Action:                                                               |
|   1. Document release authorization                                   |
|   2. Identify data eligible for normal retention                      |
|   3. Recalculate retention periods                                    |
|   4. Process pending erasure requests                                 |
|   5. Resume automated retention enforcement                           |
|   6. Audit trail of hold lifecycle                                    |
+----------------------------------------------------------------------+
```

### 7.3 Legal Hold Data Model

```typescript
interface LegalHold {
  holdId: string;                    // UUID
  holdName: string;                  // Descriptive name
  matterReference: string;           // Legal matter ID
  issuedBy: string;                  // Legal counsel identifier
  issuedDate: Date;

  scope: {
    dataCategories: DataCategory[];  // Affected categories
    dataSubjects: string[];          // Specific subjects (if applicable)
    dateRangeStart?: Date;           // Data created after
    dateRangeEnd?: Date;             // Data created before
    keywords?: string[];             // Search terms (if applicable)
  };

  status: 'active' | 'released' | 'expired';

  releaseInfo?: {
    releasedBy: string;
    releasedDate: Date;
    releaseReason: string;
  };

  auditTrail: LegalHoldAuditEntry[];
}

interface LegalHoldAuditEntry {
  timestamp: Date;
  action: 'created' | 'modified' | 'reviewed' | 'released';
  actor: string;
  details: string;
}
```

### 7.4 Erasure Request During Legal Hold

When an erasure request affects data under legal hold:

```
1. Identify overlap between request scope and hold scope
2. For data under hold: REFUSE with legal hold basis
3. For data NOT under hold: Process normally
4. Response to data subject:
   - State that some data is under legal preservation
   - Do NOT disclose litigation details
   - Provide estimated review date (if known)
   - Inform of right to lodge complaint
```

---

## 8. Retention Monitoring

### 8.1 Automated Monitoring Requirements

| Monitor | Frequency | Action | Alert Threshold |
|---------|-----------|--------|-----------------|
| Approaching expiry scan | Daily | Identify records expiring in 30 days | N/A |
| Expired record scan | Daily | Flag expired records for review | > 0 records |
| Legal hold compliance | Daily | Verify held data not modified | Any violation |
| Orphaned hash detection | Weekly | Identify hashes without off-chain content | Unexpected orphans |
| Retention policy audit | Monthly | Verify policy application consistency | Variance > 1% |

### 8.2 Expiry Workflow

```
                           RETENTION EXPIRY WORKFLOW

30 DAYS BEFORE EXPIRY
+----------------------------------------------------------------------+
| - Automated scan identifies records approaching retention expiry      |
| - Generate expiry notification to data steward                        |
| - Create expiry review task                                           |
+----------------------------------------------------------------------+
                                    |
                                    v
7 DAYS BEFORE EXPIRY
+----------------------------------------------------------------------+
| - Escalate if review not completed                                    |
| - Verify no pending legal holds                                       |
| - Verify no pending erasure requests (which would override)           |
+----------------------------------------------------------------------+
                                    |
                                    v
EXPIRY DATE
+----------------------------------------------------------------------+
| If review approved:                                                   |
|   - Move to archival storage (not delete)                             |
|   - Compress and encrypt                                              |
|   - Restrict access to legal/audit only                               |
|   - Log archival action                                               |
| If review not completed:                                              |
|   - Do NOT auto-delete                                                |
|   - Escalate to compliance officer                                    |
|   - Extend review period (30 days)                                    |
+----------------------------------------------------------------------+
                                    |
                                    v
POST-EXPIRY + 90 DAYS (ARCHIVAL PERIOD)
+----------------------------------------------------------------------+
| - Final review before permanent deletion                              |
| - Verify no intervening legal holds or requests                       |
| - If clear: Execute permanent deletion                                |
| - Log deletion with verification                                      |
+----------------------------------------------------------------------+
```

### 8.3 Monitoring Metrics

| Metric | Description | Target | Alert Condition |
|--------|-------------|--------|-----------------|
| Records under retention | Count by category | Informational | N/A |
| Expiring next 30 days | Count by category | Informational | > 1000 records |
| Overdue reviews | Records past expiry without review | 0 | > 0 |
| Erasure request backlog | Pending requests | < 10 | > 50 |
| Average erasure time | Days from request to completion | < 15 days | > 25 days |
| Legal hold count | Active holds | Informational | N/A |
| Orphaned hash count | Intentional orphans (post-erasure) | Track | Unexpected increase |

---

## 9. Data Subject Rights Implementation

### 9.1 Rights Mapping

| GDPR Right | Article | Implementation | Retention Impact |
|------------|---------|----------------|------------------|
| **Access** | Art. 15 | Query all subject data, generate report | None - data accessible |
| **Rectification** | Art. 16 | Update off-chain, new hash on-chain | Retain original with audit |
| **Erasure** | Art. 17 | Workflow per Section 6 | Per retention schedule |
| **Restriction** | Art. 18 | Set processing freeze flag | Retention continues |
| **Portability** | Art. 20 | JSON export format | None |
| **Object** | Art. 21 | Assess and respond | May trigger erasure |

### 9.2 Access Request Implementation

```typescript
interface DataSubjectAccessReport {
  reportId: string;
  dataSubject: string;          // Anonymized identifier
  generatedDate: Date;
  requestId: string;            // Original request reference

  dataInventory: {
    category: DataCategory;
    recordCount: number;
    retentionStatus: 'active' | 'expired' | 'legal_hold';
    retentionEndDate?: Date;
    summary: string;
  }[];

  processingPurposes: string[];

  recipients: {
    category: string;           // "Service providers", "Regulators"
    countries: string[];        // ISO 3166-1 codes
  }[];

  sourceOfData: string;

  automatedDecisionMaking: {
    exists: boolean;
    logic?: string;
    significance?: string;
  };

  // Full data export as attachment
  exportFormat: 'json' | 'csv';
  exportDownloadUrl: string;    // Time-limited secure URL
  exportExpiresAt: Date;
}
```

### 9.3 Rectification with Audit Trail

When data subject requests correction:

```
1. Validate correction request
2. Verify requester identity
3. Store original value in audit trail
4. Update off-chain content with correction
5. Compute new content hash
6. Emit correction event on-chain (new hash, correction flag)
7. Update index to point to corrected content
8. Retain audit trail linking old and new versions
9. Notify data subject of completion
```

### 9.4 Export Format Specification

```json
{
  "$schema": "https://schemas.galileoprotocol.io/export/v1.0/schema.json",
  "exportId": "uuid",
  "dataSubject": "anonymized-id",
  "generatedAt": "ISO-8601",
  "format": "json",
  "version": "1.0",

  "personalData": {
    "identity": {
      "name": "string",
      "email": "string",
      "address": {}
    },
    "transactions": [],
    "products": [],
    "preferences": {}
  },

  "metadata": {
    "recordCount": 0,
    "categories": [],
    "collectionDates": {
      "earliest": "ISO-8601",
      "latest": "ISO-8601"
    }
  }
}
```

---

## 10. Cross-Jurisdiction Considerations

### 10.1 Jurisdiction Conflict Resolution

When data subject is associated with multiple jurisdictions:

| Conflict Type | Resolution Rule | Rationale |
|---------------|-----------------|-----------|
| Different retention periods | Apply LONGEST period | Ensure compliance in all jurisdictions |
| Conflicting erasure rights | Apply MOST RESTRICTIVE | Cannot un-delete data |
| Different access requirements | Satisfy ALL requirements | Superset approach |
| Data localization | Store in REQUIRED jurisdictions | May require replication |

### 10.2 Jurisdiction-Specific Requirements

| Jurisdiction | Specific Requirement | Galileo Implementation |
|--------------|----------------------|------------------------|
| **EU (GDPR)** | 30-day erasure response | Standard workflow |
| **Switzerland (nDSG)** | Similar to GDPR | Treat as GDPR |
| **UK (UK GDPR)** | 30-day response | Standard workflow |
| **France (CNIL)** | Enhanced documentation | Extended audit trail |
| **Germany (BDSG)** | Stricter data minimization | Review at collection |

### 10.3 International Transfer Considerations

When data subject requests erasure but data was transferred internationally:

1. Identify all transfer recipients
2. Notify recipients of erasure obligation
3. Obtain confirmation of erasure from each
4. Document in audit trail
5. Include in data subject response

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Specification ID** | GSPEC-INFRA-003 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-01-31 |
| **Last Modified** | 2026-01-31 |
| **Authors** | Galileo Luxury Standard TSC |
| **Supersedes** | N/A |
| **Related** | hybrid-architecture.md (CRAB model) |
| **Compliance** | GDPR, 5AMLD, MiCA TFR, SOX |

---

*End of Data Retention Policies Specification*
