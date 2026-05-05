# ESPR/DPP Readiness Implementation Guide

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-02-01
**Specification ID:** GGUIDE-COMPLIANCE-003

---

## Table of Contents

1. [Overview](#1-overview)
2. [DPP Timeline for Luxury Goods](#2-dpp-timeline-for-luxury-goods)
3. [Mandatory DPP Fields Checklist](#3-mandatory-dpp-fields-checklist)
4. [Data Carrier Requirements](#4-data-carrier-requirements)
5. [GS1 Integration](#5-gs1-integration)
6. [Access Control and Context Routing](#6-access-control-and-context-routing)
7. [EU Registry Notification](#7-eu-registry-notification)
8. [DPP Validation](#8-dpp-validation)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Common Pitfalls](#10-common-pitfalls)
11. [Regulatory References](#11-regulatory-references)

---

## 1. Overview

### 1.1 Purpose

This guide prepares Galileo adopters for ESPR (Ecodesign for Sustainable Products Regulation) 2024/1781 mandatory compliance, focusing on Digital Product Passport (DPP) implementation for luxury goods.

### 1.2 Key Regulation

**ESPR 2024/1781** establishes the framework for ecodesign requirements and Digital Product Passports in the EU. The DPP provides comprehensive product information accessible via data carriers (QR codes, NFC tags).

### 1.3 Key Deadline: 2027 for Textiles

> **2027:** Digital Product Passport mandatory for textile products (including apparel, leather goods)

Luxury brands selling textiles, leather goods, and apparel in the EU MUST implement DPP by 2027.

### 1.4 Galileo DPP Compliance Status

**Assessment:** The Galileo `dpp-core.schema.json` is **ESPR 2024/1781 COMPLIANT** for mandatory fields.

All required fields are present:
- Material composition
- Carbon footprint
- Country of origin
- Repair instructions
- Compliance declaration
- Unique identifier

---

## 2. DPP Timeline for Luxury Goods

### 2.1 Phased Implementation

| Year | Phase | Scope | Galileo Readiness |
|------|-------|-------|-------------------|
| **2027** | Minimal DPP | Textiles/apparel | READY - dpp-core.schema.json |
| **2027** | Minimal DPP | Footwear | READY - dpp-core.schema.json |
| **2028-2029** | Category-specific | Leather goods (pending delegated act) | READY - schema extensible |
| **2030** | Advanced DPP | Extended categories | READY - product schemas |
| **2033** | Full Circular DPP | All products | Pending delegated acts |

### 2.2 Delegated Acts Status

ESPR implementation depends on product-specific delegated acts from the European Commission:

| Product Category | Delegated Act Status | Expected Date | Notes |
|------------------|---------------------|---------------|-------|
| **Textiles** | Adopted | 2026 | First priority |
| **Footwear** | Adopted | 2026 | With textiles |
| **Iron and steel** | Adopted | 2026 | Industrial focus |
| **Leather goods** | Pending | 2027-2028 | Monitor Commission |
| **Watches/jewelry** | Pending | 2028+ | Luxury-specific requirements TBD |
| **Electronics** | Pending | 2027 | Battery regulation link |

### 2.3 Transition Provisions

| Provision | Description |
|-----------|-------------|
| Existing stock | Products on market before deadline may be sold without DPP |
| Phase-in | 6-12 month grace period typical for new requirements |
| SME extensions | Small businesses may get additional time |

**Recommendation:** Implement DPP early for competitive advantage and consumer trust.

---

## 3. Mandatory DPP Fields Checklist

### 3.1 ESPR 2024/1781 Mandatory Fields

The following fields are required per ESPR Article 9(1):

| ESPR Requirement | dpp-core.schema.json Field | Schema Path | Validation | Status |
|------------------|---------------------------|-------------|------------|--------|
| Unique identifier | `@id` + `identifier` | `$.@id`, `$.identifier.value` | DID pattern + GTIN-14 | COMPLIANT |
| Product name | `name` | `$.name` | String, required | COMPLIANT |
| Brand/manufacturer | `brand`, `manufacturer` | `$.brand`, `$.manufacturer` | Organization object | COMPLIANT |
| Country of origin | `countryOfOrigin` | `$.countryOfOrigin` | ISO 3166-1 alpha-3 | COMPLIANT |
| Production date | `productionDate` | `$.productionDate` | ISO 8601 date | COMPLIANT |
| Material composition | `materialComposition[]` | `$.materialComposition[*]` | Array, sum = 100% | COMPLIANT |
| Carbon footprint | `carbonFootprint` | `$.carbonFootprint` | ISO 14067 format | COMPLIANT |
| Repair instructions | `repairInstructions` | `$.repairInstructions` | URL or object | COMPLIANT |
| Compliance declaration | `complianceDeclaration` | `$.complianceDeclaration` | Boolean + cert | COMPLIANT |

### 3.2 Material Composition Requirements

Per ESPR Article 9(1)(c), material composition must include:

| Field | Requirement | Schema Validation |
|-------|-------------|-------------------|
| Material name | Required | `material`: string, minLength 1 |
| Percentage | Required, integer | `percentage`: 0-100 |
| Total | Must sum to 100% | Validation rule (see Section 8) |
| Recycled content | If applicable | `recycledContent`: 0-100 |
| Origin | Recommended | `origin`: ISO 3166-1 alpha-3 |
| Certification | If claimed | `certificationScheme`: string |

**Example:**
```json
{
  "materialComposition": [
    {
      "@type": "MaterialComponent",
      "material": "Togo Leather",
      "percentage": 85,
      "origin": "FRA",
      "certified": true,
      "certificationScheme": "LWG Gold",
      "recycledContent": 0
    },
    {
      "@type": "MaterialComponent",
      "material": "Gold-Plated Hardware",
      "percentage": 10,
      "origin": "FRA"
    },
    {
      "@type": "MaterialComponent",
      "material": "Chevre Lining",
      "percentage": 5,
      "origin": "FRA"
    }
  ]
}
```

### 3.3 Carbon Footprint Requirements

Per ESPR Article 9(1)(d), carbon footprint must follow ISO 14067:

| Field | Requirement | Schema Validation |
|-------|-------------|-------------------|
| Total CO2e | Required | `totalCO2e`: number >= 0 |
| Unit | Required | `unit`: enum [kgCO2e, tCO2e, gCO2e] |
| Scope | Required | `scope`: array of scope types |
| Methodology | Required | `methodology`: enum [ISO14067, GHGProtocol, PEF, PEFCR] |
| Calculation date | Recommended | `calculationDate`: ISO 8601 |
| Verifier | Recommended | `verifier`: Organization |

**Example:**
```json
{
  "carbonFootprint": {
    "@type": "CarbonFootprint",
    "totalCO2e": 45.2,
    "unit": "kgCO2e",
    "scope": ["scope1", "scope2", "scope3"],
    "methodology": "ISO14067",
    "calculationDate": "2024-01-01",
    "verificationDate": "2024-01-15",
    "validUntil": "2025-01-01",
    "breakdown": {
      "rawMaterials": 20.5,
      "manufacturing": 15.2,
      "transport": 5.5,
      "use": 2.0,
      "endOfLife": 2.0
    }
  }
}
```

### 3.4 Repair Instructions Requirements

Per ESPR Article 9(1)(e):

| Field | Requirement | Schema Validation |
|-------|-------------|-------------------|
| Guide URL | Required | `guideUrl`: URI format |
| Languages | Required | `availableLanguages`: ISO 639-1 array |
| Repairability index | Required | `repairabilityIndex`: 1-10 scale |
| Spare parts | Recommended | `spareParts.available`: boolean |
| Repair centers | Recommended | `repairCenters`: array |

**Example:**
```json
{
  "repairInstructions": {
    "@type": "RepairGuide",
    "guideUrl": "https://www.hermes.com/care/leather",
    "availableLanguages": ["en", "fr", "zh", "ja", "de", "it", "es"],
    "repairabilityIndex": 9.5,
    "spareParts": {
      "available": true,
      "availabilityPeriod": "P10Y",
      "catalogUrl": "https://www.hermes.com/spares"
    },
    "estimatedLifespan": "P25Y"
  }
}
```

---

## 4. Data Carrier Requirements

### 4.1 Overview

ESPR requires DPP information to be accessible via data carriers physically attached to or accompanying the product. Supported carriers:

| Carrier Type | Standard | Use Case |
|--------------|----------|----------|
| **QR Code** | ISO 18004 | Labels, hang tags, packaging |
| **NFC** | ISO 14443, 15693 | Luxury products, anti-counterfeit |
| **RFID** | ISO 18000-6 | Supply chain, inventory |
| **Digital watermark** | Digimarc, etc. | Fabric printing |

### 4.2 QR Code Specifications

Per GS1 Digital Link 1.6.0:

| Requirement | Specification |
|-------------|---------------|
| Minimum size | 10mm x 10mm (15mm recommended for luxury) |
| Error correction | Level M minimum (15%), Level Q recommended (25%) |
| Quiet zone | 4 modules minimum |
| Content | GS1 Digital Link URI |
| Format | `https://id.galileoprotocol.io/01/{GTIN}/21/{Serial}` |

**Reference:** `specifications/resolver/digital-link-uri.md` Section 9.1

**Example QR Data:**
```
https://id.galileoprotocol.io/01/09506000134352/21/HK2024A001
```

### 4.3 NFC Requirements

| Requirement | Specification |
|-------------|---------------|
| Standard | ISO 14443 Type A/B or ISO 15693 |
| Record format | NDEF URI Record |
| Content | GS1 Digital Link URI |
| Security | Write-protect after programming |
| Memory | Minimum 144 bytes (NTAG213) |

**NDEF Structure:**
```
[TNF=0x01][Type="U"][URI Identifier=0x04][URI=id.galileoprotocol.io/01/...]
```

### 4.4 Tag Recommendations

| Tag Type | Memory | Cost | Recommended For |
|----------|--------|------|-----------------|
| NTAG213 | 144 bytes | Low | Basic products, compressed URIs |
| NTAG215 | 504 bytes | Medium | Full URIs, multiple records |
| NTAG216 | 888 bytes | Medium | Extended data |
| NFC Type 4 | 2-32 KB | High | Premium luxury, multi-application |

### 4.5 Best Practices

1. **Redundancy:** Include both QR and NFC where possible
2. **Durability:** Laser-etched QR for permanent luxury products
3. **Placement:** Visible but not affecting aesthetics
4. **Testing:** Verify scanning in retail environments
5. **Authentication:** NFC enables cryptographic verification

---

## 5. GS1 Integration

### 5.1 GTIN Requirements

All products MUST have a GS1 Global Trade Item Number (GTIN):

| Format | Digits | Usage |
|--------|--------|-------|
| GTIN-8 | 8 | Small items |
| GTIN-12 (UPC-A) | 12 | North America |
| GTIN-13 (EAN-13) | 13 | International |
| GTIN-14 | 14 | Galileo standard (normalized) |

**Normalization:** All GTINs MUST be normalized to 14 digits with leading zeros.

**Reference:** `specifications/resolver/digital-link-uri.md` Section 4

### 5.2 GS1 Digital Link URI Structure

```
https://id.galileoprotocol.io/{AI}/{Value}/{AI2}/{Value2}
```

| Component | Description | Example |
|-----------|-------------|---------|
| Domain | Galileo resolver | `id.galileoprotocol.io` |
| AI 01 | GTIN | `01/09506000134352` |
| AI 21 | Serial number | `21/HK2024A001` |
| AI 10 | Batch/lot | `10/LOT2024` (optional) |

### 5.3 Linking GTIN to Galileo DID

```
1. Product receives GTIN-14 from GS1
   Example: 09506000134352

2. Galileo creates DID
   Example: did:galileo:01:09506000134352:21:HK2024A001

3. QR/NFC encodes GS1 Digital Link
   Example: https://id.galileoprotocol.io/01/09506000134352/21/HK2024A001

4. Resolver returns DPP JSON-LD via content negotiation
   Accept: application/ld+json -> DPP data
   Accept: text/html -> Consumer-facing page
```

### 5.4 Bidirectional Mapping

| GS1 Digital Link URI | Galileo DID |
|---------------------|-------------|
| `https://id.galileoprotocol.io/01/09506000134352/21/HK2024A001` | `did:galileo:01:09506000134352:21:HK2024A001` |
| `https://id.galileoprotocol.io/01/09506000134352` | `did:galileo:01:09506000134352` |

**Reference:** `specifications/resolver/digital-link-uri.md` Section 6

---

## 6. Access Control and Context Routing

### 6.1 Tiered Access per ESPR

ESPR requires different access levels for different audiences:

| Audience | Access Level | Data Visible |
|----------|--------------|--------------|
| **Consumer** | Public | Basic DPP (24 EU languages) |
| **Brand** | Authenticated | Full DPP + analytics |
| **Regulator** | Authenticated | Compliance evidence + audit |
| **Service Center** | Authenticated | Repair data + technical specs |

### 6.2 Context Detection

The Galileo resolver routes requests based on context:

```
Request Priority (highest to lowest):
1. JWT token claims (authenticated role)
2. ?linkType= query parameter
3. ?context= query parameter
4. Accept header (content negotiation)
5. Default (consumer view)
```

**Reference:** `specifications/resolver/resolution-protocol.md` Section 6

### 6.3 Response by Context

| Context | linkType | Response |
|---------|----------|----------|
| Consumer (default) | `gs1:pip` | Public DPP, care instructions, sustainability |
| Regulator | `galileo:complianceDPP` | ESPR mandatory fields, certificates |
| Service Center | `galileo:serviceInfo` | Repair guides, technical specs |
| Brand | `galileo:internalDPP` | Full DPP, customer data (if permitted) |

### 6.4 Language Support

ESPR requires public DPP data available in 24 EU languages:

| Requirement | Implementation |
|-------------|----------------|
| All EU languages | `availableLanguages` in repairInstructions |
| Language selection | `?lang=fr` query parameter |
| Fallback | English if requested language unavailable |
| Translation | Brand responsibility for accuracy |

---

## 7. EU Registry Notification

### 7.1 Overview

ESPR establishes an EU product registry. CASPs and manufacturers MUST notify:

| Notification Type | When Required | Data |
|-------------------|---------------|------|
| Product registration | Before placing on market | DPP reference, GTIN, brand |
| Compliance update | On material changes | Updated DPP reference |
| Withdrawal | Product removed from market | Reason, date |

### 7.2 Timeline

| Milestone | Expected Date | Action |
|-----------|---------------|--------|
| Registry specification | 2026 | Commission publishes API spec |
| Registry pilot | Q1 2027 | Early adopter testing |
| Registry mandatory | July 2027 | All textiles must register |

### 7.3 Integration Preparation

Galileo will support EU Registry integration:

```typescript
// Future integration pattern
interface EURegistryNotification {
  gtin: string;
  dppUri: string; // GS1 Digital Link
  brandId: string;
  productCategory: string;
  complianceStatus: boolean;
  notificationDate: string;
}

async function notifyEURegistry(
  notification: EURegistryNotification
): Promise<RegistrationConfirmation> {
  // Implementation pending EU Registry API specification
}
```

**Recommendation:** Monitor Commission publications for registry specifications.

---

## 8. DPP Validation

### 8.1 Schema Validation

All DPP documents MUST validate against `dpp-core.schema.json`:

```typescript
// dpp-validator.ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import dppCoreSchema from '../specifications/schemas/dpp/dpp-core.schema.json';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateDPP = ajv.compile(dppCoreSchema);

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  missingMandatory?: string[];
  espr2024Compliant: boolean;
}

interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

function validateDPPForESPR(dpp: unknown): ValidationResult {
  const valid = validateDPP(dpp);

  const result: ValidationResult = {
    valid,
    espr2024Compliant: false
  };

  if (!valid) {
    result.errors = validateDPP.errors?.map(e => ({
      path: e.instancePath,
      message: e.message || 'Unknown error',
      keyword: e.keyword
    }));

    // Check specifically for ESPR mandatory fields
    const mandatoryFields = [
      'materialComposition',
      'carbonFootprint',
      'repairInstructions',
      'complianceDeclaration',
      'countryOfOrigin',
      'productionDate',
      'manufacturer'
    ];

    result.missingMandatory = mandatoryFields.filter(field => {
      const error = result.errors?.find(e =>
        e.path.includes(field) || e.message?.includes(field)
      );
      return error !== undefined;
    });
  } else {
    // Additional ESPR-specific validations
    const dppObj = dpp as Record<string, unknown>;

    // Validate material composition sums to 100%
    const materials = dppObj.materialComposition as Array<{ percentage: number }>;
    const totalPercentage = materials.reduce((sum, m) => sum + m.percentage, 0);

    if (totalPercentage !== 100) {
      result.valid = false;
      result.errors = [{
        path: '/materialComposition',
        message: `Material percentages must sum to 100%, got ${totalPercentage}%`,
        keyword: 'materialCompositionSum'
      }];
    } else {
      result.espr2024Compliant = true;
    }
  }

  return result;
}

// Usage
const result = validateDPPForESPR(myDPP);
if (!result.espr2024Compliant) {
  console.log('Missing mandatory fields:', result.missingMandatory);
  console.log('Validation errors:', result.errors);
}
```

### 8.2 Material Composition Validation

```typescript
function validateMaterialComposition(
  materials: MaterialComponent[]
): { valid: boolean; error?: string } {
  // Check sum equals 100%
  const total = materials.reduce((sum, m) => sum + m.percentage, 0);

  if (total !== 100) {
    return {
      valid: false,
      error: `Material percentages must sum to 100%, got ${total}%`
    };
  }

  // Check each percentage is valid
  for (const material of materials) {
    if (material.percentage < 0 || material.percentage > 100) {
      return {
        valid: false,
        error: `Invalid percentage for ${material.material}: ${material.percentage}`
      };
    }
  }

  // Check recycled content if present
  for (const material of materials) {
    if (material.recycledContent !== undefined) {
      if (material.recycledContent < 0 || material.recycledContent > 100) {
        return {
          valid: false,
          error: `Invalid recycled content for ${material.material}: ${material.recycledContent}`
        };
      }
    }
  }

  return { valid: true };
}
```

### 8.3 GTIN Validation

```typescript
function validateGTIN(gtin: string): { valid: boolean; error?: string } {
  // Must be exactly 14 digits
  if (!/^\d{14}$/.test(gtin)) {
    return {
      valid: false,
      error: 'GTIN must be exactly 14 digits'
    };
  }

  // Validate check digit (Modulo-10)
  const digits = gtin.split('').map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const weight = (13 - i) % 2 === 0 ? 1 : 3;
    sum += digits[i] * weight;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;

  if (calculatedCheck !== checkDigit) {
    return {
      valid: false,
      error: `Invalid check digit: expected ${calculatedCheck}, got ${checkDigit}`
    };
  }

  return { valid: true };
}
```

---

## 9. Implementation Checklist

### 9.1 Product Identification

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 1 | GTIN-14 assigned to all products | ESPR Art. 9 | GS1 registration | digital-link-uri.md S4 |
| 2 | Serial numbers unique per item | ESPR Art. 9 | Database check | dpp-core.schema.json |
| 3 | DID generated per product instance | Galileo | DID resolution test | DID-METHOD.md |
| 4 | GS1 Digital Link URI valid | GS1 1.6.0 | URI validation | digital-link-uri.md S8 |

**Checklist:**
- [ ] 1. Product catalog mapped to GTIN-14 identifiers
- [ ] 2. Serial number generation system implemented
- [ ] 3. DID creation for each product instance
- [ ] 4. GS1 Digital Link URIs validated

### 9.2 DPP Content

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 5 | DPP schema validated | ESPR Art. 9 | ajv validation | dpp-core.schema.json |
| 6 | Material composition percentages sum to 100% | ESPR Art. 9(1)(c) | Sum validation | Section 8.2 |
| 7 | Carbon footprint calculated per ISO 14067 | ESPR Art. 9(1)(d) | Methodology check | dpp-core.schema.json |
| 8 | Repair instructions documented | ESPR Art. 9(1)(e) | URL accessible | dpp-core.schema.json |
| 9 | Repairability index 1-10 | ESPR Art. 9(1)(e) | Range validation | dpp-core.schema.json |
| 10 | Compliance declaration present | ESPR Art. 9(1)(f) | Boolean + date | dpp-core.schema.json |

**Checklist:**
- [ ] 5. DPP documents validate against dpp-core.schema.json
- [ ] 6. Material composition percentages sum to exactly 100%
- [ ] 7. Carbon footprint calculated using ISO 14067 methodology
- [ ] 8. Repair instructions URL accessible and documented
- [ ] 9. Repairability index on 1-10 scale assigned
- [ ] 10. Compliance declaration with date included

### 9.3 Data Carriers

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 11 | QR codes generated per GS1 spec | ESPR Art. 10 | QR scan test | digital-link-uri.md S9 |
| 12 | QR minimum size 10mm | ISO 18004 | Physical measurement | Section 4.2 |
| 13 | Error correction Level M+ | ISO 18004 | QR generation config | Section 4.2 |
| 14 | NFC chips programmed (if applicable) | ISO 14443/15693 | NFC scan test | Section 4.3 |
| 15 | NFC write-protected | Security | Write attempt test | Section 4.3 |

**Checklist:**
- [ ] 11. QR codes encode GS1 Digital Link URI correctly
- [ ] 12. QR code minimum size met (10mm x 10mm)
- [ ] 13. Error correction Level M or higher
- [ ] 14. NFC tags programmed with NDEF URI record
- [ ] 15. NFC tags write-protected after programming

### 9.4 Resolver and Access

| # | Requirement | Regulation | Verification | Galileo Reference |
|---|-------------|------------|--------------|-------------------|
| 16 | Resolver endpoint configured | ESPR Art. 10 | HTTP 200 test | resolution-protocol.md |
| 17 | Content negotiation works | GS1 1.6.0 | Accept header test | resolution-protocol.md S5 |
| 18 | Multi-language support | ESPR Art. 9 | Language param test | Section 6.4 |
| 19 | Context routing operational | Galileo | Role-based access test | resolution-protocol.md S6 |
| 20 | Public data in 24 EU languages | ESPR Art. 9 | Translation coverage | Section 6.4 |

**Checklist:**
- [ ] 16. Resolver endpoint returns DPP for valid URIs
- [ ] 17. Content negotiation returns JSON-LD for appropriate Accept header
- [ ] 18. `?lang=` parameter returns localized content
- [ ] 19. Context routing returns appropriate data per role
- [ ] 20. Translations available for all required EU languages

### 9.5 Product-Specific Schemas

| Category | Schema | Status | Notes |
|----------|--------|--------|-------|
| Textiles | dpp-textile.schema.json | Available | Extends dpp-core |
| Leather goods | dpp-leather.schema.json | Available | Extends dpp-core |
| Watches | dpp-watch.schema.json | Available | Extends dpp-core |
| Jewelry | dpp-jewelry.schema.json | Available | Extends dpp-core |

**Checklist:**
- [ ] Category-appropriate schema selected
- [ ] Category-specific fields populated
- [ ] Schema extension validated

---

## 10. Common Pitfalls

### 10.1 Pitfall 1: DPP Confusion Between Product Types and Serial Numbers

**What goes wrong:** Creating one DPP per product model instead of per item

**Why it happens:** Misunderstanding ESPR's individual product tracking requirement

**How to avoid:**
- DPP is per product INSTANCE, not per model
- Schema uses `did:galileo:01:{GTIN}:21:{serial}` format
- Each physical item gets unique DPP with unique serial number

**Warning signs:** DPPs without serial numbers; single DPP for multiple items

### 10.2 Pitfall 2: Material Percentages Not Summing to 100%

**What goes wrong:** Material composition percentages sum to 99% or 101%

**Why it happens:** Rounding errors, incomplete listing

**How to avoid:**
- Validate sum equals exactly 100%
- Include "Other" category if needed
- Use integer percentages only

**Warning signs:** Validation errors on materialComposition

### 10.3 Pitfall 3: Missing Carbon Footprint Methodology

**What goes wrong:** Carbon footprint value without methodology reference

**Why it happens:** Treating carbon footprint as simple number

**How to avoid:**
- MUST specify methodology (ISO14067, GHGProtocol, PEF, PEFCR)
- MUST specify scope (scope1, scope2, scope3)
- SHOULD include verification date and verifier

**Warning signs:** carbonFootprint with only totalCO2e field

### 10.4 Pitfall 4: QR Code Too Small

**What goes wrong:** QR code unreadable by standard smartphone cameras

**Why it happens:** Aesthetic constraints, small labels

**How to avoid:**
- Minimum 10mm x 10mm (15mm recommended)
- Use Level Q error correction for luxury (25%)
- Test in actual retail lighting conditions

**Warning signs:** QR codes smaller than 10mm; frequent scan failures

### 10.5 Pitfall 5: No Multi-Language Support

**What goes wrong:** DPP only available in one language

**Why it happens:** Not planning for EU market requirements

**How to avoid:**
- ESPR requires 24 EU language availability for public data
- Use `availableLanguages` field in repairInstructions
- Implement `?lang=` query parameter in resolver

**Warning signs:** repairInstructions with single language; no lang parameter support

---

## 11. Regulatory References

### 11.1 Primary Regulations

| Regulation | Citation | Key Articles |
|------------|----------|--------------|
| **ESPR** | [Regulation (EU) 2024/1781](https://eur-lex.europa.eu/eli/reg/2024/1781/oj/eng) | Art. 9 (DPP), Art. 10 (Data carriers) |
| **GS1 Digital Link** | [GS1 Standard 1.6.0](https://ref.gs1.org/standards/digital-link/) | Full specification |
| **ISO 14067** | ISO 14067:2018 | Carbon footprint methodology |
| **ISO 18004** | ISO/IEC 18004:2015 | QR Code specification |

### 11.2 Galileo Specifications

| Specification | Path | Relevant Sections |
|---------------|------|-------------------|
| DPP Core Schema | `specifications/schemas/dpp/dpp-core.schema.json` | Full schema |
| Digital Link URI | `specifications/resolver/digital-link-uri.md` | S4 (GTIN), S6 (DID mapping), S9 (Encoding) |
| Resolution Protocol | `specifications/resolver/resolution-protocol.md` | S5 (Content negotiation), S6 (Context) |
| Context Routing | `specifications/resolver/context-routing.md` | Full |

### 11.3 External Resources

- [European Commission ESPR Page](https://environment.ec.europa.eu/topics/circular-economy/ecodesign-sustainable-products-regulation_en)
- [GS1 Digital Link Implementation Guideline](https://www.gs1.org/standards/gs1-digital-link/guideline)
- [DPP Implementation Guide - Fluxy](https://fluxy.one/post/digital-product-passport-dpp-eu-guide-2025-2030)
- [European Parliament Textile DPP Study](https://www.europarl.europa.eu/RegData/etudes/STUD/2024/757808/EPRS_STU(2024)757808_EN.pdf)

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Guide ID** | GGUIDE-COMPLIANCE-003 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-02-01 |
| **Last Modified** | 2026-02-01 |
| **Authors** | Galileo Luxury Standard TSC |
| **Target Audience** | Implementers, Product Managers, Sustainability Officers |
| **Compliance** | ESPR 2024/1781, GS1 Digital Link 1.6.0 |

---

*End of ESPR/DPP Readiness Implementation Guide*
