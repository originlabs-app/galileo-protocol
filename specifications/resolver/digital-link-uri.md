# GS1 Digital Link URI Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-RESOLVER-001
**GS1 Digital Link Version:** 1.6.0 (April 2025)

---

## Table of Contents

1. [Overview](#1-overview)
2. [URI Syntax](#2-uri-syntax)
3. [Application Identifiers](#3-application-identifiers)
4. [GTIN Normalization](#4-gtin-normalization)
5. [URI Compression](#5-uri-compression)
6. [URI to DID Mapping](#6-uri-to-did-mapping)
7. [Query Parameters](#7-query-parameters)
8. [Validation Rules](#8-validation-rules)
9. [QR Code and NFC Encoding](#9-qr-code-and-nfc-encoding)
10. [Examples](#10-examples)

---

## 1. Overview

### 1.1 Purpose

This specification defines the GS1 Digital Link URI structure for the Galileo Luxury Standard resolver at `id.galileoprotocol.io`. The URI format bridges physical product identifiers (QR codes, NFC tags) to digital identities, enabling ESPR-mandated Digital Product Passport access.

### 1.2 Conformance

This specification conforms to:
- **GS1 Digital Link Standard 1.6.0** (April 2025)
- **GS1-Conformant Resolver Standard 1.2.0** (January 2026)
- **IETF RFC 3986** (URI Generic Syntax)

References:
- [GS1 Digital Link Standard](https://ref.gs1.org/standards/digital-link/)
- [GS1 General Specifications](https://www.gs1.org/standards/barcodes-epcrfid-id-keys/gs1-general-specifications)
- [did:galileo Method Specification](../identity/DID-METHOD.md)
- [GS1 Integration Specification](../schemas/alignment/gs1-integration.md)

### 1.3 Scope

This specification covers:
- URI syntax for product identification
- Application Identifier support
- GTIN normalization and validation
- URI compression for QR codes
- Bidirectional mapping to `did:galileo` identifiers

### 1.4 ESPR Mandate

The EU Ecodesign for Sustainable Products Regulation (ESPR) 2024/1781 mandates Digital Product Passports accessible via data carriers (QR codes, NFC). GS1 Digital Link is the recommended URI standard for interoperability. This specification ensures Galileo resolver compliance with ESPR requirements.

---

## 2. URI Syntax

### 2.1 Base URI Structure

The Galileo resolver accepts GS1 Digital Link URIs at:

```
https://id.galileoprotocol.io/{ai}/{value}[/{ai2}/{value2}]...[?query]
```

Where:
- `id.galileoprotocol.io` is the resolver domain
- `{ai}` is a GS1 Application Identifier
- `{value}` is the identifier value
- Multiple AI/value pairs can be chained
- Optional query parameters for link type and context

### 2.2 Primary URI Pattern

The primary pattern for product identification:

```
https://id.galileoprotocol.io/01/{GTIN14}/21/{Serial}
```

Example:
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123
```

### 2.3 ABNF Grammar

Formal ABNF grammar per RFC 5234:

```abnf
gs1-digital-link     = "https://" authority path-abempty [ "?" query ]

authority            = "id.galileoprotocol.io"

path-abempty         = "/" primary-key *( "/" qualifier )

primary-key          = ai-01 / ai-8006 / ai-8010 / ai-253

ai-01                = "01/" gtin14
ai-8006              = "8006/" itip18
ai-8010              = "8010/" cpid
ai-253               = "253/" gdti

qualifier            = ai-21 / ai-10 / ai-17 / ai-3103

ai-21                = "21/" serial
ai-10                = "10/" batch-lot
ai-17                = "17/" expiry-date
ai-3103              = "3103/" net-weight

gtin14               = 14DIGIT
itip18               = 18DIGIT
cpid                 = 1*30(ALPHA / DIGIT / "-")
gdti                 = 13*30DIGIT
serial               = 1*20(ALPHA / DIGIT / "-" / ".")
batch-lot            = 1*20(ALPHA / DIGIT / "-" / ".")
expiry-date          = 6DIGIT                          ; YYMMDD format
net-weight           = 6DIGIT                          ; Weight in grams

query                = query-param *( "&" query-param )
query-param          = link-type / context / lang

link-type            = "linkType=" link-type-value
link-type-value      = gs1-link-type / galileo-link-type / "linkset"
gs1-link-type        = "gs1:" 1*(ALPHA / DIGIT)
galileo-link-type    = "galileo:" 1*(ALPHA / DIGIT)

context              = "context=" context-value
context-value        = "consumer" / "brand" / "regulator" / "service_center"

lang                 = "lang=" language-tag
language-tag         = 2*8ALPHA                        ; BCP 47

DIGIT                = %x30-39                         ; 0-9
ALPHA                = %x41-5A / %x61-7A               ; A-Z / a-z
```

### 2.4 Path Structure

The URI path follows GS1 Digital Link path structure:

| Position | Component | Required | Example |
|----------|-----------|----------|---------|
| 1 | Primary AI | Yes | `01` |
| 2 | Primary Value | Yes | `09506000134352` |
| 3 | Qualifier AI | No | `21` |
| 4 | Qualifier Value | Conditional | `ABC123` |
| 5+ | Additional Qualifiers | No | `10/LOT001` |

---

## 3. Application Identifiers

### 3.1 Supported Application Identifiers

The Galileo resolver supports the following GS1 Application Identifiers:

#### Primary Identifiers (Required)

| AI | Name | Format | Length | Description |
|----|------|--------|--------|-------------|
| **01** | GTIN | Numeric | 14 digits | Global Trade Item Number (primary product ID) |
| **8006** | ITIP | Numeric | 18 digits | Individual Trade Item Piece |
| **8010** | CPID | Alphanumeric | 1-30 chars | Component/Part Identifier |
| **253** | GDTI | Numeric | 13-30 digits | Global Document Type Identifier |

#### Qualifier Identifiers (Optional)

| AI | Name | Format | Length | Description |
|----|------|--------|--------|-------------|
| **21** | Serial | Alphanumeric | 1-20 chars | Serial number (item-level uniqueness) |
| **10** | Batch/Lot | Alphanumeric | 1-20 chars | Batch or lot number |
| **17** | Expiry Date | Numeric | 6 digits | Expiration date (YYMMDD) |
| **3103** | Net Weight | Numeric | 6 digits | Net weight in grams |

### 3.2 AI 01: GTIN (Global Trade Item Number)

The primary identifier for products.

**Format:** 14 numeric digits (GTIN-14)

**Structure:**
```
GTIN-14 = [Indicator Digit][GS1 Company Prefix][Item Reference][Check Digit]
          1 digit          7-10 digits         2-5 digits      1 digit
```

**Normalization:** All GTINs (GTIN-8, GTIN-12, GTIN-13) MUST be normalized to 14 digits with leading zeros.

**URI Example:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123
```

### 3.3 AI 21: Serial Number

Provides item-level uniqueness when combined with GTIN.

**Format:** 1-20 alphanumeric characters

**Allowed Characters:** `A-Z`, `a-z`, `0-9`, `-`, `.`

**Pattern:** `[A-Za-z0-9\-\.]{1,20}`

**URI Example:**
```
https://id.galileoprotocol.io/01/09506000134352/21/HK-2024.A001
```

### 3.4 AI 10: Batch/Lot Number

Identifies a production batch or lot.

**Format:** 1-20 alphanumeric characters

**Allowed Characters:** `A-Z`, `a-z`, `0-9`, `-`, `.`

**URI Example:**
```
https://id.galileoprotocol.io/01/09506000134352/10/LOT2024-001
```

### 3.5 AI 17: Expiry Date

Product expiration date (primarily for materials/chemicals).

**Format:** 6 numeric digits (YYMMDD)

**Rules:**
- YY: Year (00-99, where 00-49 = 2000-2049, 50-99 = 1950-1999)
- MM: Month (01-12, or 00 for unspecified month)
- DD: Day (01-31, or 00 for last day of month or unspecified)

**URI Example:**
```
https://id.galileoprotocol.io/01/09506000134352/17/261231
```

### 3.6 AI 3103: Net Weight (Grams)

Net weight of the product in grams.

**Format:** 6 numeric digits (implied 3 decimal places)

**Example:** `001234` = 1.234 kg (1234 grams)

**URI Example:**
```
https://id.galileoprotocol.io/01/09506000134352/3103/000450
```

### 3.7 AI 8006: ITIP (Individual Trade Item Piece)

Identifies an individual piece within a set or multi-part product.

**Format:** 18 numeric digits (GTIN-14 + 4 digits for piece/total)

**Structure:**
```
ITIP = [GTIN-14][Piece Number][Total Pieces]
       14 digits  2 digits      2 digits
```

**URI Example:**
```
https://id.galileoprotocol.io/8006/095060001343520102/21/SET001
```
(GTIN 09506000134352, Piece 01 of 02)

### 3.8 AI 8010: CPID (Component/Part Identifier)

Identifies components or parts within a product.

**Format:** 1-30 alphanumeric characters

**URI Example:**
```
https://id.galileoprotocol.io/8010/0614141123452/21/BUCKLE-001
```

### 3.9 AI 253: GDTI (Global Document Type Identifier)

Identifies documents such as certificates of authenticity.

**Format:** 13-30 numeric digits (GS1 Company Prefix + Document Type + Serial)

**URI Example:**
```
https://id.galileoprotocol.io/253/4000001123457AUTH2024001
```

---

## 4. GTIN Normalization

### 4.1 Normalization Rules

All GTINs MUST be normalized to 14 digits before storage, comparison, or URI construction.

**Rules:**
1. Remove all whitespace and non-numeric characters
2. Validate that remaining string is numeric
3. Pad with leading zeros to reach 14 digits
4. Validate check digit using Modulo-10 algorithm
5. Store and use only the 14-digit normalized form

### 4.2 Normalization Examples

| Input Format | Input Value | Normalized GTIN-14 |
|--------------|-------------|-------------------|
| GTIN-8 | `12345670` | `00000012345670` |
| GTIN-12 (UPC-A) | `012345678905` | `00012345678905` |
| GTIN-13 (EAN-13) | `9506000134352` | `09506000134352` |
| GTIN-14 | `09506000134352` | `09506000134352` |

### 4.3 Check Digit Validation

The GS1 Modulo-10 algorithm (weight-3) validates GTIN integrity.

**Algorithm:**

```
Given GTIN: d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 [check]

1. Starting from the rightmost digit (excluding check digit):
   - Multiply alternating digits by 3 and 1
   - Weight pattern (right to left): 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3

2. Sum all weighted values

3. Check digit = (10 - (sum mod 10)) mod 10
```

**Example Calculation:**

```
GTIN-14: 0 9 5 0 6 0 0 0 1 3 4 3 5 [?]

Position:  1  2  3  4  5  6  7  8  9 10 11 12 13
Digit:     0  9  5  0  6  0  0  0  1  3  4  3  5
Weight:    3  1  3  1  3  1  3  1  3  1  3  1  3
Product:   0  9 15  0 18  0  0  0  3  3 12  3 15

Sum = 0 + 9 + 15 + 0 + 18 + 0 + 0 + 0 + 3 + 3 + 12 + 3 + 15 = 78
Check digit = (10 - (78 mod 10)) mod 10 = (10 - 8) mod 10 = 2

GTIN-14: 09506000134352 (check digit = 2)
```

### 4.4 Normalization Implementation

```typescript
/**
 * Normalize a GTIN to 14 digits per GS1 Digital Link 1.6.0
 *
 * @param gtin - Input GTIN (8, 12, 13, or 14 digits)
 * @returns Normalized 14-digit GTIN
 * @throws Error if GTIN is invalid
 */
function normalizeGTIN(gtin: string): string {
  // Remove whitespace and validate
  const cleaned = gtin.replace(/\s/g, '');

  if (!/^\d+$/.test(cleaned)) {
    throw new Error('GTIN must contain only numeric digits');
  }

  if (cleaned.length > 14) {
    throw new Error(`Invalid GTIN length: ${cleaned.length}`);
  }

  // Pad to 14 digits
  const normalized = cleaned.padStart(14, '0');

  // Validate check digit
  if (!validateCheckDigit(normalized)) {
    throw new Error('Invalid GTIN check digit');
  }

  return normalized;
}

/**
 * Validate GTIN check digit using GS1 Modulo-10 algorithm
 */
function validateCheckDigit(gtin14: string): boolean {
  const digits = gtin14.split('').map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const weight = (13 - i) % 2 === 0 ? 1 : 3;
    sum += digits[i] * weight;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}

/**
 * Calculate check digit for a 13-digit GTIN prefix
 */
function calculateCheckDigit(gtin13: string): number {
  const digits = gtin13.split('').map(Number);

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const weight = (13 - i) % 2 === 0 ? 1 : 3;
    sum += digits[i] * weight;
  }

  return (10 - (sum % 10)) % 10;
}
```

---

## 5. URI Compression

### 5.1 Overview

GS1 Digital Link 1.6.0 supports URI compression for environments with limited storage (small QR codes, NFC tags with restricted memory).

**Compression Indicator:** Compressed URIs use a binary encoding format prefixed with a compression indicator.

### 5.2 Compression Format

Compressed URIs follow this structure:

```
[Compression Header][Encoded AIs and Values]
```

**Header Structure:**
- Byte 0: Format indicator (`0x00` for standard compression)
- Byte 1: URI scheme indicator (`0x04` for `https://`)
- Bytes 2-n: Encoded domain and path

### 5.3 When to Use Compression

| Scenario | Recommendation |
|----------|----------------|
| Small QR codes (< 100 modules) | Use compression |
| NFC tags with < 512 bytes | Use compression |
| Standard QR codes | Full URI preferred |
| URLs for humans | Full URI required |

### 5.4 Decompression

The Galileo resolver automatically detects and decompresses compressed URIs:

1. Detect compression by header byte
2. Extract encoded domain, verify against `id.galileoprotocol.io`
3. Decode Application Identifiers and values
4. Reconstruct full URI for internal processing

**Note:** Compressed URI decompression is handled transparently. All internal processing uses the uncompressed canonical form.

### 5.5 Compression Reference

Full compression algorithm details are specified in:
- GS1 Digital Link Standard 1.6.0, Section 7 (URI Compression)
- GS1 Digital Link Toolkit reference implementation

---

## 6. URI to DID Mapping

### 6.1 Mapping Rules

GS1 Digital Link URIs map bidirectionally to `did:galileo` identifiers.

**Mapping Pattern:**
```
GS1 URI:    https://id.galileoprotocol.io/{ai}/{value}[/{ai2}/{value2}]
did:galileo: did:galileo:{ai}:{value}[:{ai2}:{value2}]
```

**DID-Supported Application Identifiers:**

Only the following AIs are included in the `did:galileo` mapping:

| AI | Included in DID | Rationale |
|----|-----------------|-----------|
| **01** | Yes | Primary GTIN identifier |
| **8006** | Yes | ITIP for pieces/sets |
| **8010** | Yes | Component identifier |
| **253** | Yes | Document identifier |
| **21** | Yes | Serial number (uniqueness) |
| **10** | **No** | Batch/lot (operational, not identity) |
| **17** | **No** | Expiry date (mutable, not identity) |
| **3103** | **No** | Net weight (mutable, not identity) |

**Note:** Qualifiers like AI 10 (batch), AI 17 (expiry), and AI 3103 (weight) are valid in GS1 Digital Link URIs for routing and display purposes, but are NOT included in `did:galileo` identifiers. These AIs represent mutable operational data rather than immutable product identity.

**Transformation Rules:**
1. Remove `https://id.galileoprotocol.io/` prefix
2. Remove non-identity AIs (10, 17, 3103) from path
3. Replace `/` path separators with `:` colons
4. Prepend `did:galileo:`
5. Strip query parameters (not part of DID)

### 6.2 Mapping Examples

| GS1 Digital Link URI | did:galileo DID |
|---------------------|-----------------|
| `https://id.galileoprotocol.io/01/09506000134352/21/ABC123` | `did:galileo:01:09506000134352:21:ABC123` |
| `https://id.galileoprotocol.io/01/09506000134352` | `did:galileo:01:09506000134352` |
| `https://id.galileoprotocol.io/8006/095060001343520102/21/SET001` | `did:galileo:8006:095060001343520102:21:SET001` |
| `https://id.galileoprotocol.io/253/4000001123457AUTH001` | `did:galileo:253:4000001123457AUTH001` |

### 6.3 Bidirectional Conversion

**GS1 URI to DID:**

```typescript
function gs1UriToDid(uri: string): string {
  const url = new URL(uri);

  if (url.hostname !== 'id.galileoprotocol.io') {
    throw new Error('Not a Galileo GS1 Digital Link');
  }

  // Remove leading slash and convert path to DID format
  const path = url.pathname.slice(1);  // Remove leading /
  const didSpecific = path.replace(/\//g, ':');

  return `did:galileo:${didSpecific}`;
}
```

**DID to GS1 URI:**

```typescript
function didToGs1Uri(did: string): string {
  if (!did.startsWith('did:galileo:')) {
    throw new Error('Not a did:galileo identifier');
  }

  // Extract method-specific ID
  const specificId = did.slice('did:galileo:'.length);

  // Convert to path format
  const path = specificId.replace(/:/g, '/');

  return `https://id.galileoprotocol.io/${path}`;
}
```

### 6.4 Reference

See [DID-METHOD.md](../identity/DID-METHOD.md) for complete `did:galileo` specification.

---

## 7. Query Parameters

### 7.1 Supported Parameters

The Galileo resolver supports the following query parameters:

| Parameter | Values | Description |
|-----------|--------|-------------|
| `linkType` | GS1 or Galileo link type URI, or `linkset` | Requested resource type |
| `context` | `consumer`, `brand`, `regulator`, `service_center` | Requester context hint |
| `lang` | BCP 47 language tag | Preferred response language |

### 7.2 linkType Parameter

Specifies the type of resource to return.

**GS1 Standard Link Types:**

| Value | Full URI | Description |
|-------|----------|-------------|
| `gs1:pip` | `https://gs1.org/voc/pip` | Product Information Page |
| `gs1:sustainabilityInfo` | `https://gs1.org/voc/sustainabilityInfo` | Environmental/sustainability data |
| `gs1:instructions` | `https://gs1.org/voc/instructions` | Care/usage instructions |
| `gs1:regulatoryInfo` | `https://gs1.org/voc/regulatoryInfo` | Regulatory compliance data |
| `gs1:traceability` | `https://gs1.org/voc/traceability` | Supply chain events |
| `gs1:certificationInfo` | `https://gs1.org/voc/certificationInfo` | Product certifications |
| `gs1:hasRetailers` | `https://gs1.org/voc/hasRetailers` | Authorized retailers |
| `gs1:defaultLink` | `https://gs1.org/voc/defaultLink` | Default target |
| `linkset` | N/A | Return all available links |

**Galileo Custom Link Types:**

| Value | Full URI | Description |
|-------|----------|-------------|
| `galileo:authenticity` | `https://vocab.galileoprotocol.io/authenticity` | Verification proof |
| `galileo:internalDPP` | `https://vocab.galileoprotocol.io/internalDPP` | Complete DPP (brand only) |
| `galileo:auditTrail` | `https://vocab.galileoprotocol.io/auditTrail` | Full event history |
| `galileo:serviceInfo` | `https://vocab.galileoprotocol.io/serviceInfo` | Service/repair data |
| `galileo:technicalSpec` | `https://vocab.galileoprotocol.io/technicalSpec` | Technical specifications |
| `galileo:complianceDPP` | `https://vocab.galileoprotocol.io/complianceDPP` | ESPR mandatory fields |
| `galileo:espr` | `https://vocab.galileoprotocol.io/espr` | ESPR compliance bundle |

**Example:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:pip
```

### 7.3 context Parameter

Hints the requester's role for response selection.

**Values:**

| Value | Description | Typical Use |
|-------|-------------|-------------|
| `consumer` | End consumer (default) | Public product information |
| `brand` | Brand owner | Full DPP access (requires auth) |
| `regulator` | Regulatory authority | ESPR compliance view (requires auth) |
| `service_center` | Authorized service | Repair/technical data (requires auth) |

**Note:** `context` is a hint. Privileged contexts require JWT authentication for actual access.

**Example:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123?context=regulator
```

### 7.4 lang Parameter

Specifies preferred response language(s).

**Format:** BCP 47 language tag

**Common Values:** `en`, `fr`, `zh`, `ja`, `de`, `it`, `es`

**Example:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:pip&lang=fr
```

### 7.5 Parameter Combinations

Parameters can be combined:

```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:sustainabilityInfo&context=consumer&lang=en
```

---

## 8. Validation Rules

### 8.1 URI Syntax Validation

```typescript
/**
 * Validate GS1 Digital Link URI syntax
 *
 * @returns true if valid, throws Error with details if invalid
 */
function validateGS1DigitalLinkURI(uri: string): boolean {
  const url = new URL(uri);

  // Validate domain
  if (url.hostname !== 'id.galileoprotocol.io') {
    throw new URIValidationError('INVALID_DOMAIN', 'Domain must be id.galileoprotocol.io');
  }

  // Validate scheme
  if (url.protocol !== 'https:') {
    throw new URIValidationError('INVALID_SCHEME', 'Scheme must be https');
  }

  // Parse path segments
  const segments = url.pathname.slice(1).split('/');

  if (segments.length < 2) {
    throw new URIValidationError('MISSING_IDENTIFIER', 'URI must include AI and value');
  }

  // Validate primary AI
  const primaryAI = segments[0];
  if (!['01', '8006', '8010', '253'].includes(primaryAI)) {
    throw new URIValidationError('INVALID_PRIMARY_AI', `Unsupported primary AI: ${primaryAI}`);
  }

  // Validate based on AI type
  validateAIValue(primaryAI, segments[1]);

  // Validate qualifiers
  for (let i = 2; i < segments.length; i += 2) {
    if (i + 1 >= segments.length) {
      throw new URIValidationError('INCOMPLETE_QUALIFIER', 'Qualifier AI without value');
    }
    validateAIValue(segments[i], segments[i + 1]);
  }

  return true;
}
```

### 8.2 GTIN Validation

```typescript
const GTIN_REGEX = /^\d{14}$/;

function validateGTIN(gtin: string): void {
  if (!GTIN_REGEX.test(gtin)) {
    throw new URIValidationError('INVALID_GTIN_FORMAT', 'GTIN must be exactly 14 digits');
  }

  if (!validateCheckDigit(gtin)) {
    throw new URIValidationError('INVALID_GTIN_CHECK_DIGIT', 'GTIN check digit validation failed');
  }
}
```

### 8.3 Serial Number Validation

```typescript
const SERIAL_REGEX = /^[A-Za-z0-9\-\.]{1,20}$/;

function validateSerial(serial: string): void {
  if (!SERIAL_REGEX.test(serial)) {
    throw new URIValidationError(
      'INVALID_SERIAL',
      'Serial must be 1-20 alphanumeric characters (including - and .)'
    );
  }
}
```

### 8.4 Error Response Format

Invalid URIs return HTTP 400 with structured error:

```json
{
  "error": "invalidIdentifier",
  "errorCode": "INVALID_GTIN_CHECK_DIGIT",
  "message": "GTIN check digit validation failed",
  "uri": "https://id.galileoprotocol.io/01/09506000134353/21/ABC123",
  "details": {
    "ai": "01",
    "value": "09506000134353",
    "expectedCheckDigit": 2,
    "receivedCheckDigit": 3
  }
}
```

### 8.5 Validation Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_DOMAIN` | 400 | URI domain is not id.galileoprotocol.io |
| `INVALID_SCHEME` | 400 | URI scheme is not HTTPS |
| `MISSING_IDENTIFIER` | 400 | No AI/value pair in URI |
| `INVALID_PRIMARY_AI` | 400 | Primary AI not supported |
| `INVALID_GTIN_FORMAT` | 400 | GTIN not 14 digits |
| `INVALID_GTIN_CHECK_DIGIT` | 400 | Check digit validation failed |
| `INVALID_SERIAL` | 400 | Serial format invalid |
| `INCOMPLETE_QUALIFIER` | 400 | Qualifier AI without value |
| `UNSUPPORTED_AI` | 400 | Application Identifier not supported |

---

## 9. QR Code and NFC Encoding

### 9.1 QR Code Encoding

GS1 Digital Link URIs encode directly into QR codes.

**Requirements:**
- Error correction: Level M (15%) minimum, Level Q (25%) recommended for luxury items
- Quiet zone: 4 modules minimum
- Module size: Adequate for scanning environment

**Example QR Data:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123
```

**QR Code Versions by URI Length:**

| URI Length | QR Version | Capacity (Alphanumeric) |
|------------|------------|------------------------|
| < 47 chars | Version 2 | 47 chars |
| < 77 chars | Version 3 | 77 chars |
| < 114 chars | Version 4 | 114 chars |
| < 154 chars | Version 5 | 154 chars |

### 9.2 NFC Encoding

For NFC tags, use NDEF URI Record format.

**NDEF Structure:**
```
[TNF=0x01][Type="U"][Payload=compressed_uri]
```

**URI Identifier Codes:**
- `0x04`: `https://` (recommended)
- `0x03`: `http://` (not recommended)

**Payload:**
```
[URI Identifier Code: 0x04][URI without scheme: id.galileoprotocol.io/01/...]
```

### 9.3 Tag Recommendations

| Tag Type | Memory | Recommended For |
|----------|--------|-----------------|
| NFC Type 2 (NTAG213) | 144 bytes | Compressed URIs |
| NFC Type 2 (NTAG215) | 504 bytes | Full URIs |
| NFC Type 4 | 2-32 KB | Multiple records |

### 9.4 Encoding Best Practices

1. **Use HTTPS:** Always encode with `https://` scheme
2. **Compress when necessary:** For QR codes below Version 3, consider compression
3. **Test scanning:** Verify scannability in target environment
4. **Redundancy:** Include both QR and NFC where possible
5. **Durability:** Use laser-etched QR for permanent products

---

## 10. Examples

### 10.1 Valid URI Examples

**Basic Product (GTIN + Serial):**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123
```
Maps to: `did:galileo:01:09506000134352:21:ABC123`

**Product with Batch:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123/10/LOT2024
```
Maps to: `did:galileo:01:09506000134352:21:ABC123`

**Product with Expiry:**
```
https://id.galileoprotocol.io/01/09506000134352/17/261231
```
Maps to: `did:galileo:01:09506000134352`

**Set Piece (ITIP):**
```
https://id.galileoprotocol.io/8006/095060001343520102/21/SET001
```
Maps to: `did:galileo:8006:095060001343520102:21:SET001`

**Component (CPID):**
```
https://id.galileoprotocol.io/8010/0614141123452/21/BUCKLE-001
```
Maps to: `did:galileo:8010:0614141123452:21:BUCKLE-001`

**Certificate (GDTI):**
```
https://id.galileoprotocol.io/253/4000001123457AUTH2024001
```
Maps to: `did:galileo:253:4000001123457AUTH2024001`

**With Query Parameters:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:pip&lang=fr
```

**Linkset Request:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=linkset
```

### 10.2 Invalid URI Examples

**Invalid Check Digit:**
```
https://id.galileoprotocol.io/01/09506000134353/21/ABC123
                              ^^^^^^^^^^^^^^ Check digit 3 should be 2
Error: INVALID_GTIN_CHECK_DIGIT
```

**Wrong GTIN Length:**
```
https://id.galileoprotocol.io/01/950600013435/21/ABC123
                            ^^^^^^^^^^^^^ Only 12 digits (must be 14)
Error: INVALID_GTIN_FORMAT
```

**Invalid Serial Characters:**
```
https://id.galileoprotocol.io/01/09506000134352/21/ABC@123
                                              ^^^^^^^ @ not allowed
Error: INVALID_SERIAL
```

**Missing Qualifier Value:**
```
https://id.galileoprotocol.io/01/09506000134352/21
                                            ^^ AI 21 without serial value
Error: INCOMPLETE_QUALIFIER
```

**Unsupported AI:**
```
https://id.galileoprotocol.io/91/123456789012/21/ABC123
                           ^^ AI 91 not supported
Error: UNSUPPORTED_AI
```

### 10.3 GTIN Normalization Examples

| Input | Type | Normalized GTIN-14 | Valid |
|-------|------|-------------------|-------|
| `12345670` | GTIN-8 | `00000012345670` | Yes |
| `012345678905` | GTIN-12 | `00012345678905` | Yes |
| `9506000134352` | GTIN-13 | `09506000134352` | Yes |
| `09506000134352` | GTIN-14 | `09506000134352` | Yes |
| `9506000134353` | GTIN-13 | N/A | No (bad check digit) |
| `123456` | Invalid | N/A | No (too short) |

---

## Appendix A: Reference Implementation

For reference resolver implementation, see:
- GS1 Digital Link Toolkit: https://github.com/gs1/GS1_DigitalLink_Resolver_CE
- Galileo Resolver: `galileo-resolver` package

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [DID-METHOD.md](../identity/DID-METHOD.md) | DID syntax and resolution |
| [gs1-integration.md](../schemas/alignment/gs1-integration.md) | GS1 integration patterns |
| [linkset-schema.json](./linkset-schema.json) | Linkset response schema |
| [GS1 Digital Link 1.6.0](https://ref.gs1.org/standards/digital-link/) | Base standard |
| [RFC 9264](https://datatracker.ietf.org/doc/rfc9264/) | Linkset format |

---

*Galileo Luxury Standard - Resolver Layer*
*Specification: GSPEC-RESOLVER-001*
*Classification: Public*
