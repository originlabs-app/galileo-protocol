# GS1-Conformant Resolution Protocol Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-RESOLVER-002
**GS1 Conformant Resolver Version:** 1.2.0 (January 2026)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Resolution Architecture](#2-resolution-architecture)
3. [Resolution Algorithm](#3-resolution-algorithm)
4. [HTTP Interface](#4-http-interface)
5. [Response Types](#5-response-types)
6. [Deactivated Product Handling](#6-deactivated-product-handling)
7. [Caching Strategy](#7-caching-strategy)
8. [Error Handling](#8-error-handling)
9. [Integration Points](#9-integration-points)

---

## 1. Overview

### 1.1 Purpose

This specification defines the complete resolution protocol for the Galileo GS1-conformant resolver at `id.galileoprotocol.io`. The resolver bridges physical product identifiers (encoded in QR codes, NFC tags) to digital identities, enabling ESPR-mandated Digital Product Passport access with context-aware routing.

The resolution protocol:
- Connects physical products to their digital twins
- Routes requests to appropriate data based on requester context
- Integrates with on-chain DID registry and off-chain DPP storage
- Supports ESPR tiered stakeholder access requirements

### 1.2 Conformance

This specification conforms to:
- **GS1-Conformant Resolver Standard 1.2.0** (January 2026)
- **GS1 Digital Link Standard 1.6.0** (April 2025)
- **IETF RFC 9264** (Linkset format)
- **W3C DID Core v1.0** (DID resolution)

References:
- [GS1 Digital Link URI Specification](./digital-link-uri.md)
- [Linkset Schema](./linkset-schema.json)
- [did:galileo Method Specification](../identity/DID-METHOD.md)
- [Hybrid Architecture](../architecture/hybrid-architecture.md)

### 1.3 Scope

This specification covers:
- Resolution algorithm (8 steps)
- HTTP interface and endpoints
- Response types (redirect, linkset, error)
- Deactivated product handling
- Caching strategy
- Integration with Galileo infrastructure

### 1.4 ESPR Mandate

The EU Ecodesign for Sustainable Products Regulation (ESPR) 2024/1781 requires:
- Digital Product Passports accessible via data carriers
- Machine-readable data in interoperable formats
- Tiered access for different stakeholders
- Accessibility throughout product lifecycle

This resolution protocol fulfills these requirements by providing context-aware access to product data.

---

## 2. Resolution Architecture

### 2.1 High-Level Flow

```
                              +-------------------+
                              |                   |
[QR Code/NFC Tag] -----> [GS1 Digital Link URI]  |
                              |                   |
                              v                   |
                     +------------------+         |
                     |  Galileo Resolver |        |
                     |  (id.galileoprotocol.io)       |
                     +------------------+         |
                              |                   |
         +--------------------+--------------------+
         |                    |                    |
         v                    v                    v
   +-----------+        +-----------+        +-----------+
   | Parse URI |        |  Detect   |        |   Auth    |
   | (Step 1-2)|        |  Context  |        |   Check   |
   |           |        | (Step 3)  |        | (Step 3)  |
   +-----------+        +-----------+        +-----------+
         |                    |                    |
         +--------------------+--------------------+
                              |
                              v
                     +------------------+
                     | Build Galileo DID |
                     |    (Step 4)       |
                     +------------------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
      +----------------+              +----------------+
      |   On-Chain     |              |   Off-Chain    |
      |   Registry     |              |   DPP Store    |
      | (ProductRecord)|              | (DID Document) |
      |   (Step 5)     |              |   (Step 6)     |
      +----------------+              +----------------+
              |                               |
              +---------------+---------------+
                              |
                              v
                     +------------------+
                     | Build Linkset    |
                     | Response (Step 7)|
                     +------------------+
                              |
                              v
                     +------------------+
                     | 307 Redirect or  |
                     | Linkset (Step 8) |
                     +------------------+
```

### 2.2 Components

| Component | Role | Data Source |
|-----------|------|-------------|
| **GS1 URI Parser** | Parse and validate incoming URIs | Request URL |
| **Context Detector** | Determine requester role and permissions | JWT, query params, headers |
| **DID Builder** | Construct `did:galileo` from GS1 identifiers | Parsed URI components |
| **On-Chain Registry** | Authoritative product metadata | Blockchain (contentHash, controller, active) |
| **Off-Chain Store** | Full DID document and DPP content | IPFS/S3/Azure Blob |
| **Linkset Builder** | Construct RFC 9264 linkset response | DID document services |

### 2.3 Domain Architecture

| Domain | Purpose | URL |
|--------|---------|-----|
| `id.galileoprotocol.io` | GS1 Digital Link resolver | Primary entry point for QR/NFC |
| `resolver.galileoprotocol.io` | Service endpoint host | DPP, events, verification endpoints |
| `auth.galileoprotocol.io` | Authentication service | JWT issuance, JWKS |

---

## 3. Resolution Algorithm

The Galileo resolver implements an 8-step resolution algorithm per GS1-Conformant Resolver Standard 1.2.0 with Galileo-specific extensions.

### 3.1 Step 1: Parse GS1 Digital Link URI

**Input:** Raw request URL
**Output:** Parsed URI components or error

```typescript
interface ParsedGS1URI {
  primaryAI: string;        // "01", "8006", "8010", "253"
  primaryValue: string;     // GTIN, ITIP, CPID, or GDTI
  qualifiers: {
    ai: string;
    value: string;
  }[];
  queryParams: {
    linkType?: string;
    context?: string;
    lang?: string;
  };
}

function parseGS1DigitalLink(uri: string): ParsedGS1URI | null {
  // Validate domain is id.galileoprotocol.io
  // Extract path segments as AI/value pairs
  // Parse query parameters
  // Reference: digital-link-uri.md Section 2
}
```

**Error Conditions:**
- Invalid domain: Return 400 `INVALID_DOMAIN`
- Malformed path: Return 400 `INVALID_PATH`
- Missing primary identifier: Return 400 `MISSING_IDENTIFIER`

### 3.2 Step 2: Validate Identifiers

**Input:** Parsed URI components
**Output:** Validated identifiers or error

**Validation Rules:**

| Identifier | Validation |
|------------|------------|
| GTIN (AI 01) | 14 digits, valid Modulo-10 check digit |
| Serial (AI 21) | 1-20 alphanumeric chars, pattern `[A-Za-z0-9\-\.]+` |
| ITIP (AI 8006) | 18 digits (GTIN-14 + piece/total) |
| CPID (AI 8010) | 1-30 alphanumeric chars |
| GDTI (AI 253) | 13-30 digits |

```typescript
function validateIdentifiers(parsed: ParsedGS1URI): ValidationResult {
  // Normalize GTIN to 14 digits
  const normalizedGTIN = normalizeGTIN(parsed.primaryValue);

  // Validate check digit
  if (!validateCheckDigit(normalizedGTIN)) {
    return { valid: false, error: "INVALID_GTIN_CHECK_DIGIT" };
  }

  // Validate serial if present
  if (parsed.qualifiers.find(q => q.ai === "21")) {
    const serial = parsed.qualifiers.find(q => q.ai === "21").value;
    if (!SERIAL_REGEX.test(serial)) {
      return { valid: false, error: "INVALID_SERIAL" };
    }
  }

  return { valid: true, normalizedGTIN };
}
```

**Reference:** [digital-link-uri.md Section 4](./digital-link-uri.md#4-gtin-normalization)

### 3.3 Step 3: Detect Requester Context

**Input:** Request headers, query parameters, JWT token
**Output:** Requester context (role, authentication status, permissions)

**Priority Order (highest to lowest):**

1. **JWT role claim** - Authenticated role from valid token
2. **linkType parameter** - Specific link type implies required role
3. **context parameter** - Explicit context hint (requires auth for non-consumer)
4. **Accept header** - Content negotiation hint
5. **Default** - Consumer role (public view)

```typescript
type RequesterRole = "consumer" | "brand" | "regulator" | "service_center";

interface RequesterContext {
  role: RequesterRole;
  authenticated: boolean;
  identity?: string;          // Subject DID if authenticated
  brandDID?: string;          // For brand role
  jurisdiction?: string;      // For regulator role
  serviceTypes?: string[];    // For service_center role
}

async function detectContext(
  authHeader: string | null,
  linkType: string | null,
  contextParam: string | null,
  acceptHeader: string | null
): Promise<RequesterContext> {
  // Priority 1: JWT authentication
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const claims = await verifyJWT(token);
    if (claims) {
      return {
        role: claims.role as RequesterRole,
        authenticated: true,
        identity: claims.sub,
        brandDID: claims.brand_did,
        jurisdiction: claims.jurisdiction,
        serviceTypes: claims.service_types
      };
    }
  }

  // Priority 2-5: See context-routing.md
  // ...

  // Default: Consumer (public)
  return { role: "consumer", authenticated: false };
}
```

**Reference:** [context-routing.md](./context-routing.md)

### 3.4 Step 4: Build Galileo DID

**Input:** Validated identifiers
**Output:** `did:galileo` identifier string

**Mapping Pattern:**
```
GS1 URI:     https://id.galileoprotocol.io/{ai}/{value}/{ai2}/{value2}
did:galileo: did:galileo:{ai}:{value}:{ai2}:{value2}
```

**Examples:**

| GS1 Digital Link URI | did:galileo DID |
|---------------------|-----------------|
| `/01/09506000134352/21/ABC123` | `did:galileo:01:09506000134352:21:ABC123` |
| `/01/09506000134352` | `did:galileo:01:09506000134352` |
| `/8006/095060001343520102/21/SET001` | `did:galileo:8006:095060001343520102:21:SET001` |

```typescript
function buildGalileoDID(parsed: ParsedGS1URI, normalizedGTIN: string): string {
  let did = `did:galileo:${parsed.primaryAI}:${normalizedGTIN}`;

  for (const qualifier of parsed.qualifiers) {
    did += `:${qualifier.ai}:${qualifier.value}`;
  }

  return did;
}
```

**Reference:** [DID-METHOD.md Section 2](../identity/DID-METHOD.md#2-method-syntax)

### 3.5 Step 5: Query On-Chain Registry

**Input:** Galileo DID
**Output:** ProductRecord (controller, contentHash, active status)

```typescript
interface ProductRecord {
  didHash: string;           // keccak256 of normalized DID
  controller: string;        // Brand ONCHAINID address
  contentHash: string;       // SHA-256 of off-chain document
  createdAt: number;         // Block timestamp
  updatedAt: number;         // Last modification timestamp
  active: boolean;           // false = decommissioned
  deactivationReason?: string;
}

async function queryRegistry(did: string): Promise<ProductRecord | null> {
  // Normalize DID per DID-METHOD.md Section 2.6:
  // - Lowercase method portion (did:galileo:)
  // - Preserve AI values and serial case (serials are case-sensitive)
  const normalizedDID = normalizeDID(did);
  const didHash = keccak256(normalizedDID);
  const record = await productRegistry.getRecord(didHash);

  if (record.createdAt === 0) {
    return null;  // Not registered
  }

  return record;
}
```

**DID Normalization:**

Per [DID-METHOD.md Section 2.6](../identity/DID-METHOD.md#26-normalization):

```typescript
function normalizeDID(did: string): string {
  // Extract method prefix (case-insensitive)
  const match = did.match(/^(did:galileo:)(.*)$/i);
  if (!match) throw new Error("Invalid did:galileo format");

  const identifier = match[2];
  const parts = identifier.split(":");
  const entityTypes = new Set([
    "brand",
    "retailer",
    "issuer",
    "artisan",
    "verifier",
    "customer",
    "regulator"
  ]);

  // Entity DID: normalize entity type + name to lowercase
  const possibleEntityType = parts[0].toLowerCase();
  if (entityTypes.has(possibleEntityType) && parts.length >= 2) {
    const entityName = parts.slice(1).join(":").toLowerCase();
    return `did:galileo:${possibleEntityType}:${entityName}`;
  }

  // Product DID: preserve identifier case (serials are case-sensitive per GS1)
  return `did:galileo:${identifier}`;
}
```

**Error Conditions:**
- Record not found: Return 404 `notFound`
- Registry unavailable: Return 503 `serviceUnavailable`

### 3.6 Step 6: Fetch Off-Chain DID Document

**Input:** contentHash from ProductRecord
**Output:** Full DID document with service endpoints

```typescript
interface DIDDocument {
  "@context": string[];
  id: string;                 // did:galileo:...
  controller: string;         // Brand DID
  alsoKnownAs?: string[];     // GS1 Digital Link URI
  verificationMethod?: object[];
  service: ServiceEndpoint[];
}

interface ServiceEndpoint {
  id: string;
  type: string;               // "GalileoDPP", "GS1DigitalLink", etc.
  serviceEndpoint: string;    // Target URL
}

async function fetchDIDDocument(contentHash: string): Promise<DIDDocument | null> {
  // Fetch from off-chain storage (IPFS, S3, etc.)
  const document = await offChainStore.get(contentHash);

  if (!document) {
    await logIntegrityAlert("content_missing", contentHash);
    return null;
  }

  // Verify content integrity
  const computedHash = sha256(canonicalizeJSON(document));
  if (computedHash !== contentHash) {
    await logIntegrityAlert("hash_mismatch", contentHash, computedHash);
    // Still return document, but flag for investigation
  }

  return document;
}
```

**Reference:** [hybrid-architecture.md](../architecture/hybrid-architecture.md)

### 3.7 Step 7: Select Links Based on Context

**Input:** DID document, requester context, linkType parameter
**Output:** Filtered linkset

```typescript
async function selectLinks(
  didDoc: DIDDocument,
  context: RequesterContext,
  linkType: string | null,
  preferredLanguages: string[]
): Promise<Link[]> {
  // Get all available links from DID document services
  const allLinks = buildLinksFromServices(didDoc);

  // Filter by role access permissions
  const allowedTypes = ROLE_LINK_TYPES[context.role];
  let filteredLinks = allLinks.filter(link =>
    allowedTypes.includes(link.rel)
  );

  // If specific linkType requested, filter further
  if (linkType && linkType !== "linkset") {
    filteredLinks = filteredLinks.filter(link =>
      link.rel === expandLinkType(linkType)
    );

    // If privileged link type without auth, return 401
    if (filteredLinks.length === 0 && isPrivilegedLinkType(linkType)) {
      throw new AuthenticationRequired(linkType);
    }
  }

  // Apply language preference
  filteredLinks = applyLanguagePreference(filteredLinks, preferredLanguages);

  return filteredLinks;
}
```

**Reference:** [context-routing.md](./context-routing.md) for ROLE_LINK_TYPES matrix

### 3.8 Step 8: Return Response

**Input:** Selected links, request parameters
**Output:** HTTP response (redirect or linkset)

**Decision Logic:**

```typescript
function buildResponse(
  links: Link[],
  linkType: string | null,
  acceptHeader: string | null,
  anchor: string,
  context: RequesterContext
): Response {
  // Return linkset if explicitly requested
  if (linkType === "linkset" || acceptHeader === "application/linkset+json") {
    return buildLinksetResponse(links, anchor, context);
  }

  // Single link: return 307 redirect
  if (links.length === 1) {
    return buildRedirectResponse(links[0], anchor, context);
  }

  // Multiple links matching: return linkset
  if (links.length > 1) {
    return buildLinksetResponse(links, anchor, context);
  }

  // No matching links: redirect to default
  const defaultLink = getDefaultLink(anchor);
  return buildRedirectResponse(defaultLink, anchor, context);
}
```

---

## 4. HTTP Interface

### 4.1 Primary Endpoint

**Product Resolution (GTIN + Serial):**
```
GET https://id.galileoprotocol.io/01/{gtin}/21/{serial}
```

**Product Resolution (GTIN only):**
```
GET https://id.galileoprotocol.io/01/{gtin}
```

**Component Resolution:**
```
GET https://id.galileoprotocol.io/8010/{cpid}/21/{serial}
```

**Document Resolution:**
```
GET https://id.galileoprotocol.io/253/{gdti}
```

### 4.2 Linkset Endpoint

Explicit linkset request:
```
GET https://id.galileoprotocol.io/01/{gtin}/21/{serial}?linkType=linkset
```

### 4.3 Well-Known Endpoint

Resolver metadata per GS1 standard:
```
GET https://id.galileoprotocol.io/.well-known/gs1resolver
```

Response:
```json
{
  "name": "Galileo Luxury Standard Resolver",
  "resolverRoot": "https://id.galileoprotocol.io",
  "supportedLinkTypes": [
    "https://gs1.org/voc/pip",
    "https://gs1.org/voc/sustainabilityInfo",
    "https://gs1.org/voc/instructions",
    "https://gs1.org/voc/traceability",
    "https://gs1.org/voc/certificationInfo",
    "https://vocab.galileoprotocol.io/authenticity",
    "https://vocab.galileoprotocol.io/internalDPP",
    "https://vocab.galileoprotocol.io/auditTrail",
    "https://vocab.galileoprotocol.io/serviceInfo"
  ],
  "supportedContextValues": ["consumer", "brand", "regulator", "service_center"],
  "supportsLinkset": true,
  "conformsTo": "https://ref.gs1.org/standards/resolver/1.2.0"
}
```

### 4.4 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Accept` | No | Content type preference (default: redirect) |
| `Accept-Language` | No | Language preference (BCP 47) |
| `Authorization` | No | Bearer token for authenticated access |

**Accept Header Values:**

| Value | Behavior |
|-------|----------|
| `*/*` or absent | 307 redirect to default link |
| `application/linkset+json` | Return full linkset |
| `text/html` | Redirect to HTML representation |
| `application/json` | Redirect to JSON representation |

### 4.5 Query Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `linkType` | GS1 or Galileo link type, or `linkset` | Specific resource type |
| `context` | `consumer`, `brand`, `regulator`, `service_center` | Context hint |
| `lang` | BCP 47 language tag | Language preference |

**Example Requests:**

```bash
# Default consumer redirect
curl https://id.galileoprotocol.io/01/09506000134352/21/ABC123

# Request linkset
curl "https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=linkset"

# Request specific link type
curl "https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:pip"

# Authenticated brand access
curl -H "Authorization: Bearer {jwt}" \
  "https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=galileo:internalDPP"

# Language preference
curl -H "Accept-Language: fr-FR, en;q=0.8" \
  "https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=gs1:instructions"
```

---

## 5. Response Types

### 5.1 Redirect Response (307 Temporary Redirect)

Default response when a single link matches.

**Response:**
```http
HTTP/1.1 307 Temporary Redirect
Location: https://resolver.galileoprotocol.io/dpp/09506000134352/ABC123
Link: <https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=linkset>; rel="linkset"
Cache-Control: public, max-age=300
```

**Why 307 (not 302 or 303):**
- 307 preserves HTTP method (POST stays POST)
- 302 may change method to GET (historical browser behavior)
- 303 explicitly changes to GET (informational redirect)

### 5.2 Linkset Response (200 OK)

Returned when `linkType=linkset` or multiple links match.

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/linkset+json
Cache-Control: public, max-age=300
```

**Body:**
```json
{
  "@context": {
    "@vocab": "http://www.iana.org/assignments/relation/",
    "anchor": "@id",
    "href": "@id",
    "linkset": "@graph",
    "gs1": "https://gs1.org/voc/",
    "galileo": "https://vocab.galileoprotocol.io/"
  },
  "linkset": [
    {
      "anchor": "https://id.galileoprotocol.io/01/09506000134352/21/ABC123",
      "itemDescription": "Birkin 25 Togo Gold",
      "https://gs1.org/voc/defaultLink": [
        {
          "href": "https://resolver.galileoprotocol.io/dpp/09506000134352/ABC123",
          "title": "Digital Product Passport",
          "type": "application/ld+json"
        }
      ],
      "https://gs1.org/voc/pip": [
        {
          "href": "https://resolver.galileoprotocol.io/pip/09506000134352/ABC123",
          "hreflang": ["en", "fr", "zh"],
          "title": "Product Information"
        }
      ],
      "https://gs1.org/voc/sustainabilityInfo": [
        {
          "href": "https://resolver.galileoprotocol.io/sustainability/09506000134352/ABC123",
          "title": "Sustainability Data"
        }
      ],
      "https://vocab.galileoprotocol.io/authenticity": [
        {
          "href": "https://resolver.galileoprotocol.io/verify/09506000134352/ABC123",
          "title": "Authenticity Verification"
        }
      ]
    }
  ]
}
```

**Reference:** [linkset-schema.json](./linkset-schema.json)

### 5.3 Error Responses

| Status | Code | When |
|--------|------|------|
| 400 | Bad Request | Invalid URI syntax, GTIN, or serial |
| 401 | Unauthorized | Privileged link type without valid auth |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Product not registered |
| 410 | Gone | Product deactivated (see Section 6) |
| 429 | Too Many Requests | Rate limit exceeded |
| 503 | Service Unavailable | Registry or storage unavailable |

---

## 6. Deactivated Product Handling

### 6.1 Deactivation vs Deletion

**Critical:** Products are NEVER deleted. Deactivation marks a product as no longer active while preserving full provenance history.

| State | HTTP Status | DID Resolvable | History Accessible |
|-------|-------------|----------------|-------------------|
| Active | 200/307 | Yes | Yes |
| Deactivated | 410 | Yes | Yes |
| Never existed | 404 | No | No |

### 6.2 Deactivation Response

**HTTP Response:**
```http
HTTP/1.1 410 Gone
Content-Type: application/json
```

**Body:**
```json
{
  "error": "deactivated",
  "message": "This product has been deactivated and is no longer active",
  "deactivationReason": "destroyed",
  "deactivatedAt": "2026-01-15T10:30:00Z",
  "did": "did:galileo:01:09506000134352:21:ABC123",
  "gs1Uri": "https://id.galileoprotocol.io/01/09506000134352/21/ABC123",
  "provenanceLink": "https://resolver.galileoprotocol.io/provenance/09506000134352/ABC123"
}
```

### 6.3 Deactivation Reasons

| Reason | Description | Provenance Impact |
|--------|-------------|-------------------|
| `destroyed` | Physical product destroyed | History preserved |
| `lost` | Product location unknown | History preserved |
| `recalled` | Manufacturer recall | Recall notice added |
| `counterfeit` | Identified as counterfeit | Original DID marked |
| `merged` | Merged into another DID | Redirect to new DID |
| `error` | Created in error | Marked as invalid |

### 6.4 Provenance After Deactivation

Deactivated products remain resolvable for provenance verification:

```bash
# Returns 410 with deactivation metadata
curl https://id.galileoprotocol.io/01/09506000134352/21/ABC123

# Provenance link still works
curl https://resolver.galileoprotocol.io/provenance/09506000134352/ABC123
```

---

## 7. Caching Strategy

### 7.1 Cache-Control by Response Type

| Response Type | Authentication | Cache-Control |
|---------------|----------------|---------------|
| Public consumer view | None | `public, max-age=300` |
| Authenticated view | JWT | `private, no-store` |
| Error (4xx) | Any | `no-cache, max-age=60` |
| Deactivated (410) | Any | `public, max-age=3600` |
| Linkset (public) | None | `public, max-age=300` |
| Linkset (authenticated) | JWT | `private, no-store` |

### 7.2 TTL by Content Type

| Content | TTL | Rationale |
|---------|-----|-----------|
| Product Information Page | 5 minutes | May update with promotions |
| Sustainability Data | 1 hour | Rarely changes |
| Care Instructions | 24 hours | Static content |
| Authenticity Status | 5 minutes | May change on verification |
| Audit Trail | No cache | Always fresh, authenticated |
| Deactivation Status | 1 hour | Permanent state |

### 7.3 Cache Headers

**Public Response:**
```http
Cache-Control: public, max-age=300
ETag: "abc123def456"
Vary: Accept, Accept-Language
```

**Authenticated Response:**
```http
Cache-Control: private, no-store
Pragma: no-cache
```

### 7.4 Cache Invalidation

**Event-Driven Invalidation:**

The resolver subscribes to on-chain events for real-time cache invalidation:

```solidity
event ProductUpdated(
    string indexed did,
    bytes32 previousHash,
    bytes32 newHash,
    uint256 timestamp
);

event ProductDeactivated(
    string indexed did,
    DeactivationReason reason,
    uint256 timestamp
);
```

On event receipt:
1. Extract DID from event
2. Invalidate all cached responses for that DID
3. Pre-warm cache with new data (optional)

### 7.5 Link Header

All responses include linkset reference:

```http
Link: <https://id.galileoprotocol.io/01/{gtin}/21/{serial}?linkType=linkset>; rel="linkset"
```

---

## 8. Error Handling

### 8.1 Error Response Schema

```json
{
  "error": "errorType",
  "errorCode": "SPECIFIC_ERROR_CODE",
  "message": "Human-readable description",
  "did": "did:galileo:...",
  "gs1Uri": "https://id.galileoprotocol.io/...",
  "details": {
    "field": "value",
    "expected": "value",
    "received": "value"
  }
}
```

### 8.2 Error Codes

| Error Type | Error Code | HTTP Status | Description |
|------------|------------|-------------|-------------|
| `invalidIdentifier` | `INVALID_DOMAIN` | 400 | Domain is not id.galileoprotocol.io |
| `invalidIdentifier` | `INVALID_SCHEME` | 400 | Scheme is not HTTPS |
| `invalidIdentifier` | `MISSING_IDENTIFIER` | 400 | No AI/value pair in URI |
| `invalidIdentifier` | `INVALID_PRIMARY_AI` | 400 | Unsupported primary AI |
| `invalidIdentifier` | `INVALID_GTIN_FORMAT` | 400 | GTIN not 14 digits |
| `invalidIdentifier` | `INVALID_GTIN_CHECK_DIGIT` | 400 | Check digit validation failed |
| `invalidIdentifier` | `INVALID_SERIAL` | 400 | Serial format invalid |
| `unauthorized` | `MISSING_TOKEN` | 401 | Authorization header required |
| `unauthorized` | `INVALID_TOKEN` | 401 | JWT validation failed |
| `unauthorized` | `EXPIRED_TOKEN` | 401 | JWT expired |
| `forbidden` | `INSUFFICIENT_ROLE` | 403 | Role cannot access link type |
| `forbidden` | `WRONG_BRAND` | 403 | Brand DID doesn't match product |
| `notFound` | `NOT_REGISTERED` | 404 | DID not in registry |
| `deactivated` | `PRODUCT_DEACTIVATED` | 410 | Product is deactivated |
| `rateLimited` | `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `serverError` | `REGISTRY_UNAVAILABLE` | 503 | On-chain registry error |
| `serverError` | `STORAGE_UNAVAILABLE` | 503 | Off-chain storage error |

### 8.3 Error Response Examples

**Invalid GTIN:**
```json
{
  "error": "invalidIdentifier",
  "errorCode": "INVALID_GTIN_CHECK_DIGIT",
  "message": "GTIN check digit validation failed",
  "gs1Uri": "https://id.galileoprotocol.io/01/09506000134353/21/ABC123",
  "details": {
    "ai": "01",
    "value": "09506000134353",
    "expectedCheckDigit": 2,
    "receivedCheckDigit": 3
  }
}
```

**Authentication Required:**
```json
{
  "error": "unauthorized",
  "errorCode": "MISSING_TOKEN",
  "message": "Authentication required for link type galileo:internalDPP",
  "gs1Uri": "https://id.galileoprotocol.io/01/09506000134352/21/ABC123",
  "details": {
    "requestedLinkType": "galileo:internalDPP",
    "requiredRole": "brand"
  }
}
```

**Insufficient Permissions:**
```json
{
  "error": "forbidden",
  "errorCode": "INSUFFICIENT_ROLE",
  "message": "Your role 'consumer' cannot access link type 'galileo:auditTrail'",
  "gs1Uri": "https://id.galileoprotocol.io/01/09506000134352/21/ABC123",
  "details": {
    "yourRole": "consumer",
    "requiredRole": ["brand", "regulator"],
    "requestedLinkType": "galileo:auditTrail"
  }
}
```

### 8.4 WWW-Authenticate Header

For 401 responses:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="galileo", error="invalid_token", error_description="JWT signature invalid"
```

---

## 9. Integration Points

### 9.1 On-Chain Token Registry

The resolver queries the Galileo product registry for authoritative metadata:

```typescript
interface ProductRegistryInterface {
  // Get product record by DID hash
  getRecord(didHash: bytes32): ProductRecord;

  // Check if product is active
  isActive(didHash: bytes32): boolean;

  // Get controller (brand) address
  getController(didHash: bytes32): address;
}
```

**Contract Address:** Configured via environment
**Network:** Polygon (mainnet/amoy)
**Caching:** 5 minutes for read operations

### 9.2 Off-Chain DPP Storage

The resolver fetches full DID documents from off-chain storage:

```typescript
interface OffChainStoreInterface {
  // Get document by content hash
  get(contentHash: string): DIDDocument | null;

  // Verify document exists
  exists(contentHash: string): boolean;
}
```

**Storage Options:**
- IPFS (content-addressed)
- Azure Blob Storage
- AWS S3

**Integrity:** SHA-256 hash verification against on-chain contentHash

### 9.3 ONCHAINID Consent Verification

For service center authorization:

```typescript
interface ONChAINIDInterface {
  // Check if identity has valid claim
  hasValidClaim(
    identity: address,
    claimTopic: uint256
  ): boolean;

  // Get claim data
  getClaim(
    identity: address,
    claimTopic: uint256
  ): ClaimData;
}
```

**Claim Topics:**
- `SERVICE_CENTER`: `0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2`
- `AUTHENTICATOR`: `0xda684ab89dbe929e1da9afb6a82d42762bb88db87f85e2041b5a2867ec6a6767`

**Reference:** [claim-topics.md](../identity/claim-topics.md)

### 9.4 Authentication Service

JWT issuance and validation:

```typescript
interface AuthServiceInterface {
  // Validate JWT and extract claims
  verifyToken(token: string): JWTClaims | null;

  // Get JWKS for signature verification
  getJWKS(): JWKS;
}
```

**Endpoint:** `https://auth.galileoprotocol.io/.well-known/jwks.json`
**Algorithms:** RS256, ES256 (asymmetric only)

**Reference:** [access-control.md](./access-control.md)

---

## Appendix A: Resolution Flow Examples

### Example 1: Consumer Scans Product QR Code

```
1. Consumer scans QR code on handbag
   URI: https://id.galileoprotocol.io/01/09506000134352/21/ABC123

2. Resolver parses URI
   - AI 01: GTIN = 09506000134352
   - AI 21: Serial = ABC123
   - No auth token, no context param

3. Context detection: consumer (default)

4. Build DID: did:galileo:01:09506000134352:21:ABC123

5. Query registry: ProductRecord found, active=true

6. Fetch DID document: 12 service endpoints

7. Filter links for consumer role: 4 links visible

8. Response: 307 redirect to gs1:defaultLink
   Location: https://resolver.galileoprotocol.io/dpp/09506000134352/ABC123
```

### Example 2: Brand Admin Requests Audit Trail

```
1. Brand system requests audit trail
   URI: https://id.galileoprotocol.io/01/09506000134352/21/ABC123?linkType=galileo:auditTrail
   Authorization: Bearer eyJhbGc...

2. Resolver parses URI and token

3. JWT validation succeeds
   - role: "brand"
   - brand_did: "did:galileo:brand:hermesparis"

4. Verify brand_did matches product controller

5. Context: brand (authenticated)

6. Build DID, query registry, fetch document

7. Filter links: auditTrail link visible for brand role

8. Response: 307 redirect to audit trail
   Location: https://resolver.galileoprotocol.io/audit/09506000134352/ABC123
   Cache-Control: private, no-store
```

### Example 3: Deactivated Product Resolution

```
1. Request for deactivated product
   URI: https://id.galileoprotocol.io/01/09506000134352/21/DESTROYED001

2. Parse and validate: OK

3. Query registry: ProductRecord found, active=false, reason="destroyed"

4. Response: 410 Gone
   {
     "error": "deactivated",
     "deactivationReason": "destroyed",
     "provenanceLink": "https://resolver.galileoprotocol.io/provenance/..."
   }
```

---

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [digital-link-uri.md](./digital-link-uri.md) | URI syntax and validation |
| [linkset-schema.json](./linkset-schema.json) | Linkset response schema |
| [context-routing.md](./context-routing.md) | Role-based view selection |
| [access-control.md](./access-control.md) | JWT authentication |
| [DID-METHOD.md](../identity/DID-METHOD.md) | DID resolution |
| [claim-topics.md](../identity/claim-topics.md) | ONCHAINID claims |
| [hybrid-architecture.md](../architecture/hybrid-architecture.md) | Data boundary |
| [GS1-Conformant Resolver 1.2.0](https://ref.gs1.org/standards/resolver/) | Base standard |

---

*Galileo Luxury Standard - Resolver Layer*
*Specification: GSPEC-RESOLVER-002*
*Classification: Public*
