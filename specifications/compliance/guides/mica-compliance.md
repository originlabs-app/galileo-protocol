# MiCA/CASP Compliance Implementation Guide

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-02-01
**Specification ID:** GGUIDE-COMPLIANCE-002

---

## Table of Contents

1. [Overview](#1-overview)
2. [Timeline and Key Deadlines](#2-timeline-and-key-deadlines)
3. [CASP Authorization Requirements](#3-casp-authorization-requirements)
4. [Travel Rule Implementation (TFR 2023/1113)](#4-travel-rule-implementation-tfr-20231113)
5. [Self-Hosted Wallet Verification](#5-self-hosted-wallet-verification)
6. [AML Integration](#6-aml-integration)
7. [Jurisdiction-Specific Timeline Matrix](#7-jurisdiction-specific-timeline-matrix)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Common Pitfalls](#9-common-pitfalls)
10. [Regulatory References](#10-regulatory-references)

---

## 1. Overview

### 1.1 Purpose

This guide maps the Galileo Luxury Standard specification to MiCA (Markets in Crypto-Assets) CASP authorization requirements, enabling adopters to achieve compliance with EU crypto-asset regulations.

### 1.2 Key Regulations

| Regulation | Citation | Scope |
|------------|----------|-------|
| **MiCA** | Regulation (EU) 2023/1114 | Crypto-asset framework |
| **TFR** | Regulation (EU) 2023/1113 | Transfer of Funds (Travel Rule) |
| **5AMLD/6AMLD** | Directive (EU) 2018/843, 2024/1640 | Anti-money laundering |
| **DORA** | Regulation (EU) 2022/2554 | Digital operational resilience |

### 1.3 Key Deadline

> **July 1, 2026:** EU-wide CASP authorization mandatory

After this date, operating as a Crypto-Asset Service Provider in the EU without MiCA authorization is prohibited. Penalties can reach up to **12.5% of annual turnover**.

### 1.4 Galileo Relevance

Galileo's token-based product ownership transfers may qualify as crypto-asset services under MiCA. Adopters facilitating token transfers MUST assess whether CASP authorization is required.

---

## 2. Timeline and Key Deadlines

### 2.1 MiCA Implementation Timeline

```
2023-06-29    MiCA published in Official Journal
     |
2024-06-30    Stablecoin provisions in force
     |
2024-12-30    Full MiCA application (all provisions)
     |
2024-12-30    TFR 2023/1113 in force (Travel Rule)
     |
2025-07-XX    Early adopter jurisdictions (Netherlands)
     |
2025-12-XX    Extended transition (Italy)
     |
2026-07-01    EU-wide CASP authorization mandatory
     |
2026-07-XX    ESMA Technical Standards finalized
     |
2027+         Full enforcement, no transitional provisions
```

### 2.2 Transitional Provisions

MiCA Article 143 allows Member States to grant transitional periods of up to 18 months for existing service providers. Key points:

- **Pre-existing registration:** CASPs registered under national regimes may continue operating during transition
- **No new registrations:** After July 1, 2026, no new national registrations; MiCA-only
- **Early authorization recommended:** Apply early regardless of transitional deadline

### 2.3 DORA Integration

The Digital Operational Resilience Act (DORA) requirements apply from **January 17, 2025**:

- ICT risk management framework
- ICT incident reporting
- Digital operational resilience testing
- Third-party risk management

**Recommendation:** CASPs must comply with both MiCA and DORA simultaneously.

---

## 3. CASP Authorization Requirements

### 3.1 CASP Services Under MiCA

MiCA defines ten categories of crypto-asset services. Galileo adopters should assess applicability:

| Service | MiCA Article | Galileo Relevance |
|---------|--------------|-------------------|
| Custody and administration | Art. 75 | Yes - Token custody |
| Operation of trading platform | Art. 76 | Potentially - Secondary market |
| Exchange for fiat | Art. 77 | Potentially - Primary sales |
| Exchange for crypto-assets | Art. 78 | Yes - Token transfers |
| Execution of orders | Art. 79 | Potentially |
| Placing of crypto-assets | Art. 80 | Yes - Token minting |
| Reception/transmission of orders | Art. 81 | Potentially |
| Advice | Art. 82 | No |
| Portfolio management | Art. 83 | No |
| Transfer services | Art. 84 | Yes - Ownership transfers |

### 3.2 Galileo Component Mapping

| MiCA Requirement | MiCA Article | Galileo Component | Implementation |
|------------------|--------------|-------------------|----------------|
| Customer identification | Art. 72 | IGalileoIdentityRegistry | ONCHAINID claims from trusted issuers |
| Travel Rule data | Art. 75-84, TFR | kyc-hooks.md Section 9 | KYC claims contain originator/beneficiary |
| AML screening | Art. 68 | aml-screening.md | Chainalysis Oracle + off-chain API |
| Transaction records | Art. 68 | audit-trail.md | 7-year retention with timestamps |
| Capital requirements | Art. 67 | N/A (business requirement) | EUR 50k-150k depending on service |
| Governance | Art. 68 | N/A (organizational) | EU presence + EU-resident director |

### 3.3 Capital Requirements

| Service Type | Minimum Capital | Notes |
|--------------|-----------------|-------|
| Custody | EUR 150,000 | Highest requirement |
| Exchange for fiat/crypto | EUR 150,000 | |
| Trading platform | EUR 150,000 | |
| Order execution | EUR 50,000 | |
| Placing | EUR 50,000 | |
| Advice | EUR 50,000 | |
| Transfer services | EUR 50,000 | |
| Other services | EUR 50,000 | Base requirement |

**Note:** Capital must be maintained permanently. Insurance may substitute up to 50%.

### 3.4 Governance Requirements

| Requirement | Specification |
|-------------|---------------|
| EU presence | Registered office in an EU Member State |
| EU director | At least one director resident in EU |
| Good repute | Management body members must have good repute |
| Knowledge/expertise | Adequate knowledge, skills, experience |
| Time commitment | Sufficient time for responsibilities |
| Policies | Written policies for all MiCA-required areas |
| Segregation | Segregation of client assets |

---

## 4. Travel Rule Implementation (TFR 2023/1113)

### 4.1 Overview

The Transfer of Funds Regulation (TFR) 2023/1113 implements FATF Recommendation 16 (Travel Rule) in the EU with **stricter requirements** than FATF.

**Critical:** There is **NO de minimis threshold** for CASP-to-CASP transfers in the EU.

| Transfer Type | Threshold | TFR Requirement |
|---------------|-----------|-----------------|
| CASP to CASP | **None** | Full originator + beneficiary data required |
| CASP to Unhosted Wallet | EUR 1,000 | Full originator data + wallet verification |
| Unhosted to CASP | EUR 1,000 | Full beneficiary data + wallet verification |

### 4.2 Required Data Fields

#### Originator Data (TFR Article 4)

| Field | Required | Source in Galileo |
|-------|----------|-------------------|
| Full name | Yes | KYC claim: `credentialSubject.name` |
| Account number (wallet address) | Yes | Sender wallet address |
| Address OR National ID OR Customer ID OR Date+Place of birth | One required | KYC claim: multiple fields |

#### Beneficiary Data (TFR Article 4)

| Field | Required | Source in Galileo |
|-------|----------|-------------------|
| Full name | Yes | KYC claim: `credentialSubject.name` |
| Account number (wallet address) | Yes | Receiver wallet address |

### 4.3 KYC Hook Integration

The Travel Rule data is retrieved from ONCHAINID claims via `IGalileoIdentityRegistry`:

**Reference:** `specifications/compliance/kyc-hooks.md` Section 9

```solidity
/**
 * @notice Get Travel Rule data from identity claims
 * @param _address The party address
 * @return originatorData Encoded originator/beneficiary data
 */
function getTravelRuleData(address _address)
    external view returns (bytes memory originatorData)
{
    IIdentity identity = identityRegistry.identity(_address);

    // Retrieve KYC claim data
    uint256 kycTopic = GalileoClaimTopics.KYC_BASIC;
    bytes memory claimData = identity.getClaimData(kycTopic);

    // Claim data contains hash and URI for off-chain retrieval
    // (vcHash, vcURI) = abi.decode(claimData, (bytes32, string))
    return claimData;
}
```

### 4.4 Code Example: Travel Rule Data Retrieval

```typescript
// travel-rule-data.ts
// Reference: kyc-hooks.md Section 9

interface TravelRuleData {
  originator: {
    name: string;
    accountNumber: string; // Wallet address
    address?: string;
    nationalId?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    customerId?: string;
  };
  beneficiary: {
    name: string;
    accountNumber: string;
  };
}

async function getTravelRuleDataFromClaims(
  senderAddress: string,
  receiverAddress: string
): Promise<TravelRuleData> {
  // Retrieve identity from registry
  const senderIdentity = await identityRegistry.identity(senderAddress);
  const receiverIdentity = await identityRegistry.identity(receiverAddress);

  // Get KYC claim data (stored off-chain, referenced by hash)
  const senderClaimHash = await senderIdentity.getClaimData(KYC_BASIC_TOPIC);
  const receiverClaimHash = await receiverIdentity.getClaimData(KYC_BASIC_TOPIC);

  // Retrieve full claim content from off-chain storage
  const senderClaim = await fetchClaimContent(senderClaimHash);
  const receiverClaim = await fetchClaimContent(receiverClaimHash);

  return {
    originator: {
      name: senderClaim.credentialSubject.name,
      accountNumber: senderAddress,
      address: senderClaim.credentialSubject.address,
      nationalId: senderClaim.credentialSubject.nationalId,
      dateOfBirth: senderClaim.credentialSubject.dateOfBirth,
      placeOfBirth: senderClaim.credentialSubject.placeOfBirth,
      customerId: senderClaim.credentialSubject.customerId
    },
    beneficiary: {
      name: receiverClaim.credentialSubject.name,
      accountNumber: receiverAddress
    }
  };
}

// Assemble Travel Rule message for counterparty
async function prepareTravelRuleMessage(
  from: string,
  to: string,
  amount: bigint,
  tokenId: string
): Promise<TravelRuleMessage> {
  const data = await getTravelRuleDataFromClaims(from, to);

  return {
    transactionId: generateTransactionId(),
    transferDate: new Date().toISOString(),
    transferAmount: amount.toString(),
    assetType: 'PRODUCT_TOKEN',
    assetIdentifier: tokenId,
    originator: data.originator,
    beneficiary: data.beneficiary,
    originatingVASP: GALILEO_VASP_ID,
    beneficiaryVASP: await resolveBeneficiaryVASP(to)
  };
}
```

### 4.5 Travel Rule Verification Flow

```
PRE-TRANSFER
|
+-> 1. Retrieve sender identity from registry
|       identity(senderAddress) -> IIdentity
|
+-> 2. Retrieve receiver identity from registry
|       identity(receiverAddress) -> IIdentity
|
+-> 3. Verify both have KYC claims with Travel Rule data
|       batchVerify(address, [KYC_BASIC]) -> true
|
+-> 4. If value >EUR 10,000: verify KYC_ENHANCED claims
|
+-> 5. Assemble TravelRuleData structure
|
+-> 6. Exchange data with counterparty CASP (TRISA/OpenVASP)
|
+-> 7. Execute transfer

POST-TRANSFER
|
+-> 8. Emit TravelRuleTransfer event with claim references
|
+-> 9. Store Travel Rule message in audit trail
|
+-> 10. Retain for 5 years per TFR requirements
```

### 4.6 High-Value Transfer Handling

For transfers exceeding EUR 10,000, additional requirements apply:

| Requirement | Implementation |
|-------------|----------------|
| Enhanced KYC | Verify `KYC_ENHANCED` claim topic |
| Source of funds | Verify `credentialSubject.sourceOfFunds` |
| Manual review flag | Flag transaction for compliance review |
| Travel Rule exchange | Ensure message exchange before execution |

```solidity
event HighValueTransfer(
    address indexed from,
    address indexed to,
    uint256 amount,
    bytes32 senderClaimHash,
    bytes32 receiverClaimHash,
    uint256 timestamp
);
```

---

## 5. Self-Hosted Wallet Verification

### 5.1 TFR Article 14 Requirements

For transfers >EUR 1,000 involving self-hosted (unhosted) wallets:

| Direction | CASP Obligation |
|-----------|-----------------|
| CASP -> Self-hosted | Verify customer controls the wallet |
| Self-hosted -> CASP | Verify originator controls the wallet |

### 5.2 Verification Methods

| Method | Description | Galileo Support |
|--------|-------------|-----------------|
| Signature verification | Customer signs message with wallet | IGalileoIdentityRegistry.verifyIdentity() |
| Micro-transaction | Small test transfer | Standard ERC-20 transfer |
| Hardware wallet proof | Device attestation | Custom implementation |

### 5.3 Implementation Pattern

```typescript
async function verifyWalletOwnership(
  walletAddress: string,
  customerIdentityId: string
): Promise<OwnershipProof> {
  // Generate challenge
  const challenge = generateChallenge();

  // Request signature from customer
  const signature = await requestCustomerSignature(walletAddress, challenge);

  // Verify signature matches wallet address
  const recoveredAddress = ethers.verifyMessage(challenge, signature);

  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Wallet ownership verification failed');
  }

  // Link wallet to customer identity
  await identityRegistry.linkWalletToIdentity(
    customerIdentityId,
    walletAddress,
    signature
  );

  return {
    walletAddress,
    verifiedAt: new Date(),
    method: 'SIGNATURE',
    challengeHash: keccak256(challenge)
  };
}
```

---

## 6. AML Integration

### 6.1 MiCA AML Requirements

MiCA Article 68 requires CASPs to comply with AML/CFT obligations under 5AMLD/6AMLD:

| Requirement | MiCA Reference | Galileo Implementation |
|-------------|----------------|------------------------|
| Customer due diligence | Art. 68(1) | KYC claims via ONCHAINID |
| Transaction monitoring | Art. 68(2) | On-chain events + off-chain analytics |
| Sanctions screening | Art. 68(3) | Chainalysis Oracle + TRM Labs |
| Suspicious activity reporting | Art. 68(4) | SAR workflow (off-chain) |
| Record keeping | Art. 68(5) | 5-year retention per data-retention.md |

### 6.2 Sanctions Screening Integration

**Reference:** `specifications/compliance/aml-screening.md`

```
Transfer Request
      |
      v
+---------------------+
| Layer 1: On-Chain   |
| Chainalysis Oracle  |
| (Real-time)         |
+---------------------+
      |
      +-> Sanctioned? YES -> BLOCK
      |
      +-> NO
           |
           v
+---------------------+
| Layer 2: Off-Chain  |
| TRM Labs / Elliptic |
| (If >EUR 10,000)    |
+---------------------+
      |
      +-> Risk Score > 70 -> BLOCK
      |
      +-> Risk Score 31-70 -> FLAG + ALLOW
      |
      +-> Risk Score 0-30 -> ALLOW
           |
           v
     Transfer Executed
```

### 6.3 Risk Scoring Thresholds

| Score Range | Risk Level | Action | Review Cadence |
|-------------|------------|--------|----------------|
| 0-30 | Low | Automatic approval | Annual |
| 31-50 | Medium-Low | Enhanced monitoring | Quarterly |
| 51-70 | Medium-High | Manual review required | Monthly |
| 71-85 | High | Senior review required | Before each tx |
| 86-100 | Critical | Block + escalate | Immediate |

---

## 7. Jurisdiction-Specific Timeline Matrix

### 7.1 EU Member State Deadlines

| Jurisdiction | Transitional Deadline | NCA | Status | Notes |
|--------------|----------------------|-----|--------|-------|
| **Netherlands** | July 2025 | AFM/DNB | Early adopter | Strictest interpretation |
| **Germany** | July 2026 | BaFin | Standard | MiCA-aligned |
| **France** | July 2026 | AMF | Standard | PSAN regime extended |
| **Italy** | December 2025 | CONSOB/Banca d'Italia | Extended transition | Local registration until Dec 2025 |
| **Spain** | July 2026 | CNMV | Standard | |
| **Ireland** | July 2026 | CBI | Standard | |
| **Luxembourg** | July 2026 | CSSF | Standard | |
| **Portugal** | July 2026 | CMVM/Banco de Portugal | Standard | |
| **Belgium** | July 2026 | FSMA | Standard | |
| **Austria** | July 2026 | FMA | Standard | |
| **Malta** | July 2026 | MFSA | Standard | VFA framework sunset |
| **Estonia** | July 2026 | FSA | Standard | Crypto-friendly |
| **Lithuania** | July 2026 | Bank of Lithuania | Standard | Crypto-friendly |

### 7.2 Recommendation

> **Apply for MiCA authorization early**, regardless of local transitional deadline.

Reasons:
1. NCA processing times may be long (6-12 months)
2. First-mover advantage in EU-wide passport
3. Regulatory uncertainty during transition
4. Client confidence in fully authorized status

### 7.3 NCA Contact Points

| Jurisdiction | NCA | MiCA Portal |
|--------------|-----|-------------|
| Netherlands | AFM | https://www.afm.nl/en/sector/registers/mica |
| Germany | BaFin | https://www.bafin.de/EN/Aufsicht/CryptoAssets |
| France | AMF | https://www.amf-france.org/en/professionals/crypto-assets |
| Italy | CONSOB | https://www.consob.it/web/consob-and-its-activities/mica |

---

## 8. Implementation Checklist

### 8.1 Identity and KYC

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 1 | Identity Registry deployed | MiCA Art. 72 | Deployment verification | IGalileoIdentityRegistry |
| 2 | Trusted KYC issuers configured | MiCA Art. 72 | Registry configuration | IClaimTopicsRegistry |
| 3 | KYC claims include Travel Rule fields | TFR Art. 4 | Claim schema validation | kyc-hooks.md S5.3 |
| 4 | KYC_BASIC claim topic active | MiCA Art. 72 | Topic registration | GalileoClaimTopics |
| 5 | KYC_ENHANCED claim topic active | MiCA Art. 72 | Topic registration | GalileoClaimTopics |

**Checklist:**
- [ ] 1. IGalileoIdentityRegistry deployed and configured
- [ ] 2. Claim Topics Registry populated with KYC/KYB topics
- [ ] 3. Trusted Issuers Registry configured with KYC providers
- [ ] 4. KYC claims contain Travel Rule required fields
- [ ] 5. Enhanced KYC for high-value threshold configured

### 8.2 Travel Rule

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 6 | No threshold for CASP-to-CASP | TFR Art. 4 | Transfer hook logic | compliance-module.md |
| 7 | EUR 1,000 threshold for self-hosted | TFR Art. 14 | Threshold configuration | kyc-hooks.md S4 |
| 8 | Travel Rule data exchange implemented | TFR Art. 5 | Integration test | TRISA/OpenVASP |
| 9 | Originator data retrievable | TFR Art. 4 | API test | kyc-hooks.md S9.3 |
| 10 | Beneficiary data retrievable | TFR Art. 4 | API test | kyc-hooks.md S9.3 |

**Checklist:**
- [ ] 6. All CASP transfers require Travel Rule data (no threshold)
- [ ] 7. Self-hosted wallet verification for >EUR 1,000
- [ ] 8. TRISA or OpenVASP integration operational
- [ ] 9. getTravelRuleData() function returns complete originator data
- [ ] 10. Beneficiary data included in all outgoing transfers

### 8.3 AML Screening

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 11 | On-chain sanctions oracle | MiCA Art. 68 | Oracle address configured | aml-screening.md S3 |
| 12 | Off-chain API integration | MiCA Art. 68 | API test | aml-screening.md S11 |
| 13 | Strict mode enabled | Best practice | Configuration check | aml-screening.md S10.2 |
| 14 | High-value threshold screening | MiCA Art. 68 | Threshold test | aml-screening.md S6 |
| 15 | Risk scoring implemented | MiCA Art. 68 | Score calculation test | aml-screening.md S7 |

**Checklist:**
- [ ] 11. Chainalysis Oracle address verified for deployment chain
- [ ] 12. TRM Labs or Elliptic API integrated and tested
- [ ] 13. Strict mode (fail-closed) enabled for sanctions checks
- [ ] 14. Off-chain screening for transfers >EUR 10,000
- [ ] 15. Risk scoring thresholds calibrated

### 8.4 Record Keeping

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 16 | Transaction records 5+ years | TFR Art. 7 | Retention policy | data-retention.md S3.1 |
| 17 | KYC records 5+ years | 5AMLD Art. 40 | Retention policy | data-retention.md S3.2.1 |
| 18 | Travel Rule messages retained | TFR Art. 7 | Audit trail check | audit-trail.md |
| 19 | Sanctions check logs | MiCA Art. 68 | Audit events | aml-screening.md S8 |
| 20 | Audit trail tamper-evident | MiCA Art. 68 | Merkle anchoring | audit-trail.md |

**Checklist:**
- [ ] 16. Transaction records retained for minimum 5 years
- [ ] 17. KYC/AML records retained for 5 years from end of relationship
- [ ] 18. Travel Rule messages stored with transaction reference
- [ ] 19. All sanctions checks logged with timestamp and result
- [ ] 20. Daily Merkle root anchoring for audit integrity

### 8.5 Organizational

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 21 | CASP authorization application | MiCA Art. 63 | NCA submission | - |
| 22 | Capital requirements met | MiCA Art. 67 | Bank statement | - |
| 23 | EU director appointed | MiCA Art. 68 | Corporate records | - |
| 24 | DORA compliance | DORA | ICT assessment | - |
| 25 | Jurisdiction rules configured | MiCA | Module configuration | jurisdiction-rules.md |

**Checklist:**
- [ ] 21. MiCA authorization application submitted to NCA
- [ ] 22. Minimum capital (EUR 50k-150k) maintained
- [ ] 23. EU-resident director in management body
- [ ] 24. DORA ICT risk management framework implemented
- [ ] 25. Jurisdiction compliance modules configured per jurisdiction-rules.md

---

## 9. Common Pitfalls

### 9.1 Pitfall 1: Missing Travel Rule Threshold Nuances

**What goes wrong:** Applying EUR 1,000 threshold incorrectly for EU CASP-to-CASP transfers

**Why it happens:** Confusion with FATF Recommendation 16 threshold vs TFR 2023/1113

**How to avoid:**
- TFR 2023/1113 has **NO de minimis threshold** for CASP-to-CASP transfers
- EUR 1,000 threshold applies ONLY to self-hosted wallet verification
- Document clearly: "All crypto transfers between CASPs require full Travel Rule data"

**Warning signs:** Documentation suggesting small CASP-to-CASP transfers are exempt

### 9.2 Pitfall 2: Misunderstanding MiCA Authorization Deadline Variations

**What goes wrong:** Assuming July 2026 deadline is uniform across EU

**Why it happens:** MiCA allows Member State transitional arrangements

**How to avoid:**
- Document jurisdiction-specific deadlines (see Section 7)
- Netherlands: July 2025 (early adopter)
- Italy: December 2025 (extended transition)
- Standard: July 2026
- Recommend early authorization regardless of local deadline

**Warning signs:** Single deadline cited without jurisdiction context

### 9.3 Pitfall 3: Incomplete Originator/Beneficiary Data

**What goes wrong:** KYC claims missing Travel Rule required fields

**Why it happens:** KYC designed for identity verification, not Travel Rule

**How to avoid:**
- Ensure KYC claim schema includes ALL TFR Article 4 fields
- Validate claims against Travel Rule requirements before acceptance
- Reference kyc-hooks.md Section 5.3 for required claim data

**Warning signs:** KYC claims with only name and no address/ID/DOB

### 9.4 Pitfall 4: Sanctions Screening Gaps

**What goes wrong:** Relying solely on on-chain oracle with 60+ day latency

**Why it happens:** Not understanding oracle update delays

**How to avoid:**
- Layer on-chain oracle with off-chain API (TRM Labs, Elliptic)
- Implement daily batch scanning of all token holders
- Maintain supplementary blocklist for new OFAC designations

**Warning signs:** Only Chainalysis Oracle configured; no off-chain API

### 9.5 Pitfall 5: Ignoring Self-Hosted Wallet Requirements

**What goes wrong:** Not verifying customer controls self-hosted wallet

**Why it happens:** Focus on CASP-to-CASP, forgetting self-custody

**How to avoid:**
- Implement wallet ownership verification for >EUR 1,000 to/from self-hosted
- Signature verification is simplest method
- Link verified wallets to customer identity

**Warning signs:** No self-hosted wallet verification flow implemented

---

## 10. Regulatory References

### 10.1 Primary Regulations

| Regulation | Citation | Key Articles |
|------------|----------|--------------|
| **MiCA** | [Regulation (EU) 2023/1114](https://eur-lex.europa.eu/eli/reg/2023/1114/oj) | Art. 63-84 (CASP), Art. 143 (Transition) |
| **TFR** | [Regulation (EU) 2023/1113](https://eur-lex.europa.eu/eli/reg/2023/1113/oj) | Art. 4 (Data), Art. 14 (Self-hosted) |
| **5AMLD** | [Directive (EU) 2018/843](https://eur-lex.europa.eu/eli/dir/2018/843/oj) | Art. 40 (Retention) |
| **DORA** | [Regulation (EU) 2022/2554](https://eur-lex.europa.eu/eli/reg/2022/2554/oj) | Full (ICT resilience) |

### 10.2 Galileo Specifications

| Specification | Path | Relevant Sections |
|---------------|------|-------------------|
| KYC Hooks | `specifications/compliance/kyc-hooks.md` | S5 (KYC Levels), S9 (Travel Rule) |
| AML Screening | `specifications/compliance/aml-screening.md` | S3 (Oracle), S6 (High-Value), S11 (Providers) |
| Data Retention | `specifications/infrastructure/data-retention.md` | S3 (Classification), S4 (Conflict Resolution) |
| Jurisdiction Rules | `specifications/contracts/compliance/jurisdiction-rules.md` | Full |

### 10.3 External Resources

- [ESMA MiCA Technical Standards](https://www.esma.europa.eu/policy-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)
- [EBA AML Guidelines](https://www.eba.europa.eu/regulation-and-policy/anti-money-laundering-and-countering-financing-terrorism)
- [21 Analytics Travel Rule Guide](https://www.21analytics.co/travel-rule-regulations/european-union-eu-travel-rule-regulation/)
- [TRISA Protocol](https://trisa.io/)
- [OpenVASP Protocol](https://openvasp.org/)

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Guide ID** | GGUIDE-COMPLIANCE-002 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-02-01 |
| **Last Modified** | 2026-02-01 |
| **Authors** | Galileo Luxury Standard TSC |
| **Target Audience** | Implementers, Compliance Officers, Legal Teams |
| **Compliance** | MiCA 2023/1114, TFR 2023/1113, 5AMLD |

---

*End of MiCA/CASP Compliance Implementation Guide*
