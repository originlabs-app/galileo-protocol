# Immutable Audit Trail Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-INFRA-002

---

## Table of Contents

1. [Overview](#1-overview)
2. [Audit Event Types](#2-audit-event-types)
3. [Audit Log Entry Schema](#3-audit-log-entry-schema)
4. [Hash Chain Protocol](#4-hash-chain-protocol)
5. [Merkle Tree Anchoring](#5-merkle-tree-anchoring)
6. [Storage Architecture](#6-storage-architecture)
7. [Retention and Archival](#7-retention-and-archival)
8. [Query and Verification APIs](#8-query-and-verification-apis)
9. [Failure Handling](#9-failure-handling)

---

## 1. Overview

### 1.1 Purpose

This specification defines the immutable audit trail infrastructure for the Galileo Luxury Standard ecosystem. The audit trail provides tamper-evident logging for all privileged operations, ensuring accountability, regulatory compliance, and forensic capability.

**Specification ID:** GSPEC-INFRA-002

### 1.2 Core Properties

| Property | Description |
|----------|-------------|
| **Immutability** | Append-only log with no UPDATE or DELETE operations |
| **Tamper-Evidence** | Hash-chain linking makes modifications detectable |
| **Verifiability** | Merkle proofs enable cryptographic verification of individual entries |
| **Compliance** | 7-year retention per SOX/regulatory requirements |
| **Performance** | Off-chain storage with periodic on-chain anchoring |

### 1.3 Architecture Overview

```
                        +------------------+
                        |  Audit Events    |
                        |  (Applications)  |
                        +--------+---------+
                                 |
                                 v
                  +-----------------------------+
                  |     Audit Log Service       |
                  |  - Hash computation         |
                  |  - Chain linking            |
                  |  - Entry validation         |
                  +-------------+---------------+
                                |
              +-----------------+-----------------+
              |                                   |
              v                                   v
    +-------------------+             +-------------------+
    | PostgreSQL        |             | On-Chain Anchor   |
    | (Primary Storage) |             | (Daily Merkle)    |
    +-------------------+             +-------------------+
              |
              v
    +-------------------+
    | Merkle Tree       |
    | (Proof Generation)|
    +-------------------+
```

### 1.4 Regulatory Alignment

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| SOX (Sarbanes-Oxley) | 7-year retention | Minimum 7-year active retention |
| GDPR Article 30 | Records of processing | All data access logged |
| MiCA | Complete audit trail | Hash-chain backed, verifiable |
| 5AMLD | Transaction records | All token operations logged |

### 1.5 References

- [RBAC Framework](./rbac-framework.md) - Role-based access control
- [hybrid-architecture](../architecture/hybrid-architecture.md) - CRAB model for erasure
- [Trillian/Certificate Transparency](https://transparency.dev/) - Merkle tree patterns
- [RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785) - JSON Canonicalization Scheme (JCS)

---

## 2. Audit Event Types

### 2.1 Event Taxonomy

The Galileo audit trail captures the following event categories:

#### 2.1.1 Access Control Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `ROLE_GRANTED` | Role assigned to account | INFO |
| `ROLE_REVOKED` | Role removed from account | INFO |
| `ROLE_SUSPENDED` | Role temporarily suspended | WARNING |
| `ROLE_REINSTATED` | Suspended role restored | INFO |
| `PERMISSION_CHECKED` | Permission verification performed | DEBUG |
| `ACCESS_DENIED` | Access attempt rejected | WARNING |
| `EMERGENCY_ACCESS` | Emergency role grant/revoke | CRITICAL |

#### 2.1.2 Data Lifecycle Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `DATA_CREATED` | New data record created | INFO |
| `DATA_READ` | Data record accessed | DEBUG |
| `DATA_UPDATED` | Data record modified | INFO |
| `DATA_DELETED` | Data record removed | WARNING |
| `DATA_EXPORTED` | Data exported from system | INFO |

#### 2.1.3 Token Operations Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `TOKEN_DEPLOYED` | New product token deployed | INFO |
| `TOKEN_TRANSFERRED` | Ownership transferred | INFO |
| `TOKEN_BURNED` | Token permanently destroyed | WARNING |
| `TOKEN_FROZEN` | Token transfers paused | WARNING |
| `TOKEN_UNFROZEN` | Token transfers resumed | INFO |
| `COMPLIANCE_CHECK` | Transfer compliance verified | DEBUG |

#### 2.1.4 CRAB Model Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `ENCRYPTION_KEY_CREATED` | New encryption key generated | INFO |
| `ENCRYPTION_KEY_ROTATED` | Encryption key replaced | INFO |
| `ENCRYPTION_KEY_DESTROYED` | Encryption key securely deleted | WARNING |
| `CONTENT_ORPHANED` | On-chain hash orphaned (erasure) | INFO |

#### 2.1.5 Compliance Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `ERASURE_REQUESTED` | GDPR erasure request received | INFO |
| `ERASURE_COMPLETED` | Erasure request fulfilled | INFO |
| `ERASURE_REFUSED` | Erasure refused (legal basis) | WARNING |
| `RETENTION_PERIOD_STARTED` | Retention countdown began | INFO |
| `RETENTION_PERIOD_EXPIRED` | Data eligible for deletion | INFO |
| `LEGAL_HOLD_APPLIED` | Litigation hold activated | WARNING |
| `LEGAL_HOLD_RELEASED` | Litigation hold removed | INFO |

#### 2.1.6 Identity Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `IDENTITY_REGISTERED` | New identity registered | INFO |
| `IDENTITY_UPDATED` | Identity information modified | INFO |
| `IDENTITY_REMOVED` | Identity deregistered | WARNING |
| `CLAIM_ISSUED` | New claim added to identity | INFO |
| `CLAIM_REVOKED` | Claim invalidated | WARNING |
| `CONSENT_GRANTED` | Cross-brand consent given | INFO |
| `CONSENT_REVOKED` | Cross-brand consent withdrawn | INFO |

#### 2.1.7 System Events

| Event Type | Description | Severity |
|------------|-------------|----------|
| `MERKLE_ANCHOR_CREATED` | Daily Merkle root anchored | INFO |
| `HASH_CHAIN_VERIFIED` | Chain integrity verified | DEBUG |
| `HASH_CHAIN_BREAK_DETECTED` | Integrity violation found | CRITICAL |
| `RECONCILIATION_RUN` | Consistency check completed | INFO |
| `SYSTEM_CONFIG_CHANGED` | Configuration modified | WARNING |
| `SERVICE_STARTED` | System component started | INFO |
| `SERVICE_STOPPED` | System component stopped | WARNING |

### 2.2 Event Type Enumeration

```typescript
export enum AuditEventType {
  // Access Control
  ROLE_GRANTED = 'ROLE_GRANTED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  ROLE_SUSPENDED = 'ROLE_SUSPENDED',
  ROLE_REINSTATED = 'ROLE_REINSTATED',
  PERMISSION_CHECKED = 'PERMISSION_CHECKED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',

  // Data Lifecycle
  DATA_CREATED = 'DATA_CREATED',
  DATA_READ = 'DATA_READ',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',
  DATA_EXPORTED = 'DATA_EXPORTED',

  // Token Operations
  TOKEN_DEPLOYED = 'TOKEN_DEPLOYED',
  TOKEN_TRANSFERRED = 'TOKEN_TRANSFERRED',
  TOKEN_BURNED = 'TOKEN_BURNED',
  TOKEN_FROZEN = 'TOKEN_FROZEN',
  TOKEN_UNFROZEN = 'TOKEN_UNFROZEN',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',

  // CRAB Model
  ENCRYPTION_KEY_CREATED = 'ENCRYPTION_KEY_CREATED',
  ENCRYPTION_KEY_ROTATED = 'ENCRYPTION_KEY_ROTATED',
  ENCRYPTION_KEY_DESTROYED = 'ENCRYPTION_KEY_DESTROYED',
  CONTENT_ORPHANED = 'CONTENT_ORPHANED',

  // Compliance
  ERASURE_REQUESTED = 'ERASURE_REQUESTED',
  ERASURE_COMPLETED = 'ERASURE_COMPLETED',
  ERASURE_REFUSED = 'ERASURE_REFUSED',
  RETENTION_PERIOD_STARTED = 'RETENTION_PERIOD_STARTED',
  RETENTION_PERIOD_EXPIRED = 'RETENTION_PERIOD_EXPIRED',
  LEGAL_HOLD_APPLIED = 'LEGAL_HOLD_APPLIED',
  LEGAL_HOLD_RELEASED = 'LEGAL_HOLD_RELEASED',

  // Identity
  IDENTITY_REGISTERED = 'IDENTITY_REGISTERED',
  IDENTITY_UPDATED = 'IDENTITY_UPDATED',
  IDENTITY_REMOVED = 'IDENTITY_REMOVED',
  CLAIM_ISSUED = 'CLAIM_ISSUED',
  CLAIM_REVOKED = 'CLAIM_REVOKED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',

  // System
  MERKLE_ANCHOR_CREATED = 'MERKLE_ANCHOR_CREATED',
  HASH_CHAIN_VERIFIED = 'HASH_CHAIN_VERIFIED',
  HASH_CHAIN_BREAK_DETECTED = 'HASH_CHAIN_BREAK_DETECTED',
  RECONCILIATION_RUN = 'RECONCILIATION_RUN',
  SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED',
  SERVICE_STARTED = 'SERVICE_STARTED',
  SERVICE_STOPPED = 'SERVICE_STOPPED'
}
```

---

## 3. Audit Log Entry Schema

### 3.1 Complete Entry Schema

```typescript
interface AuditLogEntry {
  // ═══════════════════════════════════════════════════════════════
  // IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Unique entry identifier (UUID v7 for time-ordered sorting)
   * @example "01932e89-7d3b-7c3d-9a1e-2f4b5c6d7e8f"
   */
  entryId: string;

  /**
   * Monotonically increasing sequence number
   * Used for chain ordering and gap detection
   */
  sequenceNumber: bigint;

  /**
   * ISO 8601 UTC timestamp of entry creation
   * @example "2026-01-31T10:30:00.000Z"
   */
  timestamp: string;

  // ═══════════════════════════════════════════════════════════════
  // HASH CHAIN
  // ═══════════════════════════════════════════════════════════════

  /**
   * SHA-256 hash of the previous entry (hex-encoded with 0x prefix)
   * Genesis entry uses 64 zeros: 0x0000...0000
   * @example "0x7a3b5c9d8e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b"
   */
  previousHash: string;

  /**
   * SHA-256 hash of this entry (computed from canonicalized JSON)
   * @example "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
   */
  entryHash: string;

  // ═══════════════════════════════════════════════════════════════
  // EVENT CONTENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Type of audit event
   */
  eventType: AuditEventType;

  /**
   * Severity level for filtering and alerting
   */
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'CRITICAL';

  /**
   * Information about the actor performing the action
   */
  actor: ActorInfo;

  /**
   * Human-readable action description
   * @example "Granted OPERATOR_ROLE to 0x1234...5678"
   */
  action: string;

  /**
   * Information about the affected resource
   */
  resource: ResourceInfo;

  /**
   * Outcome of the action
   */
  outcome: 'success' | 'failure' | 'partial';

  /**
   * Reason for failure (only if outcome != 'success')
   */
  failureReason?: string;

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════

  /**
   * Additional event-specific metadata
   */
  metadata: Record<string, unknown>;

  /**
   * Merkle anchor reference (populated after daily anchoring)
   */
  merkleAnchor?: MerkleAnchorRef;
}

interface ActorInfo {
  /**
   * Type of actor
   */
  type: 'user' | 'service' | 'system' | 'contract';

  /**
   * Actor identifier
   * - user: DID (did:galileo:...) or wallet address
   * - service: Service account name
   * - system: 'galileo-system'
   * - contract: Contract address
   */
  identifier: string;

  /**
   * Actor's role at time of action
   */
  role?: string;

  /**
   * Client IP address (hashed for privacy if needed)
   */
  ipAddress?: string;

  /**
   * User agent string (for API requests)
   */
  userAgent?: string;

  /**
   * JWT token ID (jti) for traceability
   */
  tokenId?: string;
}

interface ResourceInfo {
  /**
   * Type of resource affected
   */
  type: 'token' | 'identity' | 'dpp' | 'role' | 'claim' | 'compliance' | 'system';

  /**
   * Resource identifier (DID, address, ID)
   */
  identifier: string;

  /**
   * Additional resource attributes
   */
  attributes?: Record<string, unknown>;
}

interface MerkleAnchorRef {
  /**
   * Anchor identifier
   */
  anchorId: string;

  /**
   * Leaf index in Merkle tree
   */
  leafIndex: bigint;

  /**
   * Merkle proof path (for independent verification)
   */
  proofPath: string[];
}
```

### 3.2 Example Entries

#### Role Granted Event

```json
{
  "entryId": "01932e89-7d3b-7c3d-9a1e-2f4b5c6d7e8f",
  "sequenceNumber": "1234567",
  "timestamp": "2026-01-31T10:30:00.000Z",
  "previousHash": "0x7a3b5c9d8e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b",
  "entryHash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  "eventType": "ROLE_GRANTED",
  "severity": "INFO",
  "actor": {
    "type": "user",
    "identifier": "did:galileo:brand:hermesparis",
    "role": "brand_admin",
    "ipAddress": "sha256:192.168.1.100",
    "tokenId": "jti-abc123"
  },
  "action": "Granted OPERATOR_ROLE to 0x1234567890abcdef",
  "resource": {
    "type": "role",
    "identifier": "OPERATOR_ROLE",
    "attributes": {
      "grantee": "0x1234567890abcdef",
      "brandScope": "did:galileo:brand:hermesparis"
    }
  },
  "outcome": "success",
  "metadata": {
    "identityVerified": true,
    "claimTopic": "0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56",
    "transactionHash": "0xabc123..."
  }
}
```

#### Token Transfer Event

```json
{
  "entryId": "01932e89-8a1c-7d4e-9b2f-3a5c6d7e8f90",
  "sequenceNumber": "1234568",
  "timestamp": "2026-01-31T10:31:00.000Z",
  "previousHash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  "entryHash": "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
  "eventType": "TOKEN_TRANSFERRED",
  "severity": "INFO",
  "actor": {
    "type": "user",
    "identifier": "0xsender123...",
    "role": "operator"
  },
  "action": "Transferred ownership of product token",
  "resource": {
    "type": "token",
    "identifier": "did:galileo:01:09506000134352:21:ABC123",
    "attributes": {
      "from": "0xsender123...",
      "to": "0xreceiver456...",
      "reasonCode": "SALE"
    }
  },
  "outcome": "success",
  "metadata": {
    "complianceModulesChecked": ["JURISDICTION", "SANCTIONS", "KYC"],
    "transactionHash": "0xdef456..."
  }
}
```

#### Erasure Request Event

```json
{
  "entryId": "01932e89-9b2d-7e5f-9c3a-4b6d7e8f9012",
  "sequenceNumber": "1234569",
  "timestamp": "2026-01-31T10:32:00.000Z",
  "previousHash": "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
  "entryHash": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
  "eventType": "ERASURE_REQUESTED",
  "severity": "INFO",
  "actor": {
    "type": "user",
    "identifier": "did:galileo:customer:anon-sha256abc..."
  },
  "action": "GDPR erasure request submitted",
  "resource": {
    "type": "identity",
    "identifier": "did:galileo:customer:anon-sha256abc...",
    "attributes": {
      "dataCategories": ["purchase_history", "service_records"]
    }
  },
  "outcome": "success",
  "metadata": {
    "requestId": "ERASURE-2026-00123",
    "deadline": "2026-03-02T10:32:00.000Z",
    "retentionCheckRequired": true
  }
}
```

---

## 4. Hash Chain Protocol

### 4.1 Overview

The hash chain creates a tamper-evident structure where each entry cryptographically links to its predecessor. Any modification to a historical entry breaks the chain, making tampering detectable.

### 4.2 Hash Computation

```
entryHash = SHA-256(canonicalize(entryWithoutHash))
```

**Canonicalization:** Use [RFC 8785 JSON Canonicalization Scheme (JCS)](https://datatracker.ietf.org/doc/html/rfc8785) for deterministic JSON serialization.

```typescript
import { canonicalize } from 'json-canonicalize';
import { createHash } from 'crypto';

function computeEntryHash(entry: Omit<AuditLogEntry, 'entryHash'>): string {
  // Remove entryHash field for computation
  const { entryHash: _, ...entryWithoutHash } = entry as AuditLogEntry;

  // Canonicalize using RFC 8785 JCS
  const canonical = canonicalize(entryWithoutHash);

  // Compute SHA-256
  const hash = createHash('sha256').update(canonical).digest('hex');

  return `0x${hash}`;
}
```

### 4.3 Chain Linking

Each entry links to its predecessor:

```
Entry(n).previousHash = Entry(n-1).entryHash
```

**Genesis Entry:**

The first entry in the chain uses a special "genesis" previousHash:

```
previousHash = "0x0000000000000000000000000000000000000000000000000000000000000000"
```

### 4.4 Chain Diagram

```
+-------------+    +-------------+    +-------------+    +-------------+
|  Entry 0    |    |  Entry 1    |    |  Entry 2    |    |  Entry n    |
|-------------|    |-------------|    |-------------|    |-------------|
| prevHash:   |    | prevHash:   |    | prevHash:   |    | prevHash:   |
| 0x0000...   |<---| hash(E0)    |<---| hash(E1)    |<---| hash(En-1)  |
|             |    |             |    |             |    |             |
| entryHash:  |    | entryHash:  |    | entryHash:  |    | entryHash:  |
| hash(E0)    |    | hash(E1)    |    | hash(E2)    |    | hash(En)    |
+-------------+    +-------------+    +-------------+    +-------------+
    Genesis
```

### 4.5 Chain Verification

```typescript
async function verifyChain(
  startSequence: bigint,
  endSequence: bigint
): Promise<ChainVerificationResult> {
  const entries = await getEntriesInRange(startSequence, endSequence);

  let expectedPreviousHash = entries[0].previousHash;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Verify previousHash matches
    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        breakAt: entry.sequenceNumber,
        reason: 'previousHash_mismatch',
        expected: expectedPreviousHash,
        actual: entry.previousHash
      };
    }

    // Verify entryHash is correct
    const computedHash = computeEntryHash(entry);
    if (entry.entryHash !== computedHash) {
      return {
        valid: false,
        breakAt: entry.sequenceNumber,
        reason: 'entryHash_invalid',
        expected: computedHash,
        actual: entry.entryHash
      };
    }

    // Update expected for next iteration
    expectedPreviousHash = entry.entryHash;
  }

  return { valid: true, entriesVerified: entries.length };
}
```

### 4.6 Chain Break Detection

When a chain break is detected:

1. **Quarantine:** Mark affected entries for investigation
2. **Alert:** Trigger CRITICAL security alert
3. **Forensics:** Preserve all evidence for investigation
4. **Report:** Generate incident report with details

```typescript
async function handleChainBreak(
  breakInfo: ChainVerificationResult
): Promise<void> {
  // Log CRITICAL event
  await logAuditEvent({
    eventType: AuditEventType.HASH_CHAIN_BREAK_DETECTED,
    severity: 'CRITICAL',
    actor: { type: 'system', identifier: 'galileo-system' },
    action: `Chain break detected at sequence ${breakInfo.breakAt}`,
    resource: { type: 'system', identifier: 'audit_log' },
    outcome: 'failure',
    metadata: breakInfo
  });

  // Quarantine affected entries
  await quarantineEntries(breakInfo.breakAt);

  // Alert security team
  await alertSecurityTeam('CHAIN_BREAK', breakInfo);
}
```

---

## 5. Merkle Tree Anchoring

### 5.1 Overview

Periodic Merkle tree anchoring provides:

- **On-chain verification:** Cryptographic proof entries existed at anchor time
- **Efficient proofs:** O(log n) proof size for any entry
- **Independent verification:** Anyone can verify entry inclusion

### 5.2 Anchor Frequency

| Environment | Frequency | Rationale |
|-------------|-----------|-----------|
| Production | Daily (00:00 UTC) | Balance gas cost vs. proof freshness |
| High-volume | Hourly | More frequent for high-value operations |
| Test/Dev | Manual or disabled | Cost optimization |

### 5.3 Daily Anchor Flow

```
Daily Anchor Flow (00:00 UTC):

1. COLLECT ENTRIES
   - Query all entries since last anchor
   - Verify all entries have valid hashes
   - Record tree size and time range
        |
        v
2. BUILD MERKLE TREE
   - Leaves = entryHash of each entry
   - Build binary tree up to root
   - Store intermediate nodes for proofs
        |
        v
3. ANCHOR ON-CHAIN
   - Emit AuditAnchor event with:
     - rootHash: bytes32
     - treeSize: uint256
     - startSequence: uint256
     - endSequence: uint256
   - Cost: ~50,000 gas
        |
        v
4. STORE ANCHOR METADATA
   - Record anchor in database
   - Store tree structure for proof generation
   - Update entries with anchor references
        |
        v
5. NOTIFY STAKEHOLDERS
   - Publish anchor to subscribers
   - Update monitoring dashboards
```

### 5.4 Merkle Tree Structure

```
                    Root Hash (anchored on-chain)
                           /    \
                          /      \
                 Hash(A,B)        Hash(C,D)
                  /    \           /    \
                 /      \         /      \
            Hash(1,2) Hash(3,4) Hash(5,6) Hash(7,8)
               |  |      |  |     |  |      |  |
              E1 E2     E3 E4    E5 E6     E7 E8

        E1-E8 = entryHash values from audit log entries
```

### 5.5 Merkle Proof Generation

```typescript
interface MerkleProof {
  entryHash: string;      // Leaf hash being proven
  leafIndex: number;      // Position in tree
  treeSize: number;       // Total leaves in tree
  proofPath: string[];    // Sibling hashes from leaf to root
  rootHash: string;       // Expected root (matches on-chain)
}

function generateMerkleProof(
  entryHash: string,
  tree: MerkleTree
): MerkleProof {
  const leafIndex = tree.findLeafIndex(entryHash);
  const proofPath = tree.getProofPath(leafIndex);

  return {
    entryHash,
    leafIndex,
    treeSize: tree.leafCount,
    proofPath,
    rootHash: tree.root
  };
}
```

### 5.6 Proof Verification

```typescript
function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.entryHash;
  let index = proof.leafIndex;

  for (const siblingHash of proof.proofPath) {
    // Determine order (left or right sibling)
    if (index % 2 === 0) {
      currentHash = sha256(currentHash + siblingHash);
    } else {
      currentHash = sha256(siblingHash + currentHash);
    }
    index = Math.floor(index / 2);
  }

  return currentHash === proof.rootHash;
}
```

### 5.7 On-Chain Anchor Contract Interface

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface IAuditAnchor {
    /**
     * @notice Emitted when a new Merkle root is anchored
     * @param anchorId Unique identifier for this anchor
     * @param rootHash Merkle root of audit entries
     * @param treeSize Number of entries in the tree
     * @param startSequence First entry sequence number
     * @param endSequence Last entry sequence number
     * @param timestamp Block timestamp of anchor
     */
    event AuditAnchor(
        bytes32 indexed anchorId,
        bytes32 rootHash,
        uint256 treeSize,
        uint256 startSequence,
        uint256 endSequence,
        uint256 timestamp
    );

    /**
     * @notice Anchor a new Merkle root
     * @param rootHash The Merkle root to anchor
     * @param treeSize Number of leaves in the tree
     * @param startSequence First sequence number included
     * @param endSequence Last sequence number included
     */
    function anchorMerkleRoot(
        bytes32 rootHash,
        uint256 treeSize,
        uint256 startSequence,
        uint256 endSequence
    ) external;

    /**
     * @notice Get anchor by ID
     * @param anchorId The anchor identifier
     */
    function getAnchor(bytes32 anchorId) external view returns (
        bytes32 rootHash,
        uint256 treeSize,
        uint256 startSequence,
        uint256 endSequence,
        uint256 timestamp
    );
}
```

---

## 6. Storage Architecture

### 6.1 Primary Storage: PostgreSQL

**Rationale:**
- Mature, reliable RDBMS
- JSONB support for flexible metadata
- Append-only table patterns
- Strong consistency guarantees
- Native partitioning for retention management

### 6.2 Database Schema

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE (Append-only)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
    -- Primary identification
    entry_id UUID PRIMARY KEY,
    sequence_number BIGINT UNIQUE NOT NULL,

    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Hash chain
    previous_hash VARCHAR(66) NOT NULL,  -- 0x + 64 hex chars
    entry_hash VARCHAR(66) NOT NULL,

    -- Event classification
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL,

    -- Actor information (JSONB for flexibility)
    actor JSONB NOT NULL,

    -- Action details
    action TEXT NOT NULL,

    -- Resource information (JSONB)
    resource JSONB NOT NULL,

    -- Outcome
    outcome VARCHAR(16) NOT NULL,
    failure_reason TEXT,

    -- Additional metadata
    metadata JSONB DEFAULT '{}',

    -- Merkle anchor reference (nullable until anchored)
    merkle_anchor_id UUID,
    merkle_leaf_index BIGINT,
    merkle_proof_path JSONB,

    -- Constraints
    CONSTRAINT valid_severity CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'CRITICAL')),
    CONSTRAINT valid_outcome CHECK (outcome IN ('success', 'failure', 'partial')),
    CONSTRAINT hash_format CHECK (
        previous_hash ~ '^0x[a-f0-9]{64}$' AND
        entry_hash ~ '^0x[a-f0-9]{64}$'
    )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX idx_audit_log_sequence ON audit_log (sequence_number);
CREATE INDEX idx_audit_log_event_type ON audit_log (event_type);
CREATE INDEX idx_audit_log_severity ON audit_log (severity);
CREATE INDEX idx_audit_log_actor ON audit_log USING GIN (actor);
CREATE INDEX idx_audit_log_resource ON audit_log USING GIN (resource);
CREATE INDEX idx_audit_log_entry_hash ON audit_log (entry_hash);
CREATE INDEX idx_audit_log_anchor ON audit_log (merkle_anchor_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- IMMUTABILITY ENFORCEMENT
-- ═══════════════════════════════════════════════════════════════════════════

-- Prevent UPDATE operations
CREATE OR REPLACE RULE no_update_audit_log AS
    ON UPDATE TO audit_log
    DO INSTEAD NOTHING;

-- Prevent DELETE operations (except by retention job)
CREATE OR REPLACE RULE no_delete_audit_log AS
    ON DELETE TO audit_log
    WHERE NOT (current_user = 'audit_retention_job')
    DO INSTEAD NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- MERKLE ANCHOR TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE merkle_anchors (
    anchor_id UUID PRIMARY KEY,
    root_hash VARCHAR(66) NOT NULL,
    tree_size BIGINT NOT NULL,
    start_sequence BIGINT NOT NULL,
    end_sequence BIGINT NOT NULL,
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ NOT NULL,

    -- On-chain reference
    chain_id INTEGER,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    anchored_at TIMESTAMPTZ,

    -- Tree data for proof generation
    tree_data JSONB NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merkle_anchors_range ON merkle_anchors (start_sequence, end_sequence);
CREATE INDEX idx_merkle_anchors_time ON merkle_anchors (start_timestamp, end_timestamp);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEQUENCE GENERATOR
-- ═══════════════════════════════════════════════════════════════════════════

CREATE SEQUENCE audit_log_sequence_seq
    START WITH 1
    INCREMENT BY 1
    NO CYCLE;

-- Function to get next sequence (atomic)
CREATE OR REPLACE FUNCTION get_next_audit_sequence()
RETURNS BIGINT AS $$
BEGIN
    RETURN nextval('audit_log_sequence_seq');
END;
$$ LANGUAGE plpgsql;
```

### 6.3 Partitioning Strategy

```sql
-- Partition by month for efficient retention management
CREATE TABLE audit_log_partitioned (
    LIKE audit_log INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Example monthly partitions
CREATE TABLE audit_log_2026_01 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_log_2026_02 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Auto-create future partitions (pg_partman or similar)
```

### 6.4 Hash Index for Verification

```sql
-- Separate hash index table for fast lookups
CREATE TABLE audit_hash_index (
    entry_hash VARCHAR(66) PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES audit_log(entry_id),
    sequence_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_hash_index_sequence ON audit_hash_index (sequence_number);
```

---

## 7. Retention and Archival

### 7.1 Retention Policy

| Data Category | Active Retention | Archive Retention | Total | Legal Basis |
|---------------|------------------|-------------------|-------|-------------|
| Audit Trail | 7 years | 3 years | 10 years | SOX, regulatory |
| Access Logs | 5 years | 2 years | 7 years | 5AMLD |
| System Events | 2 years | 1 year | 3 years | Operational |

### 7.2 Retention Lifecycle

```
Entry Created
     |
     v
+------------------+
| ACTIVE           |  0-7 years
| (Primary Storage)|
+------------------+
     |
     | After 7 years
     v
+------------------+
| ARCHIVED         |  7-10 years
| (Cold Storage)   |
| Merkle proofs    |
| only             |
+------------------+
     |
     | After 10 years (or legal hold release)
     v
+------------------+
| EXPIRED          |
| (Eligible for    |
| deletion)        |
+------------------+
     |
     v
+------------------+
| DELETED          |
| (Verification    |
| record retained) |
+------------------+
```

### 7.3 Legal Hold Support

```sql
-- Legal hold tracking
CREATE TABLE legal_holds (
    hold_id UUID PRIMARY KEY,
    hold_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,  -- NULL = indefinite
    affected_resources JSONB NOT NULL,  -- DIDs, accounts, time ranges
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    released_by VARCHAR(255)
);

-- Check if entry is under hold
CREATE OR REPLACE FUNCTION is_under_legal_hold(p_entry_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM legal_holds h
        JOIN audit_log a ON a.entry_id = p_entry_id
        WHERE h.end_date IS NULL OR h.end_date > NOW()
        AND (
            h.affected_resources @> jsonb_build_object('entries', jsonb_build_array(p_entry_id))
            OR (a.timestamp BETWEEN (h.affected_resources->>'start_time')::timestamptz
                AND (h.affected_resources->>'end_time')::timestamptz)
        )
    );
END;
$$ LANGUAGE plpgsql;
```

### 7.4 Archive Format

Archived entries are stored with:

- Original entry data (compressed)
- Merkle proof for verification
- Anchor reference for on-chain verification

```typescript
interface ArchivedEntry {
  entryId: string;
  sequenceNumber: bigint;
  timestamp: string;
  entryHash: string;
  compressedData: Buffer;  // gzip compressed original
  merkleProof: MerkleProof;
  anchorId: string;
}
```

### 7.5 Expiry Workflow

```typescript
async function processExpiredEntries(): Promise<void> {
  // 1. Find expired entries not under legal hold
  const expired = await findExpiredEntries({
    olderThan: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),  // 10 years
    excludeLegalHolds: true
  });

  for (const entry of expired) {
    // 2. Verify Merkle proof is archived
    const proofArchived = await verifyProofArchived(entry.entryId);
    if (!proofArchived) {
      await archiveProof(entry);
    }

    // 3. Record deletion in audit log (meta-entry)
    await logAuditEvent({
      eventType: AuditEventType.DATA_DELETED,
      actor: { type: 'system', identifier: 'audit_retention_job' },
      action: `Deleted expired audit entry ${entry.entryId}`,
      resource: { type: 'system', identifier: entry.entryId }
    });

    // 4. Delete from primary storage
    await deleteEntry(entry.entryId);
  }
}
```

---

## 8. Query and Verification APIs

### 8.1 Query API

```typescript
interface AuditQueryParams {
  // Time range (required)
  startTime?: Date;
  endTime?: Date;

  // Filters
  eventTypes?: AuditEventType[];
  severities?: ('DEBUG' | 'INFO' | 'WARNING' | 'CRITICAL')[];
  actorIdentifier?: string;
  actorRole?: string;
  resourceType?: string;
  resourceIdentifier?: string;
  outcome?: 'success' | 'failure' | 'partial';

  // Pagination
  limit?: number;  // Default 100, max 1000
  offset?: number;
  cursor?: string;  // For cursor-based pagination

  // Sorting
  sortBy?: 'timestamp' | 'sequence_number';
  sortOrder?: 'asc' | 'desc';
}

interface AuditQueryResult {
  entries: AuditLogEntry[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Query endpoint
async function queryAuditLog(
  params: AuditQueryParams,
  requesterRole: string
): Promise<AuditQueryResult> {
  // Verify requester has auditor or regulator role
  if (!['auditor', 'regulator', 'brand_admin'].includes(requesterRole)) {
    throw new ForbiddenError('Insufficient permissions for audit log access');
  }

  // Build and execute query
  const query = buildAuditQuery(params);
  const results = await executeQuery(query);

  // Log the access (meta-logging)
  await logAuditEvent({
    eventType: AuditEventType.DATA_READ,
    actor: { type: 'user', role: requesterRole },
    action: 'Queried audit log',
    resource: { type: 'system', identifier: 'audit_log' },
    metadata: { queryParams: params, resultCount: results.length }
  });

  return formatResults(results, params);
}
```

### 8.2 Verification API

```typescript
// Verify single entry integrity
async function verifyEntry(entryId: string): Promise<EntryVerificationResult> {
  const entry = await getEntry(entryId);

  // 1. Verify entry hash
  const computedHash = computeEntryHash(entry);
  const hashValid = entry.entryHash === computedHash;

  // 2. Verify chain link
  const previousEntry = await getEntryBySequence(entry.sequenceNumber - 1n);
  const chainValid = previousEntry
    ? entry.previousHash === previousEntry.entryHash
    : entry.previousHash === GENESIS_HASH;

  // 3. Verify Merkle proof (if anchored)
  let merkleValid = null;
  if (entry.merkleAnchor) {
    const anchor = await getAnchor(entry.merkleAnchor.anchorId);
    const proof = {
      entryHash: entry.entryHash,
      leafIndex: entry.merkleAnchor.leafIndex,
      proofPath: entry.merkleAnchor.proofPath,
      rootHash: anchor.rootHash
    };
    merkleValid = verifyMerkleProof(proof);
  }

  return {
    entryId,
    hashValid,
    chainValid,
    merkleValid,
    overallValid: hashValid && chainValid && (merkleValid !== false)
  };
}

// Verify entry against on-chain anchor
async function verifyAgainstChain(
  entryId: string,
  chainId: number
): Promise<OnChainVerificationResult> {
  const entry = await getEntry(entryId);

  if (!entry.merkleAnchor) {
    return { verified: false, reason: 'not_yet_anchored' };
  }

  // Get on-chain anchor
  const onChainAnchor = await getOnChainAnchor(
    chainId,
    entry.merkleAnchor.anchorId
  );

  if (!onChainAnchor) {
    return { verified: false, reason: 'anchor_not_found_on_chain' };
  }

  // Verify Merkle proof against on-chain root
  const proofValid = verifyMerkleProof({
    entryHash: entry.entryHash,
    leafIndex: entry.merkleAnchor.leafIndex,
    proofPath: entry.merkleAnchor.proofPath,
    rootHash: onChainAnchor.rootHash
  });

  return {
    verified: proofValid,
    anchorId: entry.merkleAnchor.anchorId,
    anchorTimestamp: onChainAnchor.timestamp,
    blockNumber: onChainAnchor.blockNumber,
    transactionHash: onChainAnchor.transactionHash
  };
}
```

### 8.3 Export API

```typescript
interface AuditExportParams {
  startTime: Date;
  endTime: Date;
  format: 'json' | 'csv' | 'parquet';
  includeProofs: boolean;
  compress: boolean;
}

async function exportAuditLog(
  params: AuditExportParams,
  requesterRole: string
): Promise<ExportResult> {
  // Verify permissions
  if (!['auditor', 'regulator'].includes(requesterRole)) {
    throw new ForbiddenError('Export requires auditor or regulator role');
  }

  // Queue export job (for large exports)
  const jobId = await queueExportJob(params);

  return {
    jobId,
    status: 'processing',
    estimatedTime: calculateEstimatedTime(params)
  };
}
```

---

## 9. Failure Handling

### 9.1 Write Failure Recovery

```typescript
async function writeAuditEntry(
  event: AuditEvent,
  idempotencyKey: string
): Promise<WriteResult> {
  // Check for duplicate (idempotency)
  const existing = await findByIdempotencyKey(idempotencyKey);
  if (existing) {
    return { status: 'duplicate', entryId: existing.entryId };
  }

  // Get sequence and previous hash atomically
  const { sequenceNumber, previousHash } = await getNextChainPosition();

  // Build entry
  const entry = buildEntry(event, sequenceNumber, previousHash);

  try {
    // Attempt write
    await insertEntry(entry, idempotencyKey);
    return { status: 'success', entryId: entry.entryId };

  } catch (error) {
    if (isSequenceConflict(error)) {
      // Retry with new sequence
      return writeAuditEntry(event, idempotencyKey);
    }

    // Log to fallback and alert
    await logToFallback(entry, error);
    await alertOperations('AUDIT_WRITE_FAILURE', { entry, error });

    return { status: 'queued_for_retry', fallbackId: entry.entryId };
  }
}
```

### 9.2 Reconciliation Job

```typescript
// Daily consistency check
async function runReconciliation(): Promise<ReconciliationResult> {
  const results: ReconciliationResult = {
    timestamp: new Date(),
    entriesChecked: 0,
    chainsVerified: 0,
    issuesFound: [],
    anchorsVerified: 0
  };

  // 1. Verify sequence continuity (no gaps)
  const gaps = await findSequenceGaps();
  if (gaps.length > 0) {
    results.issuesFound.push({
      type: 'sequence_gap',
      details: gaps
    });
  }

  // 2. Verify hash chain (sample or full)
  const chainResult = await verifyChainSample();
  results.chainsVerified = chainResult.samplesVerified;
  if (!chainResult.valid) {
    results.issuesFound.push({
      type: 'chain_break',
      details: chainResult
    });
  }

  // 3. Verify recent anchors
  const anchorResult = await verifyRecentAnchors(7);  // Last 7 days
  results.anchorsVerified = anchorResult.verified;
  if (anchorResult.failures.length > 0) {
    results.issuesFound.push({
      type: 'anchor_mismatch',
      details: anchorResult.failures
    });
  }

  // 4. Log reconciliation result
  await logAuditEvent({
    eventType: AuditEventType.RECONCILIATION_RUN,
    actor: { type: 'system', identifier: 'reconciliation_job' },
    action: 'Daily audit log reconciliation',
    resource: { type: 'system', identifier: 'audit_log' },
    outcome: results.issuesFound.length === 0 ? 'success' : 'partial',
    metadata: results
  });

  return results;
}
```

### 9.3 Fallback Storage

When primary storage is unavailable:

```typescript
// Fallback to local file + queue
async function logToFallback(
  entry: AuditLogEntry,
  error: Error
): Promise<void> {
  // Write to local append-only file
  const fallbackPath = `/var/log/galileo/audit_fallback_${Date.now()}.jsonl`;
  await fs.appendFile(
    fallbackPath,
    JSON.stringify(entry) + '\n'
  );

  // Queue for later replay
  await messageQueue.publish('audit.fallback', {
    entry,
    fallbackPath,
    originalError: error.message,
    timestamp: new Date()
  });
}

// Replay fallback entries when primary recovers
async function replayFallbackEntries(): Promise<void> {
  const pending = await messageQueue.consume('audit.fallback');

  for (const message of pending) {
    await writeAuditEntry(
      message.entry,
      `fallback-replay-${message.entry.entryId}`
    );
  }
}
```

---

## Appendix A: Event Type Quick Reference

| Category | Events | Severity Range |
|----------|--------|----------------|
| Access Control | 7 events | INFO - CRITICAL |
| Data Lifecycle | 5 events | DEBUG - WARNING |
| Token Operations | 6 events | DEBUG - WARNING |
| CRAB Model | 4 events | INFO - WARNING |
| Compliance | 7 events | INFO - WARNING |
| Identity | 7 events | INFO - WARNING |
| System | 7 events | DEBUG - CRITICAL |
| **Total** | **43 event types** | |

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [RBAC Framework](./rbac-framework.md) | Role change events |
| [hybrid-architecture](../architecture/hybrid-architecture.md) | CRAB model events |
| [Claim Topics](../identity/claim-topics.md) | Identity events |
| [RFC 8785 (JCS)](https://datatracker.ietf.org/doc/html/rfc8785) | Canonicalization |
| [Trillian](https://transparency.dev/) | Merkle tree patterns |

---

*Galileo Luxury Standard - Infrastructure Layer*
*Specification: GSPEC-INFRA-002*
*Classification: Public*
