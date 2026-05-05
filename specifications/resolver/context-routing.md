# Context-Aware Routing Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-RESOLVER-003

---

## Table of Contents

1. [Overview](#1-overview)
2. [Requester Roles](#2-requester-roles)
3. [Context Detection](#3-context-detection)
4. [Link Type Access Matrix](#4-link-type-access-matrix)
5. [Response Filtering](#5-response-filtering)
6. [Language Preference](#6-language-preference)
7. [ESPR Compliance](#7-espr-compliance)
8. [Conflict Resolution](#8-conflict-resolution)

---

## 1. Overview

### 1.1 Purpose

This specification defines the context-aware routing rules for the Galileo resolver. Context-aware routing delivers role-appropriate views of product data, ensuring:

- **Consumers** see public product information without authentication
- **Brands** access full Digital Product Passport data
- **Regulators** receive ESPR compliance views
- **Service Centers** obtain technical and repair information

### 1.2 ESPR Requirement

EU ESPR 2024/1781 mandates tiered stakeholder access:

> "The digital product passport shall be accessible to economic operators, market surveillance authorities, customs authorities, consumers, and other relevant actors..."

This specification implements tiered access through role-based link type filtering.

### 1.3 References

- [Resolution Protocol](./resolution-protocol.md) - Resolution algorithm
- [Access Control](./access-control.md) - Authentication requirements
- [Linkset Schema](./linkset-schema.json) - Response format
- [GS1 Integration](../schemas/alignment/gs1-integration.md) - Context mapping

---

## 2. Requester Roles

### 2.1 Role Definitions

The Galileo resolver recognizes four primary roles plus anonymous access:

```typescript
enum RequesterRole {
  CONSUMER = "consumer",           // Default public view
  BRAND = "brand",                 // Brand administrator
  REGULATOR = "regulator",         // Market surveillance authority
  SERVICE_CENTER = "service_center" // Authorized repair service
}
```

### 2.2 Role Descriptions

#### Consumer (Default)

**Description:** End consumers, general public, and any unauthenticated request.

**Access Level:** Public product information only.

**Authentication:** None required.

**Typical Use Cases:**
- Scanning product QR code in store
- Verifying authenticity of owned item
- Checking care instructions
- Viewing sustainability information

**Visible Data:**
- Product description and specifications
- Care and usage instructions
- Sustainability and environmental data
- Certifications (public certificates)
- Authenticity verification status

**Hidden Data:**
- Internal brand notes
- Full ownership history
- Compliance audit trail
- Technical repair specifications
- Cost and pricing information

#### Brand

**Description:** Brand owners, authorized brand administrators, and brand systems.

**Access Level:** Full DPP access for products they control.

**Authentication:** JWT required with `role: "brand"` and `brand_did` matching product controller.

**Typical Use Cases:**
- Monitoring product lifecycle
- Reviewing ownership transfers
- Investigating warranty claims
- Generating compliance reports
- Managing product data

**Visible Data:**
- All consumer-visible data
- Complete Digital Product Passport
- Full ownership transfer history
- Internal notes and metadata
- Compliance declarations
- Service and repair history

**Authorization Check:**
```typescript
function isBrandAuthorized(claims: JWTClaims, productDID: string): boolean {
  // Brand DID in token must match product controller
  const productRecord = await registry.getRecord(productDID);
  return claims.brand_did === productRecord.controller;
}
```

#### Regulator

**Description:** Market surveillance authorities, customs officials, and authorized compliance auditors.

**Access Level:** ESPR compliance view plus audit trail.

**Authentication:** JWT required with `role: "regulator"` and valid jurisdiction claim.

**Typical Use Cases:**
- Market surveillance inspections
- ESPR compliance verification
- Customs authenticity checks
- Environmental compliance audits
- Product recall investigations

**Visible Data:**
- All consumer-visible data
- ESPR mandatory fields (complete DPP)
- Material composition with percentages
- Carbon footprint calculations
- Repairability index details
- Compliance declarations and test results
- Full audit trail (ownership, events, modifications)

**Not Visible:**
- Internal brand notes
- Technical repair specifications (unless compliance-relevant)
- Service center access information

#### Service Center

**Description:** Authorized repair services, maintenance centers, and certified technicians.

**Access Level:** Technical specifications and service history.

**Authentication:** JWT required with `role: "service_center"` and valid SERVICE_CENTER claim on ONCHAINID.

**Typical Use Cases:**
- Accessing repair manuals
- Checking warranty status
- Recording service events
- Ordering replacement parts
- Verifying repair eligibility

**Visible Data:**
- Basic product information
- Technical specifications
- Disassembly instructions
- Parts catalog and availability
- Service history for this product
- Warranty status

**Not Visible:**
- Full ownership history (privacy)
- Compliance audit trail
- Internal brand notes
- ESPR regulatory details

**Authorization Check:**
```typescript
async function isServiceCenterAuthorized(
  claims: JWTClaims,
  productDID: string
): Promise<boolean> {
  // 1. Check ONCHAINID has SERVICE_CENTER claim
  const identity = claims.sub;  // User's ONCHAINID address
  const hasServiceClaim = await identityRegistry.hasValidClaim(
    identity,
    SERVICE_CENTER_TOPIC
  );

  if (!hasServiceClaim) return false;

  // 2. Optionally check if authorized for this brand
  const productBrand = await getProductBrand(productDID);
  const claim = await identityRegistry.getClaim(identity, SERVICE_CENTER_TOPIC);
  const claimData = decodeClaimData(claim);

  return claimData.brandDID === productBrand || claimData.brandDID === "*";
}
```

### 2.3 Anonymous Access

Requests without authentication default to `consumer` role:

- No JWT token present
- Invalid/expired JWT token (falls back to consumer, doesn't error)
- JWT with unrecognized role

```typescript
function getEffectiveRole(authResult: AuthResult | null): RequesterRole {
  if (!authResult || !authResult.valid) {
    return RequesterRole.CONSUMER;
  }

  const role = authResult.claims.role;
  if (Object.values(RequesterRole).includes(role)) {
    return role as RequesterRole;
  }

  return RequesterRole.CONSUMER;
}
```

---

## 3. Context Detection

### 3.1 Detection Priority Order

Context is determined from multiple sources in strict priority order:

| Priority | Source | Description | Requires Auth |
|----------|--------|-------------|---------------|
| 1 | JWT role claim | Explicit authenticated role | Yes |
| 2 | linkType parameter | Implies required role | Depends |
| 3 | context parameter | Explicit context hint | For non-consumer |
| 4 | Accept header | Content type preference | No |
| 5 | Default | Consumer | No |

### 3.2 Priority 1: JWT Role Claim

**Highest priority.** If a valid JWT is provided with a `role` claim, use it.

```typescript
async function detectContextFromJWT(
  authHeader: string
): Promise<RequesterContext | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const claims = await verifyJWT(token);

  if (!claims || !claims.role) {
    return null;
  }

  return {
    role: claims.role as RequesterRole,
    authenticated: true,
    identity: claims.sub,
    brandDID: claims.brand_did,
    jurisdiction: claims.jurisdiction,
    serviceTypes: claims.service_types
  };
}
```

### 3.3 Priority 2: linkType Parameter

If no JWT, check if requested link type implies a role.

**Public Link Types (no auth required):**
- `gs1:pip`
- `gs1:sustainabilityInfo`
- `gs1:instructions`
- `gs1:certificationInfo`
- `gs1:defaultLink`
- `galileo:authenticity`

**Privileged Link Types (auth required):**
- `gs1:traceability` - brand, regulator
- `gs1:regulatoryInfo` - brand, regulator
- `galileo:internalDPP` - brand only
- `galileo:auditTrail` - brand, regulator
- `galileo:serviceInfo` - service_center, brand
- `galileo:technicalSpec` - service_center, brand
- `galileo:complianceDPP` - regulator only
- `galileo:espr` - regulator only

```typescript
function detectContextFromLinkType(
  linkType: string | null,
  isAuthenticated: boolean
): RequesterContext | "requiresAuth" {
  if (!linkType) {
    return { role: RequesterRole.CONSUMER, authenticated: false };
  }

  const requiredRole = getRequiredRoleForLinkType(linkType);

  if (requiredRole === RequesterRole.CONSUMER) {
    return { role: RequesterRole.CONSUMER, authenticated: false };
  }

  // Privileged link type requested without auth
  if (!isAuthenticated) {
    return "requiresAuth";
  }

  // Should not reach here - JWT would have set context in Priority 1
  return { role: RequesterRole.CONSUMER, authenticated: false };
}
```

### 3.4 Priority 3: context Parameter

The `context` query parameter provides an explicit hint:

```
?context=consumer
?context=brand
?context=regulator
?context=service_center
```

**Rules:**
- `consumer` context: Always allowed, returns consumer view
- Other contexts: Ignored if not authenticated (falls back to consumer)
- Does NOT grant elevated access - just a hint

```typescript
function detectContextFromParam(
  contextParam: string | null,
  isAuthenticated: boolean
): RequesterContext | null {
  if (!contextParam) {
    return null;
  }

  // Consumer context is always valid
  if (contextParam === "consumer") {
    return { role: RequesterRole.CONSUMER, authenticated: false };
  }

  // Other contexts require authentication
  if (!isAuthenticated) {
    // Ignore hint, will fall through to consumer default
    return null;
  }

  // Hint doesn't grant access - actual role comes from JWT
  return null;
}
```

### 3.5 Priority 4: Accept Header

Content negotiation provides weak context signals:

| Accept Header | Context Signal |
|---------------|----------------|
| `text/html` | Consumer (human browsing) |
| `application/json` | System integration |
| `application/ld+json` | Semantic web client |
| `application/linkset+json` | Return full linkset |

**Note:** Accept header does NOT affect role, only response format.

### 3.6 Priority 5: Default

If no context determined from above sources, default to `consumer`.

### 3.7 Complete Detection Algorithm

```typescript
async function detectContext(
  authHeader: string | null,
  linkType: string | null,
  contextParam: string | null,
  acceptHeader: string | null
): Promise<RequesterContext | AuthenticationRequired> {

  // Priority 1: JWT role claim
  if (authHeader) {
    const jwtContext = await detectContextFromJWT(authHeader);
    if (jwtContext) {
      return jwtContext;
    }
  }

  const isAuthenticated = false;  // JWT failed or not provided

  // Priority 2: linkType implies role
  if (linkType) {
    const linkTypeContext = detectContextFromLinkType(linkType, isAuthenticated);
    if (linkTypeContext === "requiresAuth") {
      return new AuthenticationRequired(linkType);
    }
    if (linkTypeContext) {
      return linkTypeContext;
    }
  }

  // Priority 3: context parameter (hint only)
  if (contextParam) {
    const paramContext = detectContextFromParam(contextParam, isAuthenticated);
    if (paramContext) {
      return paramContext;
    }
  }

  // Priority 4: Accept header (format only, not role)
  // Does not affect role detection

  // Priority 5: Default consumer
  return {
    role: RequesterRole.CONSUMER,
    authenticated: false
  };
}
```

---

## 4. Link Type Access Matrix

### 4.1 Complete Access Matrix

| Link Type | consumer | brand | regulator | service_center |
|-----------|----------|-------|-----------|----------------|
| **GS1 Standard Link Types** |
| `gs1:defaultLink` | YES | YES | YES | YES |
| `gs1:pip` | YES | YES | YES | YES |
| `gs1:sustainabilityInfo` | YES | YES | YES | YES |
| `gs1:instructions` | YES | YES | YES | YES |
| `gs1:certificationInfo` | YES | YES | YES | YES |
| `gs1:hasRetailers` | YES | YES | YES | YES |
| `gs1:smartLabel` | YES | YES | YES | YES |
| `gs1:recipeInfo` | YES | YES | YES | NO |
| `gs1:regulatoryInfo` | NO | YES | YES | NO |
| `gs1:traceability` | NO | YES | YES | NO |
| **Galileo Custom Link Types** |
| `galileo:authenticity` | YES | YES | YES | YES |
| `galileo:provenance` | YES | YES | YES | YES |
| `galileo:internalDPP` | NO | YES | NO | NO |
| `galileo:auditTrail` | NO | YES | YES | NO |
| `galileo:serviceInfo` | NO | YES | NO | YES |
| `galileo:technicalSpec` | NO | YES | NO | YES |
| `galileo:repairHistory` | NO | YES | NO | YES |
| `galileo:complianceDPP` | NO | NO | YES | NO |
| `galileo:espr` | NO | NO | YES | NO |

### 4.2 Link Type Definitions

#### GS1 Standard Link Types

| Link Type | Full URI | Description |
|-----------|----------|-------------|
| `gs1:defaultLink` | `https://gs1.org/voc/defaultLink` | Default target when no specific type requested |
| `gs1:pip` | `https://gs1.org/voc/pip` | Product Information Page |
| `gs1:sustainabilityInfo` | `https://gs1.org/voc/sustainabilityInfo` | Environmental and sustainability data |
| `gs1:instructions` | `https://gs1.org/voc/instructions` | Care and usage instructions |
| `gs1:certificationInfo` | `https://gs1.org/voc/certificationInfo` | Product certifications |
| `gs1:hasRetailers` | `https://gs1.org/voc/hasRetailers` | Authorized retailers |
| `gs1:smartLabel` | `https://gs1.org/voc/smartLabel` | SmartLabel digital content |
| `gs1:recipeInfo` | `https://gs1.org/voc/recipeInfo` | Formulation/composition details |
| `gs1:regulatoryInfo` | `https://gs1.org/voc/regulatoryInfo` | Regulatory compliance data |
| `gs1:traceability` | `https://gs1.org/voc/traceability` | Supply chain event history |

#### Galileo Custom Link Types

| Link Type | Full URI | Description |
|-----------|----------|-------------|
| `galileo:authenticity` | `https://vocab.galileoprotocol.io/authenticity` | Authenticity verification proof |
| `galileo:provenance` | `https://vocab.galileoprotocol.io/provenance` | Origin and chain of custody |
| `galileo:internalDPP` | `https://vocab.galileoprotocol.io/internalDPP` | Complete DPP with all fields |
| `galileo:auditTrail` | `https://vocab.galileoprotocol.io/auditTrail` | Full audit and event history |
| `galileo:serviceInfo` | `https://vocab.galileoprotocol.io/serviceInfo` | Service center access data |
| `galileo:technicalSpec` | `https://vocab.galileoprotocol.io/technicalSpec` | Technical specifications |
| `galileo:repairHistory` | `https://vocab.galileoprotocol.io/repairHistory` | Repair and service history |
| `galileo:complianceDPP` | `https://vocab.galileoprotocol.io/complianceDPP` | ESPR mandatory fields only |
| `galileo:espr` | `https://vocab.galileoprotocol.io/espr` | ESPR compliance bundle |

### 4.3 Role-to-Link-Types Mapping

```typescript
const ROLE_LINK_TYPES: Record<RequesterRole, string[]> = {
  [RequesterRole.CONSUMER]: [
    "gs1:defaultLink",
    "gs1:pip",
    "gs1:sustainabilityInfo",
    "gs1:instructions",
    "gs1:certificationInfo",
    "gs1:hasRetailers",
    "gs1:smartLabel",
    "gs1:recipeInfo",
    "galileo:authenticity",
    "galileo:provenance"
  ],

  [RequesterRole.BRAND]: [
    // All consumer links
    "gs1:defaultLink",
    "gs1:pip",
    "gs1:sustainabilityInfo",
    "gs1:instructions",
    "gs1:certificationInfo",
    "gs1:hasRetailers",
    "gs1:smartLabel",
    "gs1:recipeInfo",
    "galileo:authenticity",
    "galileo:provenance",
    // Brand-specific links
    "gs1:regulatoryInfo",
    "gs1:traceability",
    "galileo:internalDPP",
    "galileo:auditTrail",
    "galileo:serviceInfo",
    "galileo:technicalSpec",
    "galileo:repairHistory"
  ],

  [RequesterRole.REGULATOR]: [
    // Consumer links
    "gs1:defaultLink",
    "gs1:pip",
    "gs1:sustainabilityInfo",
    "gs1:instructions",
    "gs1:certificationInfo",
    "gs1:hasRetailers",
    "gs1:smartLabel",
    "galileo:authenticity",
    "galileo:provenance",
    // Regulator-specific links
    "gs1:regulatoryInfo",
    "gs1:traceability",
    "galileo:auditTrail",
    "galileo:complianceDPP",
    "galileo:espr"
  ],

  [RequesterRole.SERVICE_CENTER]: [
    // Consumer links
    "gs1:defaultLink",
    "gs1:pip",
    "gs1:sustainabilityInfo",
    "gs1:instructions",
    "gs1:certificationInfo",
    "gs1:hasRetailers",
    "gs1:smartLabel",
    "galileo:authenticity",
    "galileo:provenance",
    // Service-specific links
    "galileo:serviceInfo",
    "galileo:technicalSpec",
    "galileo:repairHistory"
  ]
};
```

### 4.4 Link Type to Required Role

```typescript
const LINK_TYPE_REQUIRED_ROLE: Record<string, RequesterRole[]> = {
  // Public (consumer)
  "gs1:defaultLink": [RequesterRole.CONSUMER],
  "gs1:pip": [RequesterRole.CONSUMER],
  "gs1:sustainabilityInfo": [RequesterRole.CONSUMER],
  "gs1:instructions": [RequesterRole.CONSUMER],
  "gs1:certificationInfo": [RequesterRole.CONSUMER],
  "gs1:hasRetailers": [RequesterRole.CONSUMER],
  "gs1:smartLabel": [RequesterRole.CONSUMER],
  "gs1:recipeInfo": [RequesterRole.CONSUMER],
  "galileo:authenticity": [RequesterRole.CONSUMER],
  "galileo:provenance": [RequesterRole.CONSUMER],

  // Privileged
  "gs1:regulatoryInfo": [RequesterRole.BRAND, RequesterRole.REGULATOR],
  "gs1:traceability": [RequesterRole.BRAND, RequesterRole.REGULATOR],
  "galileo:internalDPP": [RequesterRole.BRAND],
  "galileo:auditTrail": [RequesterRole.BRAND, RequesterRole.REGULATOR],
  "galileo:serviceInfo": [RequesterRole.BRAND, RequesterRole.SERVICE_CENTER],
  "galileo:technicalSpec": [RequesterRole.BRAND, RequesterRole.SERVICE_CENTER],
  "galileo:repairHistory": [RequesterRole.BRAND, RequesterRole.SERVICE_CENTER],
  "galileo:complianceDPP": [RequesterRole.REGULATOR],
  "galileo:espr": [RequesterRole.REGULATOR]
};

function getRequiredRoleForLinkType(linkType: string): RequesterRole[] {
  return LINK_TYPE_REQUIRED_ROLE[linkType] || [RequesterRole.CONSUMER];
}

function canAccessLinkType(role: RequesterRole, linkType: string): boolean {
  const allowedTypes = ROLE_LINK_TYPES[role];
  return allowedTypes.includes(linkType);
}
```

---

## 5. Response Filtering

### 5.1 Filtering Algorithm

```typescript
interface Link {
  href: string;
  rel: string;           // Link type URI
  title?: string;
  hreflang?: string[];
  type?: string;         // MIME type
  context?: string[];    // Access contexts
  auth?: "none" | "jwt" | "vc";
}

function filterLinksByContext(
  allLinks: Link[],
  context: RequesterContext
): Link[] {
  const allowedTypes = ROLE_LINK_TYPES[context.role];

  return allLinks.filter(link => {
    // Check if link type is allowed for this role
    const linkTypeShort = shortenLinkType(link.rel);
    if (!allowedTypes.includes(linkTypeShort)) {
      return false;
    }

    // Check explicit context restriction on link
    if (link.context && link.context.length > 0) {
      if (!link.context.includes(context.role)) {
        return false;
      }
    }

    return true;
  });
}

function shortenLinkType(fullUri: string): string {
  if (fullUri.startsWith("https://gs1.org/voc/")) {
    return "gs1:" + fullUri.slice("https://gs1.org/voc/".length);
  }
  if (fullUri.startsWith("https://vocab.galileoprotocol.io/")) {
    return "galileo:" + fullUri.slice("https://vocab.galileoprotocol.io/".length);
  }
  return fullUri;
}
```

### 5.2 Default Link Selection

When no specific `linkType` is requested:

```typescript
function selectDefaultLink(
  filteredLinks: Link[],
  context: RequesterContext
): Link | null {
  // Priority 1: Explicit defaultLink
  const defaultLink = filteredLinks.find(l =>
    l.rel === "https://gs1.org/voc/defaultLink"
  );
  if (defaultLink) return defaultLink;

  // Priority 2: Product Information Page
  const pip = filteredLinks.find(l =>
    l.rel === "https://gs1.org/voc/pip"
  );
  if (pip) return pip;

  // Priority 3: First available link
  return filteredLinks[0] || null;
}
```

### 5.3 Linkset Response Building

When `linkType=linkset` is requested:

```typescript
function buildLinksetResponse(
  filteredLinks: Link[],
  anchor: string,
  itemDescription: string | null
): LinksetResponse {
  // Group links by relation type
  const linksByRel: Record<string, Link[]> = {};

  for (const link of filteredLinks) {
    if (!linksByRel[link.rel]) {
      linksByRel[link.rel] = [];
    }
    linksByRel[link.rel].push(link);
  }

  return {
    "@context": {
      "@vocab": "http://www.iana.org/assignments/relation/",
      "anchor": "@id",
      "href": "@id",
      "linkset": "@graph",
      "gs1": "https://gs1.org/voc/",
      "galileo": "https://vocab.galileoprotocol.io/"
    },
    "linkset": [{
      "anchor": anchor,
      "itemDescription": itemDescription,
      ...linksByRel
    }]
  };
}
```

### 5.4 Field Filtering per Role

Beyond link filtering, some response content may be filtered:

| Field | consumer | brand | regulator | service_center |
|-------|----------|-------|-----------|----------------|
| Product name | Full | Full | Full | Full |
| Product description | Full | Full | Full | Full |
| Owner history | Hidden | Full | Full | Hidden |
| Internal notes | Hidden | Full | Hidden | Hidden |
| Compliance results | Summary | Full | Full | Summary |
| Repair details | Hidden | Full | Hidden | Full |
| Cost information | Hidden | Full | Hidden | Hidden |

---

## 6. Language Preference

### 6.1 Accept-Language Header

The resolver respects HTTP `Accept-Language` header for content selection:

```
Accept-Language: fr-FR, en;q=0.8, de;q=0.5
```

Interpretation:
1. French (France) preferred
2. English as fallback (80% preference)
3. German as second fallback (50% preference)

### 6.2 lang Query Parameter

The `lang` parameter provides explicit language selection:

```
?lang=fr
?lang=zh-Hans
```

### 6.3 Language Selection Algorithm

```typescript
function selectLinksForLanguage(
  links: Link[],
  acceptLanguage: string | null,
  langParam: string | null
): Link[] {
  // Build preference list
  const preferences = langParam
    ? [langParam]
    : parseAcceptLanguage(acceptLanguage);

  if (preferences.length === 0) {
    return links;  // No preference, return all
  }

  // Separate links with and without hreflang
  const withLang = links.filter(l => l.hreflang && l.hreflang.length > 0);
  const withoutLang = links.filter(l => !l.hreflang || l.hreflang.length === 0);

  // For each link type, select best language match
  const result: Link[] = [];

  for (const pref of preferences) {
    for (const link of withLang) {
      if (link.hreflang!.some(h => matchLanguage(h, pref))) {
        result.push(link);
      }
    }
  }

  // Add links without language restriction
  result.push(...withoutLang);

  return deduplicateLinks(result);
}

function matchLanguage(hreflang: string, preference: string): boolean {
  // Exact match
  if (hreflang.toLowerCase() === preference.toLowerCase()) return true;

  // Language match (ignore region)
  const hLang = hreflang.split("-")[0].toLowerCase();
  const pLang = preference.split("-")[0].toLowerCase();
  return hLang === pLang;
}
```

### 6.4 Fallback Behavior

If no matching language found:
1. Return link without `hreflang` restriction
2. If all links have `hreflang`, return first available

---

## 7. ESPR Compliance

### 7.1 Consumer View Requirements

ESPR requires consumers to access:
- Product identification
- Manufacturing information
- Material composition (summary)
- Sustainability data
- Care instructions
- Repairability score

**Mapped Link Types:**
- `gs1:pip` - Product identification
- `gs1:sustainabilityInfo` - Sustainability data
- `gs1:instructions` - Care instructions
- `galileo:authenticity` - Verification

### 7.2 Regulator View Requirements

Market surveillance authorities need:
- All consumer information
- Detailed material composition with percentages
- Carbon footprint calculation methodology
- Repairability index breakdown
- Compliance declarations
- Test results and certificates
- Full audit trail

**Mapped Link Types:**
- `galileo:complianceDPP` - ESPR mandatory fields
- `galileo:espr` - Complete compliance bundle
- `galileo:auditTrail` - Event history
- `gs1:regulatoryInfo` - Regulatory declarations
- `gs1:traceability` - Supply chain events

### 7.3 Access Level Summary

| Stakeholder | ESPR Reference | Galileo Role | Data Access |
|-------------|----------------|--------------|-------------|
| Consumer | Article 8(2)(a) | consumer | Public DPP view |
| Economic operator | Article 8(2)(b) | brand | Full DPP access |
| Market surveillance | Article 8(2)(c) | regulator | Compliance + audit |
| Customs | Article 8(2)(d) | regulator | Authenticity + origin |
| Repair services | Article 8(2)(e) | service_center | Technical + parts |

### 7.4 Mandatory ESPR Fields

The following fields are always included in consumer view:

```json
{
  "espr:productIdentifier": "required",
  "espr:manufacturerName": "required",
  "espr:model": "required",
  "espr:countryOfManufacture": "required",
  "espr:sustainabilityScore": "required",
  "espr:repairabilityIndex": "required",
  "espr:carbonFootprint": "if_applicable",
  "espr:recycledContent": "if_applicable",
  "espr:hazardousSubstances": "if_applicable"
}
```

---

## 8. Conflict Resolution

### 8.1 Authentication Overrides Context Hint

**Rule:** Authenticated role ALWAYS takes precedence over query parameters.

```
Scenario: JWT has role="brand", query has context=consumer

Result: Brand view (JWT wins)
```

### 8.2 Privileged Link Type Without Auth

**Rule:** Requesting a privileged link type without authentication returns 401.

```
Scenario: No JWT, linkType=galileo:internalDPP

Result: 401 Unauthorized
Response: { "error": "unauthorized", "requiredRole": "brand" }
```

### 8.3 Unknown Context Value

**Rule:** Unknown context parameter values are ignored (defaults to consumer).

```
Scenario: context=superuser (invalid)

Result: Consumer view (unknown value ignored)
```

### 8.4 Role Cannot Access Requested Link Type

**Rule:** If authenticated role cannot access requested link type, return 403.

```
Scenario: JWT has role="service_center", linkType=galileo:auditTrail

Result: 403 Forbidden
Response: {
  "error": "forbidden",
  "yourRole": "service_center",
  "requiredRole": ["brand", "regulator"]
}
```

### 8.5 Brand DID Mismatch

**Rule:** Brand role requires matching brand_did to product controller.

```
Scenario: JWT has role="brand", brand_did="did:galileo:brand:chanel"
          Product controlled by "did:galileo:brand:hermes"

Result: 403 Forbidden
Response: { "error": "forbidden", "reason": "brand_did_mismatch" }
```

### 8.6 Conflict Resolution Summary

| Scenario | Resolution |
|----------|------------|
| JWT role + context param differ | JWT role wins |
| Privileged linkType + no auth | 401 Unauthorized |
| Unknown context value | Default to consumer |
| Valid auth + unauthorized linkType | 403 Forbidden |
| Brand role + wrong brand_did | 403 Forbidden |
| Service center + no SERVICE_CENTER claim | 403 Forbidden |
| Multiple language matches | First preference wins |
| No matching language | Return without hreflang |

---

## Appendix A: Implementation Examples

### Example 1: Consumer Scans QR Code

```
Request:
  GET /01/09506000134352/21/ABC123
  No Authorization header

Detection:
  1. No JWT -> skip Priority 1
  2. No linkType -> skip Priority 2
  3. No context param -> skip Priority 3
  4. Accept: */* -> no role signal
  5. Default: consumer

Filtered Links:
  - gs1:defaultLink
  - gs1:pip
  - gs1:sustainabilityInfo
  - gs1:instructions
  - galileo:authenticity

Response:
  307 Redirect to gs1:defaultLink target
```

### Example 2: Brand Admin Requests Audit Trail

```
Request:
  GET /01/09506000134352/21/ABC123?linkType=galileo:auditTrail
  Authorization: Bearer eyJ...
  (JWT: role="brand", brand_did="did:galileo:brand:hermesparis")

Detection:
  1. JWT valid, role="brand" -> Priority 1 match
  2. Skip remaining priorities

Verification:
  - Product controller matches brand_did? YES

Filtered Links:
  - All brand-accessible links including galileo:auditTrail

Response:
  307 Redirect to galileo:auditTrail target
  Cache-Control: private, no-store
```

### Example 3: Unauthorized Link Type Request

```
Request:
  GET /01/09506000134352/21/ABC123?linkType=galileo:internalDPP
  No Authorization header

Detection:
  1. No JWT -> skip Priority 1
  2. linkType=galileo:internalDPP requires brand role
  3. Not authenticated -> return 401

Response:
  401 Unauthorized
  WWW-Authenticate: Bearer realm="galileo"
  {
    "error": "unauthorized",
    "errorCode": "MISSING_TOKEN",
    "message": "Authentication required for link type galileo:internalDPP",
    "requiredRole": "brand"
  }
```

---

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [resolution-protocol.md](./resolution-protocol.md) | Resolution algorithm |
| [access-control.md](./access-control.md) | JWT authentication |
| [linkset-schema.json](./linkset-schema.json) | Response schema |
| [claim-topics.md](../identity/claim-topics.md) | SERVICE_CENTER claim |
| [gs1-integration.md](../schemas/alignment/gs1-integration.md) | Context routing overview |
| [ESPR 2024/1781](https://eur-lex.europa.eu/eli/reg/2024/1781/oj) | EU regulation |

---

*Galileo Luxury Standard - Resolver Layer*
*Specification: GSPEC-RESOLVER-003*
*Classification: Public*
