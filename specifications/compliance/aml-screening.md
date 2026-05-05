# AML/Sanctions Screening Specification

**Specification ID:** GSPEC-COMPLIANCE-003
**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-31

---

## 1. Overview

### 1.1 Purpose

This specification defines the Anti-Money Laundering (AML) and sanctions screening mechanisms for the Galileo token ecosystem. It ensures that token transfers comply with international sanctions requirements and AML regulations by screening all parties against relevant watchlists.

### 1.2 Regulatory Drivers

| Regulation | Jurisdiction | Requirement | Impact |
|------------|--------------|-------------|--------|
| **OFAC** | United States | Block transactions with sanctioned entities | Primary sanctions list |
| **EU Sanctions** | European Union | Comply with EU restrictive measures | EU consolidated list |
| **MiCA** | European Union | AML/CFT obligations for CASPs | Transfer screening |
| **5AMLD/6AMLD** | European Union | Enhanced customer due diligence | Risk-based approach |
| **BSA/AML** | United States | Bank Secrecy Act compliance | Suspicious activity reporting |
| **FATF Recommendations** | Global | Risk-based AML framework | Industry standards |

### 1.3 On-Chain vs Off-Chain Screening

The Galileo ecosystem employs a **layered screening approach**:

```
                 Pre-Transfer Screening
                          |
          +---------------+---------------+
          |                               |
          v                               v
   +-------------+                 +-------------+
   | On-Chain    |                 | Off-Chain   |
   | Layer       |                 | Layer       |
   +-------------+                 +-------------+
   |             |                 |             |
   | Chainalysis |                 | TRM Labs    |
   | Oracle      |                 | Elliptic    |
   | (Real-time) |                 | (Minutes)   |
   |             |                 |             |
   +------+------+                 +------+------+
          |                               |
          +---------------+---------------+
                          |
                          v
                  Aggregate Decision
                          |
                 +--------+--------+
                 |                 |
                 v                 v
              ALLOW             BLOCK
```

---

## 2. Sanctions Screening Architecture

### 2.1 Multi-Layer Strategy

```
                    Transfer Request
                          |
                          v
              +----------------------+
              | Layer 1: On-Chain    |
              | Chainalysis Oracle   |
              | (Blocking)           |
              +----------------------+
                          |
                   Sanctioned?
                    /        \
                  YES         NO
                   |           |
                   v           v
              +-------+  +----------------------+
              | BLOCK |  | Layer 2: Off-Chain   |
              +-------+  | TRM Labs / Elliptic  |
                         | (Blocking for >10K)  |
                         +----------------------+
                                   |
                            Sanctioned?
                             /        \
                           YES         NO
                            |           |
                            v           v
                       +-------+  +----------------------+
                       | BLOCK |  | Layer 3: Daily Batch |
                       +-------+  | Existing Holders     |
                                  | (Monitoring)         |
                                  +----------------------+
                                            |
                                            v
                                    Transfer Allowed
```

### 2.2 Layer Responsibilities

| Layer | Provider | Check Type | Latency | When Applied |
|-------|----------|------------|---------|--------------|
| **1. On-Chain Oracle** | Chainalysis | Address-based | Real-time | Every transfer |
| **2. Off-Chain API** | TRM Labs / Elliptic | Risk scoring | 1-5 minutes | Pre-transfer (>EUR 10,000) |
| **3. Daily Batch** | Multiple | Portfolio scan | 24 hours | All token holders |

---

## 3. Chainalysis Oracle Integration

### 3.1 Oracle Contract

**Address:** `0x40C57923924B5c5c5455c48D93317139ADDaC8fb`

The Chainalysis Sanctions Oracle is deployed at the same address on most EVM-compatible chains:

| Chain | Address | Status |
|-------|---------|--------|
| Ethereum Mainnet | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` | Active |
| Polygon | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` | Active |
| Arbitrum | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` | Active |
| Optimism | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` | Active |
| Base | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` | Active |
| BNB Chain | `0x40C57923924B5c5c5455c48D93317139ADDaC8fb` | Active |

### 3.2 Interface

```solidity
/**
 * @title SanctionsList
 * @notice Interface for the Chainalysis sanctions oracle
 * @dev Deployed at 0x40C57923924B5c5c5455c48D93317139ADDaC8fb on most EVM chains
 */
interface SanctionsList {
    /**
     * @notice Check if an address is on the OFAC sanctions list
     * @param addr The address to check
     * @return True if the address is sanctioned, false otherwise
     */
    function isSanctioned(address addr) external view returns (bool);
}
```

### 3.3 Usage Pattern

```solidity
// Reference the oracle at known address
SanctionsList constant SANCTIONS_ORACLE =
    SanctionsList(0x40C57923924B5c5c5455c48D93317139ADDaC8fb);

// Check before transfer
function _checkSanctions(address _from, address _to) internal view {
    if (SANCTIONS_ORACLE.isSanctioned(_from)) {
        revert SenderSanctioned(_from);
    }
    if (SANCTIONS_ORACLE.isSanctioned(_to)) {
        revert ReceiverSanctioned(_to);
    }
}
```

### 3.4 Update Latency Considerations

**Critical Warning:** The Chainalysis oracle may have an update latency of **60+ days** behind OFAC announcements. This occurs because:

1. OFAC publishes new designations
2. Chainalysis identifies associated blockchain addresses
3. Oracle update transaction submitted and confirmed
4. Cache propagation across networks

**Mitigation Strategies:**

| Strategy | Implementation |
|----------|----------------|
| Layer with off-chain API | Use TRM Labs for real-time list |
| Daily batch scanning | Re-check all holders nightly |
| Manual blocklist | Maintain supplementary on-chain list |
| Grace period | Allow pause + review for new sanctions |

---

## 4. Screening Triggers

### 4.1 When to Screen

| Trigger | Layer 1 (On-chain) | Layer 2 (Off-chain) | Layer 3 (Batch) |
|---------|-------------------|---------------------|-----------------|
| **Token Transfer** | Always | If >EUR 10,000 | N/A |
| **Token Mint** | Receiver only | If high-value | N/A |
| **Token Burn** | Sender only | No | N/A |
| **Wallet Connection** | No | Optional | N/A |
| **Identity Registration** | No | Recommended | N/A |
| **Daily Monitoring** | N/A | N/A | All holders |
| **OFAC Update** | N/A | N/A | Triggered scan |

### 4.2 Threshold-Based Screening

```
Transaction Value          Screening Required
-------------------       --------------------
< EUR 1,000               Layer 1 only
EUR 1,000 - 10,000        Layer 1 + Layer 2 (async)
EUR 10,000 - 50,000       Layer 1 + Layer 2 (blocking)
> EUR 50,000              Layer 1 + Layer 2 + Manual review
```

---

## 5. Blocking vs Flagging Mechanisms

### 5.1 Decision Matrix

| Scenario | Action | Rationale |
|----------|--------|-----------|
| OFAC SDN list match | **BLOCK** | Legal requirement |
| EU consolidated list match | **BLOCK** | Legal requirement |
| High-risk country | **FLAG** | Enhanced monitoring |
| PEP (Politically Exposed Person) | **FLAG** | Enhanced due diligence |
| Previously sanctioned (removed) | **FLAG** | Elevated risk |
| Transaction pattern anomaly | **FLAG** | Suspicious activity |

### 5.2 Blocking Implementation

```solidity
// On-chain blocking via compliance module
function moduleCheck(
    address _from,
    address _to,
    uint256 _value,
    address _compliance
) external view returns (bool) {
    // Direct block if either party sanctioned
    if (isSanctioned(_from) || isSanctioned(_to)) {
        return false;
    }
    return true;
}
```

### 5.3 Flagging Implementation

Flagging is an off-chain process that marks transactions for review without blocking:

```typescript
// Off-chain flagging service
interface FlaggedTransaction {
  txHash: string;
  from: address;
  to: address;
  value: bigint;
  flagReason: FlagReason;
  riskScore: number;
  timestamp: Date;
  reviewStatus: 'pending' | 'reviewed' | 'cleared' | 'escalated';
}

enum FlagReason {
  HIGH_RISK_COUNTRY = 'high_risk_country',
  PEP_INVOLVED = 'pep_involved',
  PATTERN_ANOMALY = 'pattern_anomaly',
  VALUE_THRESHOLD = 'value_threshold',
  PREVIOUS_SANCTIONS = 'previous_sanctions'
}
```

### 5.4 Address Freezing

When sanctions are detected post-transfer, use token freeze capability:

```solidity
// Freeze sanctioned address via token agent
function freezeSanctionedAddress(address _sanctioned) external onlyAgent {
    require(isSanctioned(_sanctioned), "Address not sanctioned");
    token.setAddressFrozen(_sanctioned, true);
    emit SanctionedAddressFrozen(_sanctioned, block.timestamp);
}
```

---

## 6. High-Value Transfer Protocol

### 6.1 Threshold Definition

| Currency | Threshold | Rationale |
|----------|-----------|-----------|
| EUR | 10,000 | EU 4AMLD threshold |
| USD | 10,000 | FinCEN CTR threshold |
| GBP | 8,000 | ~EUR 10,000 equivalent |

### 6.2 Enhanced Screening Process

For transfers exceeding EUR 10,000:

```
1. On-chain Chainalysis Check (Blocking)
   |
   +-> Sanctioned? YES -> BLOCK, emit event
   |
   +-> NO, continue
         |
         v
2. Off-chain TRM Labs Check (Blocking)
   |
   +-> Request risk assessment via API
   +-> Wait for response (1-5 min)
   +-> Risk score > 70? -> BLOCK, flag for review
   |
   +-> Risk score 31-70? -> FLAG, allow with monitoring
   |
   +-> Risk score 0-30? -> ALLOW
         |
         v
3. Enhanced Due Diligence Flag
   |
   +-> First transaction with counterparty? -> Flag for EDD
   +-> Pattern deviation? -> Flag for review
   |
   +-> All clear? -> ALLOW transfer
         |
         v
4. Post-Transfer Monitoring
   |
   +-> Add to 30-day watch list
   +-> Include in daily batch review
```

### 6.3 Off-Chain API Integration

```typescript
// TRM Labs integration example
interface TRMScreeningRequest {
  address: string;
  chain: 'ethereum' | 'polygon' | 'arbitrum';
  accountExternalId?: string;
}

interface TRMScreeningResponse {
  address: string;
  riskScore: number; // 0-100
  riskCategories: string[];
  sanctionsMatch: boolean;
  pep: boolean;
  adverseMedia: boolean;
  clusterRisk: number;
}

async function screenAddress(address: string): Promise<TRMScreeningResponse> {
  const response = await fetch('https://api.trmlabs.com/v2/screening', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TRM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      address,
      chain: 'ethereum'
    })
  });
  return response.json();
}
```

---

## 7. AML Risk Scoring

### 7.1 Risk Score Thresholds

| Score Range | Risk Level | Action | Review Cadence |
|-------------|------------|--------|----------------|
| **0-30** | Low | Automatic approval | Annual |
| **31-50** | Medium-Low | Enhanced monitoring | Quarterly |
| **51-70** | Medium-High | Manual review required | Monthly |
| **71-85** | High | Senior review required | Before each tx |
| **86-100** | Critical | Block + escalate | Immediate |

### 7.2 Risk Factor Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| **Sanctions List Match** | +100 | Immediate block |
| **High-Risk Jurisdiction** | +30 | FATF grey/black list |
| **PEP Association** | +25 | Politically exposed person |
| **Mixing Service Usage** | +40 | Tornado Cash, etc. |
| **Darknet Market Link** | +50 | Historical association |
| **Fraud Association** | +35 | Known scam addresses |
| **Age of Wallet** | -5 to +10 | New wallets higher risk |
| **Transaction Volume** | -5 to +15 | Abnormal patterns |

### 7.3 Aggregate Risk Calculation

```typescript
interface RiskAssessment {
  baseScore: number;
  factors: RiskFactor[];
  aggregateScore: number;
  recommendation: 'allow' | 'review' | 'block';
}

function calculateRisk(factors: RiskFactor[]): RiskAssessment {
  let baseScore = 0;

  for (const factor of factors) {
    baseScore += factor.weight;
  }

  // Cap at 100
  const aggregateScore = Math.min(100, Math.max(0, baseScore));

  let recommendation: 'allow' | 'review' | 'block';
  if (aggregateScore <= 30) recommendation = 'allow';
  else if (aggregateScore <= 70) recommendation = 'review';
  else recommendation = 'block';

  return { baseScore, factors, aggregateScore, recommendation };
}
```

---

## 8. Audit Trail Requirements

### 8.1 Required Events

Every sanctions check MUST emit an event for compliance audit:

```solidity
/**
 * @notice Emitted when sanctions check is performed
 */
event SanctionsCheckPerformed(
    address indexed subject,
    bool isSanctioned,
    string provider,
    uint256 timestamp
);

/**
 * @notice Emitted when a sanctioned address is detected
 */
event SanctionedAddressDetected(
    address indexed subject,
    string sanctionsList,
    uint256 timestamp
);

/**
 * @notice Emitted when a transfer is blocked due to sanctions
 */
event SanctionedTransferBlocked(
    address indexed from,
    address indexed to,
    uint256 amount,
    bool fromSanctioned,
    bool toSanctioned,
    uint256 timestamp
);

/**
 * @notice Emitted when a high-value transfer is screened
 */
event HighValueTransferScreened(
    address indexed from,
    address indexed to,
    uint256 amount,
    uint8 riskScore,
    string provider,
    uint256 timestamp
);

/**
 * @notice Emitted when an address is frozen due to sanctions
 */
event SanctionedAddressFrozen(
    address indexed frozenAddress,
    uint256 timestamp
);
```

### 8.2 Off-Chain Audit Log

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: 'screening' | 'block' | 'flag' | 'freeze' | 'review';
  subject: address;
  counterparty?: address;
  amount?: bigint;
  provider: 'chainalysis' | 'trm_labs' | 'elliptic' | 'internal';
  result: 'clear' | 'flagged' | 'blocked' | 'review';
  riskScore?: number;
  sanctionsList?: string;
  reviewedBy?: string;
  notes?: string;
}
```

### 8.3 Retention Requirements

| Data Type | Retention Period | Rationale |
|-----------|------------------|-----------|
| Screening results | 7 years | EU AML requirements |
| Blocked transactions | 10 years | Litigation support |
| Risk assessments | 5 years | Regulatory review |
| Reviewer notes | 7 years | Audit trail |

---

## 9. Integration with Compliance Module

### 9.1 ISanctionsModule in IModularCompliance

The `ISanctionsModule` integrates with the modular compliance system:

```solidity
// ISanctionsModule.moduleCheck() implementation pattern
function moduleCheck(
    address _from,
    address _to,
    uint256 _value,
    address _compliance
) external view returns (bool) {
    // Query Chainalysis oracle
    bool fromSanctioned = sanctionsOracle.isSanctioned(_from);
    bool toSanctioned = sanctionsOracle.isSanctioned(_to);

    if (fromSanctioned || toSanctioned) {
        // Note: Cannot emit events in view function
        // Event emission handled in moduleTransferAction
        return false;
    }

    return true;
}

// Post-transfer hook for event emission
function moduleTransferAction(
    address _from,
    address _to,
    uint256 _value,
    address _compliance
) external override onlyBoundCompliance(_compliance) {
    // Log successful transfer after sanctions check
    emit SanctionsCheckPerformed(_from, false, "chainalysis", block.timestamp);
    emit SanctionsCheckPerformed(_to, false, "chainalysis", block.timestamp);
}
```

### 9.2 Module Configuration

```solidity
// Configure sanctions module
ISanctionsModule sanctionsModule = ISanctionsModule(moduleAddress);

// Set oracle (if different from default)
sanctionsModule.setSanctionsOracle(customOracleAddress);

// Set strict mode (fail-closed vs fail-open)
sanctionsModule.setStrictMode(true); // Revert on oracle failure

// Set high-value threshold
sanctionsModule.setHighValueThreshold(10000 * 10**18); // 10,000 tokens
```

---

## 10. Limitations and Mitigations

### 10.1 Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Oracle update latency** | 60+ days behind OFAC | Layer with off-chain API |
| **Address-only checks** | No transaction pattern analysis | Off-chain risk scoring |
| **No risk scoring on-chain** | Binary pass/fail only | Off-chain TRM/Elliptic integration |
| **Single oracle dependency** | Single point of failure | Support multiple oracle sources |
| **EVM-only coverage** | Non-EVM chains excluded | Chain-specific implementations |
| **Gas cost per check** | ~26,000 gas per isSanctioned() | Batch checks where possible |

### 10.2 Oracle Failure Handling

```solidity
// Strict mode: fail-closed (production recommended)
function isSanctionedStrict(address _addr) internal view returns (bool) {
    try sanctionsOracle.isSanctioned(_addr) returns (bool result) {
        return result;
    } catch {
        revert OracleCallFailed();
    }
}

// Non-strict mode: fail-open (not recommended for production)
function isSanctionedLenient(address _addr) internal view returns (bool) {
    try sanctionsOracle.isSanctioned(_addr) returns (bool result) {
        return result;
    } catch {
        emit OracleCallFailed(_addr, block.timestamp);
        return false; // Allow transfer on oracle failure
    }
}
```

### 10.3 Multi-Oracle Strategy

```solidity
// Support multiple oracle sources
address[] public sanctionsOracles;

function isSanctionedMulti(address _addr) internal view returns (bool) {
    for (uint256 i = 0; i < sanctionsOracles.length; i++) {
        try SanctionsList(sanctionsOracles[i]).isSanctioned(_addr) returns (bool result) {
            if (result) return true; // Any oracle says sanctioned = sanctioned
        } catch {
            continue; // Try next oracle
        }
    }
    return false;
}
```

---

## 11. Off-Chain Provider Integration

### 11.1 Supported Providers

| Provider | Type | Coverage | Integration |
|----------|------|----------|-------------|
| **Chainalysis** | On-chain Oracle | OFAC SDN | Direct contract call |
| **TRM Labs** | REST API | Global sanctions, risk | HTTPS API |
| **Elliptic** | REST API | Global, DeFi risk | HTTPS API |
| **CipherTrace** | REST API | Global, compliance | HTTPS API |

### 11.2 TRM Labs Integration

```typescript
// TRM Labs API integration
const TRM_BASE_URL = 'https://api.trmlabs.com/v2';

interface TRMConfig {
  apiKey: string;
  environment: 'production' | 'sandbox';
}

class TRMLabsClient {
  constructor(private config: TRMConfig) {}

  async screenAddress(address: string, chain: string): Promise<ScreeningResult> {
    const response = await fetch(`${TRM_BASE_URL}/public/sanctions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        address,
        chain
      }])
    });

    return response.json();
  }

  async getEntityRisk(address: string): Promise<RiskAssessment> {
    const response = await fetch(`${TRM_BASE_URL}/public/entities/${address}/risk`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    return response.json();
  }
}
```

### 11.3 Elliptic Integration

```typescript
// Elliptic API integration
const ELLIPTIC_BASE_URL = 'https://api.elliptic.co/v2';

class EllipticClient {
  constructor(private apiKey: string) {}

  async walletScreening(address: string): Promise<WalletRisk> {
    const response = await fetch(`${ELLIPTIC_BASE_URL}/wallet/synchronous`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: { asset: 'holistic', blockchain: 'ethereum', hash: address },
        type: 'wallet_exposure'
      })
    });

    return response.json();
  }
}
```

---

## 12. Compliance Reporting

### 12.1 Periodic Reports

| Report | Frequency | Contents | Recipients |
|--------|-----------|----------|------------|
| **Screening Summary** | Daily | Checks performed, blocks, flags | Compliance team |
| **Risk Exposure** | Weekly | High-risk holders, concentration | Risk committee |
| **Sanctions Updates** | As needed | New designations, removals | All stakeholders |
| **Regulatory Report** | Monthly | SAR candidates, statistics | Regulators |

### 12.2 SAR (Suspicious Activity Report) Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Blocked transaction | Any | Auto-flag for SAR review |
| Risk score > 70 | Single tx | Manual SAR review |
| Cumulative risk | 3+ medium flags in 30 days | Escalate to SAR |
| Pattern deviation | Statistical anomaly | Flag for investigation |

---

## 13. Implementation Checklist

### 13.1 Pre-Deployment

- [ ] Chainalysis oracle address verified for target chain
- [ ] ISanctionsModule deployed and configured
- [ ] Strict mode enabled for production
- [ ] High-value threshold set appropriately
- [ ] Off-chain API keys configured (TRM/Elliptic)
- [ ] Audit log infrastructure ready
- [ ] Alert system configured for blocks

### 13.2 Operational

- [ ] Daily batch scan scheduled
- [ ] OFAC update monitoring active
- [ ] Risk scoring thresholds calibrated
- [ ] Review workflow documented
- [ ] Escalation procedures defined
- [ ] Retention policies implemented

---

## 14. Appendix: Sanctions Lists Reference

### 14.1 Primary Lists

| List | Issuing Authority | Coverage |
|------|-------------------|----------|
| **SDN List** | OFAC (US Treasury) | Specially Designated Nationals |
| **EU Consolidated List** | European Commission | EU restrictive measures |
| **UN Security Council** | United Nations | Global sanctions |
| **OFSI** | UK HM Treasury | UK financial sanctions |

### 14.2 OFAC SDN Categories

- **SDGT**: Specially Designated Global Terrorists
- **CYBER2**: Malicious cyber actors
- **DPRK**: North Korea sanctions
- **IRAN**: Iran sanctions
- **RUSSIA**: Russia/Ukraine sanctions
- **VENEZUELA**: Venezuela sanctions

---

## References

- **Chainalysis Oracle**: https://go.chainalysis.com/chainalysis-oracle-docs.html
- **TRM Labs API**: https://docs.trmlabs.com/
- **OFAC SDN List**: https://sanctionssearch.ofac.treas.gov/
- **EU Consolidated List**: https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions
- **ISanctionsModule Interface**: `specifications/contracts/compliance/modules/ISanctionsModule.sol`

---

*Specification: GSPEC-COMPLIANCE-003*
*Phase: 05-token-compliance*
