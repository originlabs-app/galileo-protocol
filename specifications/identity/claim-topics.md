# Galileo Claim Topics Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-IDENTITY-004

---

## Table of Contents

1. [Overview](#1-overview)
2. [Initial Claim Topics](#2-initial-claim-topics)
3. [Jurisdiction-Specific KYC Topics](#3-jurisdiction-specific-kyc-topics)
4. [Luxury-Specific Topics](#4-luxury-specific-topics)
5. [Heritage Topics](#5-heritage-topics)
6. [Topic Lifecycle](#6-topic-lifecycle)
7. [Extension Process](#7-extension-process)

---

## 1. Overview

### 1.1 Purpose

Claim topics are the foundation of the Galileo identity verification system. They define the types of claims that can be issued about entities (brands, retailers, individuals) and products within the ecosystem.

This specification defines:
- **Namespace format** for human-readable topic identification
- **Topic ID computation** using keccak256 hashing
- **Initial 12 claim topics** covering compliance, luxury, and heritage domains
- **Topic lifecycle** from registration to deprecation

### 1.2 Namespace Format

Claim topic namespaces follow a hierarchical dot-notation format:

```
namespace = root "." category "." subcategory ["." modifier]

root       = "galileo"
category   = "kyc" | "kyb" | "luxury" | "heritage" | ...
subcategory = 1*(ALPHA | "_")
modifier   = 1*(ALPHA | "_")
```

**Examples:**

| Namespace | Description |
|-----------|-------------|
| `galileo.kyc.basic` | Basic KYC verification |
| `galileo.kyc.eu.mifid` | EU MiFID-compliant KYC |
| `galileoprotocol.io.authorized_retailer` | Authorized retailer certification |
| `galileo.heritage.origin_certified` | Origin certification |

### 1.3 Topic ID Computation

Topic IDs are computed as the keccak256 hash of the namespace string:

```solidity
uint256 topicId = uint256(keccak256(bytes(namespace)));
```

**Why keccak256:**

| Property | Benefit |
|----------|---------|
| Deterministic | Same namespace always produces same ID |
| Collision-resistant | 256-bit security against collisions |
| On-chain efficient | Native EVM opcode |
| Reversible lookup | Off-chain mapping from ID to namespace |

### 1.4 Topic Classification

Topics are classified into two categories based on their validity model:

| Classification | Expiry Behavior | Use Cases |
|----------------|-----------------|-----------|
| **Compliance** | Default 365 days, requires renewal | KYC, KYB, authorization claims |
| **Heritage** | Permanent until explicitly revoked | Origin, authenticity claims |

**Key Difference:**

- **Compliance topics** represent current status that can change (e.g., a retailer losing authorization)
- **Heritage topics** represent historical facts that remain valid unless fraud is discovered

---

## 2. Initial Claim Topics

The Galileo ecosystem launches with 12 predefined claim topics organized into four categories.

### 2.1 Complete Topic Reference

| # | Namespace | Topic ID | Description | Default Expiry | Is Compliance | Required Fields |
|---|-----------|----------|-------------|----------------|---------------|-----------------|
| 1 | `galileo.kyc.basic` | `0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0` | Basic individual identity verification | 365 days | Yes | idDocument, livenessScore, verificationDate |
| 2 | `galileo.kyc.enhanced` | `0xa1fecd52420478a3ef25e8f4e37d4f2dfdaec920e48457f40fc2e2839462216e` | Enhanced identity verification with additional checks | 365 days | Yes | idDocument, proofOfAddress, sourceOfFunds, verificationDate |
| 3 | `galileo.kyb.verified` | `0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56` | Business entity verification | 365 days | Yes | registrationNumber, jurisdiction, beneficialOwners[], verificationDate |
| 4 | `galileo.kyc.eu.mifid` | `0xdef3dcc6fc6fe64114e865ad812264af037f0d3a36cb446920d32ace7ee3bdbc` | EU MiFID II compliant KYC | 365 days | Yes | mifidCategory, investorClassification, appropriatenessCheck |
| 5 | `galileo.kyc.us.sec` | `0x2a04959391be0b39934421c3fc7eb5559602ff59b49d93ae63a7741f0c5ce5ac` | US SEC/FinCEN compliant KYC | 365 days | Yes | accreditationStatus, ofacCheck, amlCheckDate |
| 6 | `galileo.kyc.apac.sg` | `0x15a365872e74a520ca7755fae1160f13ab5209d51e117a5555c669c9cc7648e4` | Singapore MAS compliant KYC | 365 days | Yes | masCompliance, residencyStatus, customerRiskRating |
| 7 | `galileoprotocol.io.authorized_retailer` | `0xfc1ed2540d1f8160d9b67d6e66b3e918d6029031f419be09f5e5865c2a74c75a` | Authorized retailer certification | 365 days | Yes | brandDID, territory[], categories[], authorizationDate |
| 8 | `galileoprotocol.io.service_center` | `0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2` | Authorized service center certification | 365 days | Yes | brandDID, serviceTypes[], certifiedTechnicians, authorizationDate |
| 9 | `galileoprotocol.io.authenticator` | `0xda684ab89dbe929e1da9afb6a82d42762bb88db87f85e2041b5a2867ec6a6767` | Third-party authenticator certification | 365 days | Yes | accreditationBody, methodology, categories[], insuranceRef |
| 10 | `galileoprotocol.io.auction_house` | `0x4c471013436dbf8b498b1c5c007748f97d055151ff587e3c94de8738376aaf7d` | Authorized auction house certification | 365 days | Yes | licenseNumber, insuranceAmount, jurisdictions[], saleCategories[] |
| 11 | `galileo.heritage.origin_certified` | `0x1e1c32d6fc1988653c0708c2e488cfef18382e584dbad1834629ffaba627b427` | Certified origin claim | Permanent | No | manufacturingLocation, materialsSource, chainOfCustody[], certificationDate |
| 12 | `galileo.heritage.authenticity_verified` | `0x4fc95faf30f177afc2bdb8d67630d7d32f38116d3ed16938544efcee5cc52ed2` | Authenticity verification claim | Permanent | No | verificationMethod, verifierDID, evidenceHash, verificationDate |

### 2.2 Compliance Topics (KYC/KYB)

These topics cover identity verification for individuals and businesses:

#### KYC_BASIC

**Namespace:** `galileo.kyc.basic`
**Topic ID:** `0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0`

Basic Know Your Customer verification for individual consumers. Minimum requirements for participation in the Galileo ecosystem.

**Required Fields:**

```json
{
  "idDocument": {
    "type": "passport | national_id | drivers_license",
    "issuer": "ISO 3166-1 country code",
    "verified": true
  },
  "livenessScore": 0.95,
  "verificationDate": "2026-01-15T10:30:00Z"
}
```

**Issuer Requirements:**
- Must be registered as `IssuerCategory.KYC_PROVIDER`
- Must have valid SOC2 Type II or ISO 27001 certification

#### KYC_ENHANCED

**Namespace:** `galileo.kyc.enhanced`
**Topic ID:** `0xa1fecd52420478a3ef25e8f4e37d4f2dfdaec920e48457f40fc2e2839462216e`

Enhanced verification for high-value transactions or elevated risk profiles.

**Required Fields:**

```json
{
  "idDocument": { ... },
  "proofOfAddress": {
    "documentType": "utility_bill | bank_statement | government_letter",
    "verified": true,
    "documentDate": "2026-01-01"
  },
  "sourceOfFunds": {
    "declared": "employment | business | investment | inheritance",
    "verified": true
  },
  "verificationDate": "2026-01-15T10:30:00Z"
}
```

**Threshold:** Required for transactions exceeding EUR 10,000 or equivalent.

#### KYB_VERIFIED

**Namespace:** `galileo.kyb.verified`
**Topic ID:** `0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56`

Know Your Business verification for business entities participating in the ecosystem.

**Required Fields:**

```json
{
  "registrationNumber": "Company registration identifier",
  "jurisdiction": "ISO 3166-1 country code",
  "beneficialOwners": [
    {
      "name": "Verified individual name",
      "ownership": 25.0,
      "kycClaimId": "Reference to KYC_BASIC or KYC_ENHANCED claim"
    }
  ],
  "verificationDate": "2026-01-15T10:30:00Z"
}
```

**Note:** All beneficial owners with >25% ownership must have verified KYC claims.

---

## 3. Jurisdiction-Specific KYC Topics

These topics extend basic KYC to meet region-specific regulatory requirements.

### 3.1 EU MiFID II Compliance

**Namespace:** `galileo.kyc.eu.mifid`
**Topic ID:** `0xdef3dcc6fc6fe64114e865ad812264af037f0d3a36cb446920d32ace7ee3bdbc`

Compliance with EU Markets in Financial Instruments Directive II requirements.

**Regulatory Reference:**
- Directive 2014/65/EU (MiFID II)
- Regulation (EU) No 600/2014 (MiFIR)
- ESMA Guidelines on suitability requirements

**Required Fields:**

```json
{
  "mifidCategory": "retail | professional | eligible_counterparty",
  "investorClassification": {
    "classificationDate": "2026-01-15",
    "selfClassified": false
  },
  "appropriatenessCheck": {
    "completed": true,
    "date": "2026-01-15",
    "result": "appropriate"
  },
  "suitabilityAssessment": {
    "investmentObjectives": "...",
    "riskTolerance": "moderate",
    "financialSituation": "verified"
  }
}
```

**Issuer Requirements:**
- Must be authorized under MiFID II in an EU member state
- Must be registered with relevant National Competent Authority

### 3.2 US SEC Compliance

**Namespace:** `galileo.kyc.us.sec`
**Topic ID:** `0x2a04959391be0b39934421c3fc7eb5559602ff59b49d93ae63a7741f0c5ce5ac`

Compliance with US securities regulations and AML requirements.

**Regulatory Reference:**
- Securities Act of 1933
- Securities Exchange Act of 1934
- Bank Secrecy Act / AML regulations
- OFAC sanctions compliance

**Required Fields:**

```json
{
  "accreditationStatus": {
    "isAccredited": true,
    "basis": "income | net_worth | professional",
    "verificationMethod": "third_party | self_certification",
    "verificationDate": "2026-01-15"
  },
  "ofacCheck": {
    "completed": true,
    "date": "2026-01-15",
    "result": "clear"
  },
  "amlCheckDate": "2026-01-15",
  "customerIdentificationProgram": {
    "completed": true,
    "date": "2026-01-15"
  }
}
```

**Issuer Requirements:**
- Must be SEC-registered or exempt
- Must maintain BSA/AML compliance program

### 3.3 APAC Singapore MAS Compliance

**Namespace:** `galileo.kyc.apac.sg`
**Topic ID:** `0x15a365872e74a520ca7755fae1160f13ab5209d51e117a5555c669c9cc7648e4`

Compliance with Singapore Monetary Authority requirements.

**Regulatory Reference:**
- MAS Notice SFA04-N02 (Prevention of Money Laundering)
- Payment Services Act 2019
- MAS Guidelines on AML/CFT

**Required Fields:**

```json
{
  "masCompliance": {
    "customerDueDiligence": true,
    "enhancedDueDiligence": false,
    "pep_screening": {
      "completed": true,
      "result": "not_pep"
    }
  },
  "residencyStatus": "citizen | permanent_resident | foreigner",
  "customerRiskRating": "low | medium | high",
  "sanctionsScreening": {
    "completed": true,
    "date": "2026-01-15",
    "lists": ["UN", "MAS", "OFAC"]
  }
}
```

**Issuer Requirements:**
- Must hold appropriate MAS license (CMS, Payment Services, etc.)
- Must comply with MAS Technology Risk Management Guidelines

---

## 4. Luxury-Specific Topics

These topics define the trust relationships within the luxury goods ecosystem.

### 4.1 Authorized Retailer

**Namespace:** `galileoprotocol.io.authorized_retailer`
**Topic ID:** `0xfc1ed2540d1f8160d9b67d6e66b3e918d6029031f419be09f5e5865c2a74c75a`

Certification that an entity is an authorized retail partner for specific brands.

**Required Fields:**

```json
{
  "brandDID": "did:galileo:brand:hermesparis",
  "territory": ["FR", "DE", "IT"],
  "categories": ["leather-goods", "silk-goods", "ready-to-wear"],
  "authorizationType": "boutique | department_store | online | multi_brand",
  "authorizationDate": "2026-01-01",
  "contractReference": "HERMES-RETAIL-2026-001"
}
```

**Issuer:** Brand entity (`IssuerCategory.BRAND_ISSUER`)

**Use Cases:**
- Verify retail source for warranty claims
- Authenticate legitimate sales channels
- Enable brand-authorized resale

### 4.2 Service Center

**Namespace:** `galileoprotocol.io.service_center`
**Topic ID:** `0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2`

Certification for authorized repair and service centers.

**Required Fields:**

```json
{
  "brandDID": "did:galileo:brand:rolex",
  "serviceTypes": [
    "routine_maintenance",
    "complete_service",
    "restoration",
    "parts_replacement"
  ],
  "certifiedTechnicians": [
    {
      "id": "TECH-001",
      "certificationLevel": "master",
      "specializations": ["movement", "case"]
    }
  ],
  "authorizationDate": "2026-01-01",
  "facilityInspectionDate": "2025-12-15"
}
```

**Issuer:** Brand entity (`IssuerCategory.BRAND_ISSUER`)

**Use Cases:**
- Validate service history claims
- Ensure warranty-compliant repairs
- Track authorized modifications

### 4.3 Authenticator

**Namespace:** `galileoprotocol.io.authenticator`
**Topic ID:** `0xda684ab89dbe929e1da9afb6a82d42762bb88db87f85e2041b5a2867ec6a6767`

Certification for third-party authentication services.

**Required Fields:**

```json
{
  "accreditationBody": "Galileo TSC | ISO 17025",
  "accreditationNumber": "ACC-2026-001",
  "methodology": {
    "physical": ["microscopy", "material_analysis", "construction"],
    "digital": ["spectral_fingerprint", "dna_tagging"],
    "documentation": ["provenance_research", "archive_verification"]
  },
  "categories": ["watches", "handbags", "jewelry"],
  "insuranceRef": {
    "provider": "Lloyds of London",
    "coverage": 5000000,
    "currency": "USD"
  },
  "falsePositiveRate": 0.001,
  "falseNegativeRate": 0.0001
}
```

**Issuer:** Regulatory body or TSC (`IssuerCategory.REGULATORY_BODY`)

**Use Cases:**
- Validate authentication reports
- Enable trusted secondary market
- Support insurance claims

### 4.4 Auction House

**Namespace:** `galileoprotocol.io.auction_house`
**Topic ID:** `0x4c471013436dbf8b498b1c5c007748f97d055151ff587e3c94de8738376aaf7d`

Certification for auction houses authorized to sell luxury goods.

**Required Fields:**

```json
{
  "licenseNumber": "AH-UK-2026-001",
  "licensingAuthority": "UK Arts Council",
  "insuranceAmount": 50000000,
  "insuranceCurrency": "GBP",
  "insuranceProvider": "AXA Art",
  "jurisdictions": ["GB", "US", "CH", "HK"],
  "saleCategories": [
    "watches",
    "jewelry",
    "handbags",
    "collectibles"
  ],
  "antiMoneyLaunderingCompliance": {
    "program": true,
    "lastAudit": "2025-12-01"
  }
}
```

**Issuer:** Regulatory body (`IssuerCategory.REGULATORY_BODY`)

**Use Cases:**
- Validate auction provenance
- Enable institutional bidding
- Support lot authentication

---

## 5. Heritage Topics

Heritage topics represent permanent claims about product origin and authenticity. Unlike compliance topics, they do not expire but can be revoked if fraud is discovered.

### 5.1 Origin Certified

**Namespace:** `galileo.heritage.origin_certified`
**Topic ID:** `0x1e1c32d6fc1988653c0708c2e488cfef18382e584dbad1834629ffaba627b427`

Permanent certification of product origin and provenance.

**Validity:** Permanent until explicitly revoked

**Required Fields:**

```json
{
  "manufacturingLocation": {
    "facility": "Atelier Hermes Pantin",
    "address": "Pantin, France",
    "coordinates": {
      "latitude": 48.8950,
      "longitude": 2.4060
    }
  },
  "materialsSource": [
    {
      "material": "Togo leather",
      "origin": "France",
      "supplier": "did:galileo:brand:tannerie-degermann",
      "traceabilityLevel": "batch"
    }
  ],
  "chainOfCustody": [
    {
      "stage": "raw_material",
      "handler": "did:galileo:brand:tannerie-degermann",
      "date": "2025-11-01"
    },
    {
      "stage": "manufacturing",
      "handler": "did:galileo:brand:hermesparis",
      "date": "2025-12-15"
    }
  ],
  "certificationDate": "2026-01-15T10:30:00Z",
  "certificationMethod": "brand_attestation | third_party_audit | molecular_verification"
}
```

**Issuer:** Brand entity or authentication lab (`IssuerCategory.BRAND_ISSUER` or `IssuerCategory.AUTH_LAB`)

**Revocation Grounds:**
- Discovery of fraudulent origin claims
- Material misrepresentation
- Chain of custody break discovered

### 5.2 Authenticity Verified

**Namespace:** `galileo.heritage.authenticity_verified`
**Topic ID:** `0x4fc95faf30f177afc2bdb8d67630d7d32f38116d3ed16938544efcee5cc52ed2`

Permanent record of authenticity verification.

**Validity:** Permanent until explicitly revoked

**Required Fields:**

```json
{
  "verificationMethod": {
    "type": "physical | digital | combined",
    "techniques": [
      "microscopic_analysis",
      "material_composition",
      "serial_number_verification",
      "spectral_fingerprint"
    ]
  },
  "verifierDID": "did:galileo:verifier:entrupy",
  "verificationLocation": "New York, USA",
  "evidenceHash": "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  "evidenceURI": "https://evidence.entrupy.com/verify/ABC123",
  "confidenceScore": 0.9999,
  "verificationDate": "2026-01-15T10:30:00Z",
  "reportReference": "ENT-2026-ABC123"
}
```

**Issuer:** Authentication lab or brand (`IssuerCategory.AUTH_LAB` or `IssuerCategory.BRAND_ISSUER`)

**Revocation Grounds:**
- Later discovery of counterfeit
- Evidence of report falsification
- Verifier decertification

---

## 6. Topic Lifecycle

### 6.1 Registration

New claim topics are registered through the ClaimTopicsRegistry contract:

```solidity
// Topic registration with metadata
registry.addClaimTopicWithMetadata(
    topicId,
    TopicMetadata({
        namespace: "galileo.kyc.basic",
        description: "Basic KYC verification",
        defaultExpiry: 365 days,
        isCompliance: true
    })
);
```

**Registration Requirements:**

| Requirement | Description |
|-------------|-------------|
| Authority | Only registry admin (TSC-authorized) can register |
| Uniqueness | Topic ID must not already exist |
| Namespace | Must follow naming convention |
| Metadata | All fields must be provided |

### 6.2 Topic Validity

**Compliance Topics:**

Claims for compliance topics are valid for their `defaultExpiry` period from issuance:

```
claimValidity = issuanceDate + defaultExpiry
```

Renewal requires a new claim from an authorized issuer.

**Heritage Topics:**

Claims for heritage topics remain valid indefinitely unless explicitly revoked:

```
claimValidity = forever OR revocationDate
```

### 6.3 Deprecation

Topics can be deprecated when they are superseded or no longer relevant:

```solidity
registry.deprecateTopic(
    topicId,
    "Superseded by galileo.kyc.enhanced.v2"
);
```

**Deprecation Effects:**

| Aspect | Behavior |
|--------|----------|
| Existing claims | Remain valid per original terms |
| New claims | Should not be issued (soft enforcement) |
| Resolution | Topic metadata indicates deprecated status |
| Duration | Deprecated topics remain resolvable for 10 years (per GOV-04) |

### 6.4 Historical Validity

Per the Galileo governance specification (GOV-04), deprecated topics and their claims remain historically valid:

- **10-year deprecation sunset** for standard topics
- **Indefinite retention** for heritage topics (provenance never disappears)
- **Resolver continues to serve** deprecated topic metadata

---

## 7. Extension Process

### 7.1 RFC Process for New Topics

New claim topics are proposed through the Galileo RFC process (per GOV-02):

**RFC Template for Claim Topics:**

```markdown
# RFC: New Claim Topic - [Namespace]

## Summary
Brief description of the proposed claim topic.

## Motivation
Why is this topic needed? What use cases does it enable?

## Specification

### Namespace
`galileo.category.subcategory`

### Topic ID
`keccak256("galileo.category.subcategory")` = `0x...`

### Classification
[ ] Compliance (default 365-day expiry)
[ ] Heritage (permanent until revoked)

### Required Fields
```json
{
  "field1": "...",
  "field2": "..."
}
```

### Issuer Requirements
- Category: [KYC_PROVIDER | BRAND_ISSUER | AUTH_LAB | REGULATORY_BODY]
- Certification: [Required certifications]

## Compatibility
Impact on existing topics and claims.

## Security Considerations
[Privacy, data protection, abuse potential]
```

**Review Timeline:**

| Topic Type | Review Period | Decision |
|------------|---------------|----------|
| Minor extension | 2 weeks | Lazy consensus |
| New category | 30 days | TSC vote |
| Breaking change | 60 days | TSC supermajority |

### 7.2 Future Topic Additions

The following topics are anticipated for future RFC proposals:

**ESPR/Regulatory Topics:**

| Namespace | Description | Target Date |
|-----------|-------------|-------------|
| `galileo.espr.dpp_compliant` | EU ESPR Digital Product Passport compliance | 2027 |
| `galileo.espr.sustainability_score` | Product sustainability rating | 2027 |
| `galileo.reg.uk.consumer_rights` | UK Consumer Rights Act compliance | 2027 |

**Industry-Specific Topics:**

| Namespace | Description | Target Date |
|-----------|-------------|-------------|
| `galileoprotocol.io.master_craftsman` | MOF/Living Treasure certification | 2026 |
| `galileoprotocol.io.insurance_approved` | Insurance-approved valuation | 2026 |
| `galileo.heritage.exhibition_loan` | Museum/exhibition loan history | 2027 |

**Technology Topics:**

| Namespace | Description | Target Date |
|-----------|-------------|-------------|
| `galileo.tech.nfc_bound` | NFC chip binding verification | 2026 |
| `galileo.tech.dna_tagged` | Molecular DNA tagging | 2027 |
| `galileo.tech.pqc_migrated` | Post-quantum cryptography migration | 2029 |

### 7.3 Namespace Reservation

The following namespace prefixes are reserved:

| Prefix | Reserved For |
|--------|--------------|
| `galileo.kyc.*` | KYC-related topics |
| `galileo.kyb.*` | KYB-related topics |
| `galileoprotocol.io.*` | Luxury industry topics |
| `galileo.heritage.*` | Provenance/heritage topics |
| `galileo.espr.*` | EU ESPR compliance topics |
| `galileo.reg.*` | Regulatory compliance topics |
| `galileo.tech.*` | Technology-specific topics |
| `galileo.test.*` | Testing/development (never for production) |

Third-party namespaces use a different root:

```
{organization}.galileo.{category}.{topic}
```

Example: `sothebys.galileo.auction.lot_certified`

---

## Appendix A: Topic ID Computation Reference

For convenience, here are all 12 initial topic IDs with their computation:

```javascript
// Node.js / ethers.js
const ethers = require('ethers');

const topics = {
  'galileo.kyc.basic': ethers.keccak256(ethers.toUtf8Bytes('galileo.kyc.basic')),
  'galileo.kyc.enhanced': ethers.keccak256(ethers.toUtf8Bytes('galileo.kyc.enhanced')),
  // ...
};

// Solidity
uint256 topicId = uint256(keccak256(bytes("galileo.kyc.basic")));
```

**Verification:**

```bash
# Using Foundry's cast
cast keccak "galileo.kyc.basic"
# Returns: 0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0
```

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [ITrustedIssuersRegistry.sol](../contracts/identity/ITrustedIssuersRegistry.sol) | Issuer management interface |
| [IClaimTopicsRegistry.sol](../contracts/identity/IClaimTopicsRegistry.sol) | Topic registry interface |
| [DID-METHOD.md](./DID-METHOD.md) | DID resolution for issuers |
| [GOV-02](../../governance/rfcs/README.md) | RFC process for new topics |
| [GOV-04](../../governance/VERSIONING.md) | Deprecation and sunset policy |

---

*Galileo Luxury Standard - Identity Layer*
*Specification: GSPEC-IDENTITY-004*
*Classification: Public*
