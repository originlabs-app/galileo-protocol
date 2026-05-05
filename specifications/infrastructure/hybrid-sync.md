# Hybrid Storage Synchronization Protocol Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-31
**Specification ID:** GSPEC-INFRA-004

---

## Table of Contents

1. [Overview](#1-overview)
2. [Event Sourcing Protocol](#2-event-sourcing-protocol)
3. [Consistency Model](#3-consistency-model)
4. [Write Protocol](#4-write-protocol)
5. [Read Protocol](#5-read-protocol)
6. [Consistency States](#6-consistency-states)
7. [Failure Handling](#7-failure-handling)
8. [Reconciliation Protocol](#8-reconciliation-protocol)
9. [CRAB Model Integration](#9-crab-model-integration)
10. [Canonical JSON Specification](#10-canonical-json-specification)
11. [Performance Targets](#11-performance-targets)
12. [Monitoring and Alerting](#12-monitoring-and-alerting)

---

## 1. Overview

### 1.1 Purpose

This specification formalizes the event sourcing protocol and synchronization mechanisms for the Galileo Luxury Standard's hybrid on-chain/off-chain architecture. It extends the foundational patterns defined in hybrid-architecture.md Section 5 with detailed operational procedures.

**Core Principle:**

> Off-chain writes MUST complete before on-chain event emission. This ordering guarantees that on-chain references never point to non-existent content.

### 1.2 Architecture Context

```
                    HYBRID ARCHITECTURE LAYERS

+-------------------------------------------------------------------+
|                        ON-CHAIN LAYER                              |
|                                                                    |
|  - Product tokens (ERC-3643)                                       |
|  - Content hashes (SHA-256)                                        |
|  - Event timestamps (block.timestamp)                              |
|  - Ownership records                                               |
|  - Compliance attestations (boolean only)                          |
|                                                                    |
|  Properties: Immutable, tamper-evident, globally consistent        |
+-------------------------------------------------------------------+
                              |
                     Synchronization Layer
                     (This Specification)
                              |
+-------------------------------------------------------------------+
|                       OFF-CHAIN LAYER                              |
|                                                                    |
|  - DPP content (full product details)                              |
|  - Lifecycle events (complete records)                             |
|  - Customer PII                                                    |
|  - W3C Verifiable Credentials                                      |
|  - Media attachments                                               |
|                                                                    |
|  Properties: Mutable, erasable, access-controlled                  |
+-------------------------------------------------------------------+
```

### 1.3 Relationship to hybrid-architecture.md

This specification extends Section 5 (Event Sourcing Protocol) with:

- Detailed state machine for synchronization states
- Comprehensive failure handling procedures
- Reconciliation protocol for consistency recovery
- Monitoring and alerting requirements
- Integration with CRAB model for erasure scenarios

---

## 2. Event Sourcing Protocol

### 2.1 Six-Step Event Flow

The canonical event flow for all product lifecycle events:

```
+----------------------------------------------------------------------+
|  STEP 1: ACTION OCCURS                                                |
+----------------------------------------------------------------------+
|  Trigger: Product lifecycle event (create, transfer, service, etc.)   |
|                                                                       |
|  Input:                                                               |
|    - Event type (enum)                                                |
|    - Product DID                                                      |
|    - Event payload (type-specific)                                    |
|    - Actor identity (DID or address)                                  |
|    - Timestamp (client-side, will be validated)                       |
|                                                                       |
|  Validation:                                                          |
|    - Actor authorized for event type                                  |
|    - Product exists and is active                                     |
|    - Payload matches event type schema                                |
+----------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------+
|  STEP 2: OFF-CHAIN FIRST (CRITICAL)                                   |
+----------------------------------------------------------------------+
|  Action: Store complete event in off-chain store BEFORE on-chain      |
|                                                                       |
|  Process:                                                             |
|    1. Generate eventId (UUID v7 - time-ordered)                       |
|    2. Canonicalize event payload (RFC 8785 JCS)                       |
|    3. Compute contentHash (SHA-256 of canonical JSON)                 |
|    4. Apply encryption if sensitive (CRAB model)                      |
|    5. Write to off-chain store                                        |
|    6. Receive write confirmation                                      |
|                                                                       |
|  Output:                                                              |
|    - offChainEventId: UUID                                            |
|    - contentHash: bytes32                                             |
|    - writeTimestamp: Date                                             |
|                                                                       |
|  CRITICAL: DO NOT proceed to Step 3 until write confirmed.            |
+----------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------+
|  STEP 3: WAIT FOR CONFIRMATION                                        |
+----------------------------------------------------------------------+
|  Purpose: Ensure off-chain durability before on-chain emission        |
|                                                                       |
|  Confirmation Criteria:                                               |
|    - Write acknowledged by primary store                              |
|    - Replication to N replicas (configurable, default: 1)             |
|    - Optional: Write to backup region                                 |
|                                                                       |
|  Timeout Handling:                                                    |
|    - Initial timeout: 5 seconds                                       |
|    - Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s              |
|    - Max retries: 5                                                   |
|    - On max retry: FAIL, do NOT emit on-chain event                   |
|                                                                       |
|  Failure Recovery:                                                    |
|    - Log failure with correlation ID                                  |
|    - Return error to caller                                           |
|    - Event not recorded (safe state)                                  |
+----------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------+
|  STEP 4: ON-CHAIN ANCHOR                                              |
+----------------------------------------------------------------------+
|  Action: Emit on-chain event with content hash reference              |
|                                                                       |
|  Transaction:                                                         |
|    Function: emitLifecycleEvent(                                      |
|      productDID: string,                                              |
|      eventType: EventType,                                            |
|      contentHash: bytes32,                                            |
|      timestamp: uint256                                               |
|    )                                                                  |
|                                                                       |
|  Confirmation:                                                        |
|    - Wait for transaction receipt                                     |
|    - Wait for 12 block confirmations (finality)                       |
|    - Record transactionHash and blockNumber                           |
|                                                                       |
|  Gas Optimization:                                                    |
|    - Batch multiple events when possible                              |
|    - Use calldata for hash storage                                    |
|    - Emit event (cheaper than storage)                                |
+----------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------+
|  STEP 5: INDEX UPDATE                                                 |
+----------------------------------------------------------------------+
|  Action: Create bidirectional link between on-chain and off-chain     |
|                                                                       |
|  Index Entries:                                                       |
|    Forward: contentHash -> offChainEventId                            |
|    Reverse: productDID -> [eventIds ordered by timestamp]             |
|    Transaction: transactionHash -> [eventIds in tx]                   |
|                                                                       |
|  Update Process:                                                      |
|    1. Listen for on-chain event (indexer subscription)                |
|    2. Extract contentHash from event                                  |
|    3. Look up offChainEventId from pending writes                     |
|    4. Create index entries                                            |
|    5. Mark sync as complete                                           |
+----------------------------------------------------------------------+
                                    |
                                    v
+----------------------------------------------------------------------+
|  STEP 6: PERIODIC MERKLE ANCHOR (OPTIONAL)                            |
+----------------------------------------------------------------------+
|  Action: Batch events into Merkle tree for compact proofs             |
|                                                                       |
|  Frequency: Daily (configurable)                                      |
|                                                                       |
|  Process:                                                             |
|    1. Collect all events since last anchor                            |
|    2. Build Merkle tree with contentHashes as leaves                  |
|    3. Compute Merkle root                                             |
|    4. Anchor root hash on-chain                                       |
|    5. Store tree structure for proof generation                       |
|                                                                       |
|  Benefits:                                                            |
|    - Compact inclusion proofs                                         |
|    - Batch verification                                               |
|    - Reduced on-chain lookups for auditors                            |
+----------------------------------------------------------------------+
```

### 2.2 Event Types

| Event Type | Description | On-Chain Data | Off-Chain Data |
|------------|-------------|---------------|----------------|
| `CREATED` | Product registered | productDID, contentHash, brandDID | Full DPP content |
| `TRANSFERRED` | Ownership change | from, to, contentHash | Transfer details, price |
| `SERVICED` | Repair/maintenance | servicerDID, contentHash | Service records |
| `AUTHENTICATED` | Authenticity verified | authenticatorDID, result | Evidence, methodology |
| `UPDATED` | DPP content change | contentHash (new) | Updated content |
| `DECOMMISSIONED` | End of life | reason, contentHash | Final status record |

### 2.3 Event Envelope Schema

```typescript
interface LifecycleEvent {
  // Identification
  eventId: string;           // UUID v7
  eventType: EventType;
  timestamp: string;         // ISO 8601 UTC

  // Product reference
  productDID: string;        // did:galileo:01:...

  // Actor
  actor: {
    type: 'brand' | 'owner' | 'service_center' | 'authenticator' | 'system';
    did: string;
    address?: string;        // Ethereum address if on-chain
  };

  // Content
  payload: Record<string, unknown>;  // Event-specific data

  // Hashing
  contentHash: string;       // SHA-256 of canonical payload
  hashAlgorithm: 'sha256';
  canonicalization: 'rfc8785';

  // Sync status (off-chain only)
  syncStatus: {
    offChainWritten: Date;
    onChainAnchored?: Date;
    transactionHash?: string;
    blockNumber?: number;
    confirmed: boolean;
  };
}
```

---

## 3. Consistency Model

### 3.1 Consistency Guarantees

| Operation | Consistency Level | Guarantee | Latency |
|-----------|-------------------|-----------|---------|
| **Writes** | Strong | Off-chain confirmed before on-chain | 15-30s |
| **Reads (off-chain)** | Eventual | May lag on-chain by seconds | < 100ms |
| **Reads (on-chain)** | Strong | Blockchain finality | Block time |
| **Verification** | Strong | Hash comparison | < 200ms |

### 3.2 Write Consistency

```
WRITE CONSISTENCY MODEL

                    +------------------+
                    |  Client Request  |
                    +------------------+
                            |
                            v
                    +------------------+
                    | Off-Chain Write  |<---- MUST complete first
                    | (Strong: ACK)    |
                    +------------------+
                            |
                            v
                    +------------------+
                    | On-Chain Anchor  |<---- Depends on off-chain success
                    | (Strong: Finality)|
                    +------------------+
                            |
                            v
                    +------------------+
                    | Index Update     |<---- Eventually consistent
                    | (Eventual)       |
                    +------------------+

Ordering Guarantee:
  - On-chain event NEVER emitted without off-chain content
  - On-chain timestamp >= off-chain write timestamp
  - Index reflects both within 60 seconds
```

### 3.3 Read Consistency

```
READ CONSISTENCY MODEL

                    +------------------+
                    |  Client Query    |
                    +------------------+
                            |
            +---------------+---------------+
            |                               |
            v                               v
    +------------------+            +------------------+
    | Primary: Off-Chain|            | Verification:    |
    | (< 100ms)        |            | Compare Hashes   |
    +------------------+            +------------------+
            |                               |
            v                               v
    [Return content]            [Return consistency state]

Read Staleness Window:
  - Typical: 5 seconds (indexer lag)
  - Maximum: 60 seconds (SLA)
  - Stale reads: Flagged, not failed
```

### 3.4 Conflict Resolution Rules

| Conflict Scenario | Resolution | Rationale |
|-------------------|------------|-----------|
| **Ownership dispute** | On-chain wins | Blockchain finality is authoritative |
| **Content dispute** | Off-chain wins | Latest version is authoritative |
| **Hash mismatch** | Quarantine | Do not auto-resolve; investigate |
| **Timestamp conflict** | On-chain wins | Block timestamp is canonical |
| **Ordering conflict** | On-chain order | Transaction ordering is canonical |

---

## 4. Write Protocol

### 4.1 Write Protocol Interface

```typescript
interface WriteProtocol {
  /**
   * Prepare event for writing (canonicalization, hashing)
   */
  prepareEvent(event: LifecycleEvent): CanonicalEvent;

  /**
   * Step 2: Write to off-chain store (MUST succeed first)
   * @returns Off-chain write result with eventId
   */
  writeOffChain(event: CanonicalEvent): Promise<OffChainResult>;

  /**
   * Step 4: Anchor on-chain with content hash
   * @returns Transaction result with hash and block
   */
  anchorOnChain(
    productDID: string,
    eventType: EventType,
    contentHash: string
  ): Promise<OnChainResult>;

  /**
   * Step 5: Update index with bidirectional links
   */
  updateIndex(
    offChainId: string,
    onChainTx: string,
    contentHash: string
  ): Promise<void>;

  /**
   * Complete write with all steps
   * Orchestrates steps 1-5 with proper ordering and error handling
   */
  write(event: LifecycleEvent): Promise<WriteResult>;
}

interface CanonicalEvent {
  canonicalJson: string;      // RFC 8785 canonical form
  contentHash: string;        // SHA-256 of canonicalJson
  originalEvent: LifecycleEvent;
}

interface OffChainResult {
  success: boolean;
  eventId: string;            // UUID assigned by store
  timestamp: Date;
  replicatedTo: number;       // Number of replicas
  error?: string;
}

interface OnChainResult {
  success: boolean;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: Date;
  gasUsed: bigint;
  error?: string;
}

interface WriteResult {
  state: 'synced' | 'pending_anchor' | 'failed';
  eventId: string;
  contentHash: string;
  offChainTimestamp: Date;
  onChainTxHash?: string;
  onChainBlockNumber?: number;
  error?: string;
}
```

### 4.2 Write Implementation Flow

```typescript
async function write(event: LifecycleEvent): Promise<WriteResult> {
  // Step 1: Prepare
  const canonical = prepareEvent(event);

  // Step 2: Off-chain first (CRITICAL)
  const offChainResult = await writeOffChain(canonical);

  if (!offChainResult.success) {
    // Off-chain failed - safe state, event not recorded
    return {
      state: 'failed',
      eventId: '',
      contentHash: canonical.contentHash,
      offChainTimestamp: new Date(),
      error: `Off-chain write failed: ${offChainResult.error}`
    };
  }

  // Step 3: Confirmation received (implicit in writeOffChain)

  // Step 4: On-chain anchor
  try {
    const onChainResult = await anchorOnChain(
      event.productDID,
      event.eventType,
      canonical.contentHash
    );

    if (!onChainResult.success) {
      // On-chain failed but off-chain succeeded
      // Safe state: content exists, will retry anchor
      return {
        state: 'pending_anchor',
        eventId: offChainResult.eventId,
        contentHash: canonical.contentHash,
        offChainTimestamp: offChainResult.timestamp,
        error: `On-chain anchor failed (retryable): ${onChainResult.error}`
      };
    }

    // Step 5: Index update
    await updateIndex(
      offChainResult.eventId,
      onChainResult.transactionHash,
      canonical.contentHash
    );

    return {
      state: 'synced',
      eventId: offChainResult.eventId,
      contentHash: canonical.contentHash,
      offChainTimestamp: offChainResult.timestamp,
      onChainTxHash: onChainResult.transactionHash,
      onChainBlockNumber: onChainResult.blockNumber
    };

  } catch (error) {
    // On-chain exception but off-chain succeeded
    return {
      state: 'pending_anchor',
      eventId: offChainResult.eventId,
      contentHash: canonical.contentHash,
      offChainTimestamp: offChainResult.timestamp,
      error: `On-chain exception (retryable): ${error.message}`
    };
  }
}
```

### 4.3 Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;           // Default: 5
  initialDelayMs: number;       // Default: 1000
  maxDelayMs: number;           // Default: 30000
  backoffMultiplier: number;    // Default: 2
  jitterFactor: number;         // Default: 0.1
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  isRetryable: (error: Error) => boolean
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === config.maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const jitter = delay * config.jitterFactor * (Math.random() - 0.5) * 2;
      await sleep(Math.min(delay + jitter, config.maxDelayMs));
      delay *= config.backoffMultiplier;
    }
  }

  throw lastError;
}

// Retryable errors for on-chain operations
function isOnChainRetryable(error: Error): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'NONCE_EXPIRED',
    'REPLACEMENT_UNDERPRICED',
    'INSUFFICIENT_FUNDS',      // Temporary, if gas refilled
  ];
  return retryableCodes.some(code => error.message.includes(code));
}
```

### 4.4 Idempotency

To ensure safe retries, all writes are idempotent:

```typescript
interface IdempotencyKey {
  productDID: string;
  eventType: EventType;
  contentHash: string;
  clientRequestId: string;    // UUID from client
}

// Before writing, check for existing event with same idempotency key
async function ensureIdempotent(key: IdempotencyKey): Promise<ExistingEvent | null> {
  return await eventStore.findByIdempotencyKey(key);
}
```

---

## 5. Read Protocol

### 5.1 Read Protocol Interface

```typescript
interface ReadProtocol {
  /**
   * Primary read path: Query off-chain by product DID
   * Returns latest state and event history
   */
  readProduct(productDID: string): Promise<ProductData>;

  /**
   * Read specific event by ID
   */
  readEvent(eventId: string): Promise<LifecycleEvent>;

  /**
   * Verify consistency between on-chain hash and off-chain content
   */
  verifyConsistency(productDID: string): Promise<ConsistencyResult>;

  /**
   * Fallback: Reconstruct from on-chain events only
   * Returns partial data (hashes, timestamps, types only)
   */
  reconstructFromChain(productDID: string): Promise<PartialProductData>;

  /**
   * Batch read for multiple products
   */
  readProducts(productDIDs: string[]): Promise<ProductData[]>;
}

interface ProductData {
  productDID: string;
  currentState: ProductState;
  events: LifecycleEvent[];
  consistencyState: ConsistencyState;
  lastVerified: Date;
}

interface PartialProductData {
  productDID: string;
  eventHashes: {
    eventType: EventType;
    contentHash: string;
    blockNumber: number;
    timestamp: Date;
  }[];
  warning: 'off_chain_unavailable';
}

interface ConsistencyResult {
  productDID: string;
  state: ConsistencyState;
  verifiedAt: Date;
  details: {
    eventId: string;
    offChainHash: string;
    onChainHash: string;
    match: boolean;
  }[];
  discrepancies: Discrepancy[];
}
```

### 5.2 Read Flow Diagram

```
                        READ FLOW

                    +------------------+
                    |  Client Request  |
                    |  readProduct(DID)|
                    +------------------+
                            |
                            v
                    +------------------+
                    | 1. Query Index   |
                    |    by productDID |
                    +------------------+
                            |
            +---------------+---------------+
            |                               |
            v                               v
    [Events found]                  [No events found]
            |                               |
            v                               v
    +------------------+            +------------------+
    | 2. Fetch off-chain|            | Return: Product  |
    |    content       |            | not found        |
    +------------------+            +------------------+
            |
            v
    +------------------+
    | 3. Verify hashes |
    |    (optional)    |
    +------------------+
            |
            v
    +------------------+
    | 4. Return with   |
    |    consistency   |
    |    state         |
    +------------------+
```

### 5.3 Cache Strategy

```typescript
interface CacheConfig {
  // Content cache (off-chain data)
  contentCache: {
    ttl: number;              // Default: 60 seconds
    maxSize: number;          // Default: 10000 items
    strategy: 'lru';          // Least recently used
  };

  // Verification cache (consistency results)
  verificationCache: {
    ttl: number;              // Default: 300 seconds (5 min)
    maxSize: number;          // Default: 5000 items
  };

  // Index cache (hash -> eventId mappings)
  indexCache: {
    ttl: number;              // Default: 600 seconds (10 min)
    maxSize: number;          // Default: 50000 items
  };
}

// Cache invalidation triggers
enum CacheInvalidationTrigger {
  NEW_EVENT = 'new_event',           // On new event for product
  CONTENT_UPDATE = 'content_update', // On content modification
  VERIFICATION_FAIL = 'verify_fail', // On consistency check failure
  TTL_EXPIRED = 'ttl_expired',       // Natural expiration
  MANUAL = 'manual'                  // Explicit invalidation
}
```

---

## 6. Consistency States

### 6.1 State Definitions

| State | Definition | Detection | Next Action |
|-------|------------|-----------|-------------|
| **VERIFIED** | Off-chain hash matches on-chain hash | Hash comparison succeeds | Normal operation |
| **PENDING** | Off-chain exists, not yet anchored on-chain | On-chain event not found | Wait for anchor |
| **MISMATCH** | Hashes don't match | Hash comparison fails | Quarantine, investigate |
| **ORPHANED** | On-chain exists, off-chain deleted (CRAB) | Off-chain lookup returns null | Expected after erasure |
| **MISSING** | On-chain reference, off-chain not found (unexpected) | Off-chain lookup fails | Attempt recovery |

### 6.2 State Machine

```
                        CONSISTENCY STATE MACHINE

                            +----------+
                            |  START   |
                            +----------+
                                  |
                                  v
                        +------------------+
                        |     PENDING      |
                        | (off-chain only) |
                        +------------------+
                                  |
                     [on-chain anchor succeeds]
                                  |
                                  v
                        +------------------+
                        |    VERIFIED      |<---------+
                        | (hashes match)   |          |
                        +------------------+          |
                          |       |       |           |
          [erasure]       | [hash | [re-anchor]       |
                          | mismatch] succeeds]       |
                          v       v       |           |
            +----------+  +----------+    +-----------+
            | ORPHANED |  | MISMATCH |
            | (expected)|  | (error)  |
            +----------+  +----------+
                                  |
                          [recovery fails]
                                  |
                                  v
                        +------------------+
                        |     MISSING      |
                        | (investigation)  |
                        +------------------+
```

### 6.3 State Transition Rules

```typescript
interface StateTransition {
  from: ConsistencyState;
  to: ConsistencyState;
  trigger: TransitionTrigger;
  action: () => void;
}

enum TransitionTrigger {
  ON_CHAIN_ANCHOR = 'on_chain_anchor',
  HASH_MATCH = 'hash_match',
  HASH_MISMATCH = 'hash_mismatch',
  CONTENT_DELETED = 'content_deleted',
  CONTENT_NOT_FOUND = 'content_not_found',
  RECOVERY_SUCCESS = 'recovery_success',
  RECOVERY_FAILED = 'recovery_failed'
}

const transitions: StateTransition[] = [
  // PENDING -> VERIFIED (normal flow)
  {
    from: 'PENDING',
    to: 'VERIFIED',
    trigger: TransitionTrigger.ON_CHAIN_ANCHOR,
    action: () => updateIndex()
  },

  // VERIFIED -> MISMATCH (integrity issue)
  {
    from: 'VERIFIED',
    to: 'MISMATCH',
    trigger: TransitionTrigger.HASH_MISMATCH,
    action: () => quarantineAndAlert()
  },

  // VERIFIED -> ORPHANED (CRAB erasure)
  {
    from: 'VERIFIED',
    to: 'ORPHANED',
    trigger: TransitionTrigger.CONTENT_DELETED,
    action: () => logErasureCompletion()
  },

  // VERIFIED -> MISSING (unexpected)
  {
    from: 'VERIFIED',
    to: 'MISSING',
    trigger: TransitionTrigger.CONTENT_NOT_FOUND,
    action: () => alertAndAttemptRecovery()
  },

  // MISSING -> VERIFIED (recovery success)
  {
    from: 'MISSING',
    to: 'VERIFIED',
    trigger: TransitionTrigger.RECOVERY_SUCCESS,
    action: () => logRecovery()
  }
];
```

### 6.4 State Distribution Monitoring

```
Expected Distribution (Normal Operation):

VERIFIED:  95%+ of records
PENDING:   < 5% (transient, should clear within 60s)
ORPHANED:  Variable (tracks erasure rate)
MISMATCH:  0% target (any occurrence is incident)
MISSING:   0% target (any occurrence is incident)

Alert Thresholds:
- PENDING > 10% for > 5 minutes: Indexer lag warning
- PENDING > 20% for > 10 minutes: Indexer critical
- MISMATCH > 0: Immediate P1 incident
- MISSING > 0: Immediate P1 incident
```

---

## 7. Failure Handling

### 7.1 Failure Scenarios Matrix

| Failure | Detection | Impact | Recovery | Data State |
|---------|-----------|--------|----------|------------|
| **Off-chain write fails** | HTTP error, timeout | Event not recorded | Retry with backoff | Safe: nothing committed |
| **Off-chain write partial** | Replication timeout | Reduced durability | Wait for replication | At-risk: single replica |
| **On-chain anchor fails** | Tx revert, gas error | Event not anchored | Retry on-chain | Safe: off-chain exists |
| **On-chain anchor reverts** | Require failure | Event rejected | Fix and retry | Safe: off-chain exists |
| **Hash mismatch** | Verification | Integrity issue | Quarantine | Preserved for audit |
| **Indexer lag** | Stale queries | Delayed visibility | Wait | Eventually consistent |
| **Network partition** | Off-chain unreachable | Write blocked | Queue, retry later | Dependent on partition |

### 7.2 Recovery Procedures

#### 7.2.1 Off-Chain Write Failure

```
RECOVERY: OFF-CHAIN WRITE FAILURE

Detection:
  - HTTP 5xx response
  - Connection timeout (> 5 seconds)
  - Write acknowledgment not received

Procedure:
  1. Log failure with correlation ID
  2. Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
  3. If all retries fail:
     a. Return error to caller
     b. Event is NOT recorded
     c. Safe state - no orphan possible
  4. If retry succeeds:
     a. Proceed to on-chain anchor
     b. Log recovery

Post-Mortem:
  - Investigate root cause (store availability)
  - No data loss (event simply not recorded)
  - Client may retry if desired
```

#### 7.2.2 On-Chain Anchor Failure

```
RECOVERY: ON-CHAIN ANCHOR FAILURE

Detection:
  - Transaction reverts
  - Gas estimation fails
  - Transaction not mined (timeout)
  - Nonce error

Procedure:
  1. Log failure with off-chain eventId
  2. Mark event as PENDING in off-chain store
  3. Add to anchor retry queue
  4. Background worker retries:
     a. Fetch event from off-chain store
     b. Verify content hash
     c. Retry on-chain emission
     d. On success: Update sync status
     e. On failure: Re-queue with delay
  5. Max retry window: 24 hours
  6. After max window: Alert for manual intervention

Data State:
  - Off-chain content exists and is safe
  - On-chain reference not yet created
  - Event visible in off-chain queries
  - Event not visible in on-chain queries
```

#### 7.2.3 Hash Mismatch Recovery

```
RECOVERY: HASH MISMATCH

Detection:
  - Verification check fails
  - Computed hash != on-chain hash

Procedure:
  1. QUARANTINE immediately
     - Flag record as MISMATCH
     - Block updates to this record
     - Preserve both versions
  2. ALERT
     - P1 incident (data integrity)
     - Notify security team
     - Log all details
  3. INVESTIGATE
     - Compare off-chain content versions
     - Check audit trail for modifications
     - Identify root cause
  4. RESOLVE (manual)
     - If off-chain tampered: Restore from backup
     - If on-chain wrong: Emit correction event
     - If canonicalization bug: Fix and re-hash
  5. POST-MORTEM
     - Document root cause
     - Implement prevention

CRITICAL: Never auto-resolve hash mismatches
```

#### 7.2.4 Missing Content Recovery

```
RECOVERY: MISSING CONTENT

Detection:
  - On-chain hash exists
  - Off-chain content not found
  - Not flagged as ORPHANED (not expected erasure)

Procedure:
  1. CHECK CRAB STATUS
     - Was this a valid erasure? If yes -> ORPHANED (expected)
  2. CHECK BACKUPS
     - Query backup storage
     - Query disaster recovery site
  3. CHECK REPLICAS
     - Query all off-chain replicas
     - May be replication delay
  4. If content found:
     - Restore to primary
     - Verify hash matches
     - Update status to VERIFIED
  5. If content not found:
     - Mark as MISSING
     - Alert for investigation
     - Check for data loss incident

Data State:
  - On-chain reference intact
  - Off-chain content unavailable
  - May indicate data loss or corruption
```

### 7.3 Failure Metrics

| Metric | Normal Range | Warning | Critical |
|--------|--------------|---------|----------|
| Off-chain write failure rate | < 0.1% | > 1% | > 5% |
| On-chain anchor failure rate | < 1% | > 5% | > 10% |
| Hash mismatch count | 0 | > 0 | N/A (always critical) |
| Missing content count | 0 | > 0 | N/A (always critical) |
| Average retry count | < 1 | > 2 | > 3 |
| Pending anchor queue depth | < 10 | > 50 | > 100 |

---

## 8. Reconciliation Protocol

### 8.1 Scheduled Reconciliation

```
DAILY RECONCILIATION JOB

Schedule: 02:00 UTC daily

Step 1: Query On-Chain Events
+----------------------------------------------------------------------+
| - Fetch all on-chain events since last reconciliation                 |
| - Filter by block range (last 24h + buffer for reorgs)                |
| - Extract: productDID, eventType, contentHash, blockNumber            |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 2: Verify Off-Chain Content
+----------------------------------------------------------------------+
| For each on-chain event:                                              |
|   1. Look up off-chain content by contentHash                         |
|   2. If found: Compute hash of off-chain content                      |
|   3. Compare hashes                                                   |
|   4. Record result: VERIFIED | MISMATCH | MISSING                     |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 3: Check for Orphaned Entries
+----------------------------------------------------------------------+
| - Query off-chain events not yet anchored (PENDING > 24h)             |
| - These should have been anchored by now                              |
| - Flag as STALE_PENDING for retry or investigation                    |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 4: Generate Report
+----------------------------------------------------------------------+
| Reconciliation Report:                                                |
|   - Total events checked: N                                           |
|   - VERIFIED: N (%)                                                   |
|   - MISMATCH: N (list details)                                        |
|   - MISSING: N (list details)                                         |
|   - ORPHANED: N (expected erasures)                                   |
|   - STALE_PENDING: N (needs investigation)                            |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 5: Take Action
+----------------------------------------------------------------------+
| - MISMATCH: Create P1 incident ticket                                 |
| - MISSING: Attempt recovery, create incident if fails                 |
| - STALE_PENDING: Re-queue for anchor retry                            |
| - Log all actions in audit trail                                      |
+----------------------------------------------------------------------+
```

### 8.2 On-Demand Reconciliation

```typescript
interface ReconciliationRequest {
  scope: 'product' | 'brand' | 'time_range' | 'full';
  productDID?: string;        // If scope = 'product'
  brandDID?: string;          // If scope = 'brand'
  startTime?: Date;           // If scope = 'time_range'
  endTime?: Date;             // If scope = 'time_range'
  force?: boolean;            // Ignore recent reconciliation
}

interface ReconciliationResult {
  requestId: string;
  scope: string;
  startedAt: Date;
  completedAt: Date;
  summary: {
    eventsChecked: number;
    verified: number;
    mismatch: number;
    missing: number;
    orphaned: number;
    stalePending: number;
  };
  discrepancies: Discrepancy[];
  actionsThaken: ReconciliationAction[];
}

interface Discrepancy {
  productDID: string;
  eventId: string;
  type: 'MISMATCH' | 'MISSING' | 'STALE_PENDING';
  offChainHash?: string;
  onChainHash?: string;
  detectedAt: Date;
  resolution?: string;
}
```

### 8.3 Reconciliation Audit Trail

All reconciliation activities are logged in the audit trail:

```typescript
interface ReconciliationAuditEntry {
  reconciliationId: string;
  timestamp: Date;
  type: 'scheduled' | 'on_demand';
  initiator: 'system' | string;  // User DID if on-demand
  scope: string;
  eventsChecked: number;
  discrepanciesFound: number;
  actionsToken: string[];
  duration: number;              // Milliseconds
}
```

---

## 9. CRAB Model Integration

### 9.1 CRAB Operations in Sync Context

| CRAB Operation | Sync Impact | Consistency State | Notes |
|----------------|-------------|-------------------|-------|
| **Create** | New off-chain + on-chain pair | PENDING -> VERIFIED | Standard flow |
| **Read** | Query off-chain, verify hash | Unchanged | Verification optional |
| **Append** | New event, new hash | New entry: VERIFIED | Immutable append |
| **Burn** | Delete off-chain, orphan hash | VERIFIED -> ORPHANED | Expected state |

### 9.2 Erasure Synchronization

When CRAB Burn (erasure) is executed:

```
ERASURE SYNCHRONIZATION

Step 1: Pre-Erasure Verification
+----------------------------------------------------------------------+
| - Verify erasure request is valid (GDPR, legal hold check)            |
| - Identify all off-chain content to erase                             |
| - Identify corresponding on-chain hashes                              |
| - Log erasure initiation in audit trail                               |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 2: Off-Chain Deletion
+----------------------------------------------------------------------+
| - Delete content from primary off-chain store                         |
| - Delete from all replicas                                            |
| - Clear from caches                                                   |
| - Destroy encryption keys (if CRAB encryption used)                   |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 3: Update Sync State
+----------------------------------------------------------------------+
| - Mark affected events as ORPHANED (not MISSING)                      |
| - Record erasure completion timestamp                                 |
| - Link erasure to original erasure request ID                         |
| - On-chain hashes remain (blockchain immutability)                    |
+----------------------------------------------------------------------+
                                    |
                                    v
Step 4: Audit Trail
+----------------------------------------------------------------------+
| - Log: eventIds erased                                                |
| - Log: encryption keys destroyed (if applicable)                      |
| - Log: erasure completion confirmation                                |
| - Do NOT log: actual deleted content                                  |
+----------------------------------------------------------------------+

Post-Erasure State:
- On-chain: Hashes remain, point to nothing
- Off-chain: Content deleted, keys destroyed
- Index: Events marked ORPHANED
- Reconciliation: Treats ORPHANED as expected
```

### 9.3 ORPHANED vs MISSING Distinction

```
                    ORPHANED vs MISSING

+------------------+---------------------------+---------------------------+
|                  |         ORPHANED          |          MISSING          |
+------------------+---------------------------+---------------------------+
| Cause            | Intentional erasure       | Unintentional loss        |
| Expected?        | Yes (CRAB Burn)           | No (incident)             |
| Erasure Request? | Linked to valid request   | No linked request         |
| Key Destroyed?   | Yes (if CRAB encryption)  | No                        |
| Recoverable?     | No (by design)            | Potentially (from backup) |
| Alert?           | No (normal operation)     | Yes (P1 incident)         |
| Audit Trail?     | Complete erasure log      | Investigation required    |
+------------------+---------------------------+---------------------------+

Detection Logic:

on_chain_hash_found AND off_chain_content_not_found:
  IF erasure_request_exists(on_chain_hash):
    state = ORPHANED  // Expected
  ELSE:
    state = MISSING   // Incident
```

---

## 10. Canonical JSON Specification

### 10.1 RFC 8785 JSON Canonicalization Scheme (JCS)

All content hashes MUST be computed from canonicalized JSON per RFC 8785:

```
CANONICALIZATION RULES

1. Key Ordering
   - Object keys sorted by Unicode code point
   - Sorting is recursive (nested objects also sorted)
   - Arrays maintain order (no array sorting)

2. Number Representation
   - No leading zeros (except for 0 itself)
   - No trailing zeros after decimal point
   - No + sign for positive numbers
   - No unnecessary decimal point (1.0 -> 1)
   - Scientific notation for very large/small numbers

3. String Representation
   - UTF-8 encoding
   - Minimal escaping (only required characters)
   - No unnecessary escapes

4. Whitespace
   - No whitespace between tokens
   - No trailing newline

5. Unicode
   - NFC normalization
   - UTF-8 encoding
```

### 10.2 Canonicalization Example

**Non-Canonical (Input):**
```json
{
  "timestamp": "2026-01-31T12:00:00.000Z",
  "eventType": "CREATED",
  "payload": {
    "name": "Birkin 25",
    "materials": ["leather", "gold"]
  },
  "productDID": "did:galileo:01:09506000134352:21:ABC123"
}
```

**Canonical (Output):**
```json
{"eventType":"CREATED","payload":{"materials":["leather","gold"],"name":"Birkin 25"},"productDID":"did:galileo:01:09506000134352:21:ABC123","timestamp":"2026-01-31T12:00:00.000Z"}
```

**Changes Made:**
- Keys sorted alphabetically (eventType, payload, productDID, timestamp)
- Nested keys sorted (materials, name)
- Whitespace removed
- Array order preserved

### 10.3 Implementation Reference

```typescript
import { canonicalize } from 'json-canonicalize';  // RFC 8785 implementation
import { createHash } from 'crypto';

function computeContentHash(event: LifecycleEvent): string {
  // Step 1: Extract hashable payload (exclude sync status)
  const hashableContent = {
    eventId: event.eventId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    productDID: event.productDID,
    actor: event.actor,
    payload: event.payload
  };

  // Step 2: Canonicalize per RFC 8785
  const canonicalJson = canonicalize(hashableContent);

  // Step 3: Compute SHA-256 hash
  const hash = createHash('sha256')
    .update(canonicalJson, 'utf8')
    .digest('hex');

  // Step 4: Format with 0x prefix
  return `0x${hash}`;
}
```

### 10.4 Hash Verification

```typescript
function verifyContentHash(
  content: LifecycleEvent,
  expectedHash: string
): boolean {
  const computedHash = computeContentHash(content);
  return computedHash.toLowerCase() === expectedHash.toLowerCase();
}
```

---

## 11. Performance Targets

### 11.1 Latency Targets

| Operation | Target (P50) | Target (P95) | Target (P99) | SLA |
|-----------|--------------|--------------|--------------|-----|
| Off-chain write | 50ms | 100ms | 200ms | < 500ms |
| On-chain anchor | 12s | 15s | 30s | Block time |
| Index update | 2s | 5s | 10s | < 60s |
| Full sync (write) | 15s | 20s | 45s | < 120s |
| Verification | 50ms | 100ms | 200ms | < 500ms |
| Read (cached) | 5ms | 20ms | 50ms | < 100ms |
| Read (uncached) | 50ms | 100ms | 200ms | < 500ms |

### 11.2 Throughput Targets

| Metric | Target | Burst | Notes |
|--------|--------|-------|-------|
| Writes per second | 100 | 500 | Per brand |
| Reads per second | 10,000 | 50,000 | Global |
| Verifications per second | 5,000 | 20,000 | Global |
| Reconciliation events/minute | 10,000 | 50,000 | Batch job |

### 11.3 Availability Targets

| Component | Availability | RPO | RTO |
|-----------|--------------|-----|-----|
| Off-chain write | 99.9% | 0 | 5 min |
| Off-chain read | 99.95% | N/A | 1 min |
| On-chain (depends on network) | 99.99% | 0 | N/A |
| Index service | 99.9% | 5 min | 10 min |
| Reconciliation | 99% | 24h | 4h |

---

## 12. Monitoring and Alerting

### 12.1 Key Metrics

| Metric | Type | Description | Alert Condition |
|--------|------|-------------|-----------------|
| `sync.write.latency` | Histogram | End-to-end write time | P95 > 45s |
| `sync.write.failure_rate` | Counter | Write failures / total | > 1% over 5 min |
| `sync.offchain.latency` | Histogram | Off-chain write time | P95 > 200ms |
| `sync.onchain.latency` | Histogram | On-chain anchor time | P95 > 30s |
| `sync.index.lag` | Gauge | Seconds behind on-chain | > 60s |
| `sync.pending.count` | Gauge | Events in PENDING state | > 100 |
| `sync.pending.age` | Gauge | Oldest PENDING event age | > 300s |
| `sync.mismatch.count` | Counter | Hash mismatches detected | > 0 |
| `sync.missing.count` | Counter | Missing content detected | > 0 |
| `sync.orphaned.count` | Counter | Expected orphans (erasure) | Informational |
| `sync.reconciliation.discrepancies` | Counter | Discrepancies found | > 0 |
| `sync.retry.queue.depth` | Gauge | Pending retries | > 50 |

### 12.2 Alert Definitions

| Alert | Severity | Condition | Action |
|-------|----------|-----------|--------|
| SyncWriteFailureHigh | P2 | write.failure_rate > 5% for 5m | Investigate off-chain store |
| SyncIndexerLag | P3 | index.lag > 60s for 5m | Check indexer health |
| SyncIndexerCritical | P2 | index.lag > 300s for 10m | Restart indexer, investigate |
| SyncHashMismatch | P1 | mismatch.count > 0 | Immediate investigation |
| SyncMissingContent | P1 | missing.count > 0 | Immediate investigation |
| SyncPendingBacklog | P3 | pending.count > 100 for 10m | Check on-chain anchor |
| SyncPendingStale | P2 | pending.age > 1h | Investigate stuck events |
| SyncRetryQueueHigh | P3 | retry.queue.depth > 100 | Review retry failures |

### 12.3 Dashboard Panels

**Overview Dashboard:**
- Write success rate (24h trend)
- Average write latency (real-time)
- Consistency state distribution (pie chart)
- Pending event count (real-time)
- Index lag (time series)

**Health Dashboard:**
- Component health status (traffic light)
- Error rate by component
- Retry queue depth
- Reconciliation results (last 7 days)
- Alert history

**Deep Dive Dashboard:**
- Latency percentiles by operation
- Failure breakdown by error type
- On-chain gas usage
- Off-chain storage metrics
- Event volume by type

### 12.4 Logging Requirements

```typescript
interface SyncLogEntry {
  // Correlation
  correlationId: string;      // Traces full sync operation
  eventId: string;            // Specific event being synced
  productDID: string;

  // Operation
  operation: 'write' | 'read' | 'verify' | 'reconcile';
  step: string;               // e.g., 'offchain_write', 'onchain_anchor'

  // Timing
  timestamp: Date;
  durationMs: number;

  // Outcome
  success: boolean;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };

  // Context
  contentHash?: string;
  transactionHash?: string;
  consistencyState?: ConsistencyState;
}
```

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Specification ID** | GSPEC-INFRA-004 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-01-31 |
| **Last Modified** | 2026-01-31 |
| **Authors** | Galileo Luxury Standard TSC |
| **Extends** | hybrid-architecture.md Section 5 |
| **Related** | GSPEC-INFRA-003 (Data Retention) |

---

*End of Hybrid Storage Synchronization Protocol Specification*
