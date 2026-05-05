# GS1 Digital Link Integration for Galileo Protocol

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-30
**GS1 Digital Link Version:** 1.6.0
**did:galileo Version:** 1.0.0

## Overview

This document specifies the bidirectional integration between GS1 Digital Link URIs and did:galileo decentralized identifiers. The integration enables seamless interoperability between traditional supply chain systems using GS1 identifiers and the Galileo decentralized provenance network.

**References:**
- [GS1 Digital Link Standard 1.6.0](https://ref.gs1.org/standards/digital-link/)
- [did:galileo Method Specification](../../identity/DID-METHOD.md)
- [W3C DID Core v1.0](https://www.w3.org/TR/did-core/)

---

## URI Mapping

### GS1 Digital Link to did:galileo

The mapping preserves GS1 Application Identifiers (AI) as semantic components in the DID.

#### GTIN + Serial (Primary Product Identification)

```
GS1 Digital Link:  https://id.gs1.org/01/{GTIN14}/21/{Serial}
did:galileo:       did:galileo:01:{GTIN14}:21:{Serial}

Example:
GS1:    https://id.gs1.org/01/09506000134352/21/HK2024A001
DID:    did:galileo:01:09506000134352:21:HK2024A001
```

#### Component/Part Identification (CPID)

```
GS1 Digital Link:  https://id.gs1.org/8010/{CPID}/8011/{CPSerial}
did:galileo:       did:galileo:8010:{CPID}:8011:{CPSerial}

Example:
GS1:    https://id.gs1.org/8010/0614141123452/8011/B001
DID:    did:galileo:8010:0614141123452:8011:B001
```

#### Individual Trade Item Piece (ITIP)

```
GS1 Digital Link:  https://id.gs1.org/8006/{ITIP14}{Piece}{Total}/21/{Serial}
did:galileo:       did:galileo:8006:{ITIP14}{Piece}{Total}:21:{Serial}

Example:
GS1:    https://id.gs1.org/8006/095060001343520102/21/SET001
DID:    did:galileo:8006:095060001343520102:21:SET001
```

#### Global Document Type Identifier (GDTI)

```
GS1 Digital Link:  https://id.gs1.org/253/{GCPDoc}{SerialDoc}
did:galileo:       did:galileo:253:{GCPDoc}{SerialDoc}

Example:
GS1:    https://id.gs1.org/253/0614141000012AUTH2024001
DID:    did:galileo:253:0614141000012AUTH2024001
```

### Mapping Rules

| GS1 AI | AI Name | did:galileo Format | Usage |
|--------|---------|-------------------|-------|
| 01 | GTIN | `did:galileo:01:{gtin14}:21:{serial}` | Products with serial |
| 01 | GTIN (no serial) | `did:galileo:01:{gtin14}` | Product class only |
| 8006 | ITIP | `did:galileo:8006:{itip}:21:{serial}` | Individual pieces |
| 8010 | CPID | `did:galileo:8010:{cpid}:8011:{cpserial}` | Components/parts |
| 253 | GDTI | `did:galileo:253:{gdti}` | Documents/certificates |

### Character Encoding

- **GTIN:** Numeric only, exactly 14 digits (GTIN-14)
- **Serial (AI 21):** Alphanumeric, 1-20 characters, pattern `[A-Za-z0-9\-\.]{1,20}`
- **CPID:** GS1 Company Prefix + component reference
- **Separator:** Colon (`:`) replaces URI path separator (`/`)

---

## Bidirectional Resolution

### GS1 to Galileo Resolution

When a GS1 Digital Link is resolved and the GTIN prefix is registered with Galileo:

```
Request:  GET https://id.gs1.org/01/09506000134352/21/HK2024A001
          Accept: application/json

Response: HTTP 302 Found
          Location: https://resolver.galileoprotocol.io/did/01:09506000134352:21:HK2024A001
```

#### GS1 Resolver Configuration

Brands registered in Galileo configure their GS1 Company Prefix to redirect to the Galileo resolver:

```json
{
  "prefix": "0950600",
  "redirects": [
    {
      "linkType": "https://gs1.org/voc/pip",
      "targetUrl": "https://resolver.galileoprotocol.io/dpp/{gtin}/{serial}"
    },
    {
      "linkType": "https://gs1.org/voc/sustainabilityInfo",
      "targetUrl": "https://resolver.galileoprotocol.io/sustainability/{gtin}/{serial}"
    },
    {
      "linkType": "https://gs1.org/voc/traceability",
      "targetUrl": "https://resolver.galileoprotocol.io/events/{gtin}/{serial}"
    }
  ]
}
```

### Galileo to GS1 Resolution

did:galileo DID documents include GS1 Digital Link as an `alsoKnownAs` identifier:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:galileo:01:09506000134352:21:HK2024A001",
  "alsoKnownAs": [
    "https://id.gs1.org/01/09506000134352/21/HK2024A001"
  ],
  "controller": "did:galileo:brand:hermes",
  "verificationMethod": [...],
  "service": [
    {
      "id": "did:galileo:01:09506000134352:21:HK2024A001#gs1-link",
      "type": "GS1DigitalLink",
      "serviceEndpoint": "https://id.gs1.org/01/09506000134352/21/HK2024A001"
    }
  ]
}
```

---

## Context-Aware Routing

The Galileo resolver provides different responses based on requester context, enabling privacy-preserving access control.

### Context Determination

Context is determined in priority order:

1. **Authentication Token:** JWT with verified role claim
2. **Accept Header:** Specific link types requested
3. **Query Parameter:** `?context=consumer|brand|regulator|service`
4. **Default:** Consumer public view

### Response Matrix

| Requester Context | Link Type | Data Access Level | Response Type |
|-------------------|-----------|-------------------|---------------|
| Consumer (default) | `gs1:pip` | Public DPP view | JSON-LD |
| Consumer | `gs1:sustainabilityInfo` | Sustainability data | JSON-LD |
| Consumer | `gs1:instructions` | Care instructions | HTML/PDF |
| Brand (authenticated) | `gs1:traceability` | Full event history | JSON-LD |
| Brand | `galileo:internalDPP` | Complete DPP | JSON-LD |
| Regulator (verified) | `gs1:regulatoryInfo` | ESPR compliance | JSON-LD |
| Regulator | `galileo:auditTrail` | Full audit trail | JSON-LD |
| Service Center (authorized) | `galileo:serviceInfo` | Repair history | JSON-LD |
| Service Center | `galileo:technicalSpec` | Technical specs | JSON-LD |

### Link Types

#### Standard GS1 Link Types

| Link Type | URI | Description |
|-----------|-----|-------------|
| Product Information Page | `https://gs1.org/voc/pip` | Public product details |
| Sustainability Info | `https://gs1.org/voc/sustainabilityInfo` | Environmental data |
| Traceability | `https://gs1.org/voc/traceability` | Supply chain events |
| Instructions | `https://gs1.org/voc/instructions` | User/care instructions |
| Regulatory Info | `https://gs1.org/voc/regulatoryInfo` | Compliance data |
| Smart Label | `https://gs1.org/voc/smartLabel` | Digital label |

#### Custom Galileo Link Types

| Link Type | URI | Description |
|-----------|-----|-------------|
| Internal DPP | `https://vocab.galileoprotocol.io/internalDPP` | Full DPP (authenticated) |
| Audit Trail | `https://vocab.galileoprotocol.io/auditTrail` | Complete event history |
| Service Info | `https://vocab.galileoprotocol.io/serviceInfo` | Service/repair data |
| Technical Spec | `https://vocab.galileoprotocol.io/technicalSpec` | Technical specifications |
| Authenticity | `https://vocab.galileoprotocol.io/authenticity` | Verification proof |

### Authentication Flow

```
1. Client requests: GET https://resolver.galileoprotocol.io/dpp/09506000134352/HK2024A001
                    Authorization: Bearer {jwt}
                    Accept: application/ld+json

2. Resolver validates JWT:
   - Verify signature against issuer's public key
   - Check expiration and audience claims
   - Extract role: "brand_admin" | "regulator" | "service_center"

3. Resolver returns context-appropriate response:
   - Brand admin: Full DPP with internal notes
   - Regulator: ESPR mandatory fields + audit trail
   - Service center: Repair history + technical specs
   - No valid JWT: Public consumer view
```

---

## Resolution Protocol

### HTTP Resolution

```
GET https://resolver.galileoprotocol.io/did/{method-specific-id}
Accept: application/did+ld+json

Response:
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:galileo:01:09506000134352:21:HK2024A001",
  ...
}
```

### DID Resolution Metadata

```json
{
  "didDocument": { ... },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json",
    "retrieved": "2024-03-15T10:30:00Z"
  },
  "didDocumentMetadata": {
    "created": "2024-03-15T10:00:00Z",
    "updated": "2024-03-15T10:30:00Z",
    "deactivated": false,
    "versionId": "1",
    "equivalentId": ["https://id.gs1.org/01/09506000134352/21/HK2024A001"]
  }
}
```

### Error Responses

| Status | Meaning | When |
|--------|---------|------|
| 200 | Success | Valid DID resolved |
| 301 | Moved Permanently | DID has canonical redirect |
| 400 | Bad Request | Invalid DID syntax |
| 401 | Unauthorized | Authentication required for context |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | DID not registered |
| 410 | Gone | DID deactivated (product destroyed) |

---

## Service Endpoints

### DID Document Service Types

```json
{
  "service": [
    {
      "id": "did:galileo:01:09506000134352:21:HK2024A001#dpp",
      "type": "GalileoDPP",
      "serviceEndpoint": "https://resolver.galileoprotocol.io/dpp/09506000134352/HK2024A001"
    },
    {
      "id": "did:galileo:01:09506000134352:21:HK2024A001#events",
      "type": "GalileoTraceability",
      "serviceEndpoint": "https://resolver.galileoprotocol.io/events/09506000134352/HK2024A001"
    },
    {
      "id": "did:galileo:01:09506000134352:21:HK2024A001#verify",
      "type": "GalileoAuthenticity",
      "serviceEndpoint": "https://resolver.galileoprotocol.io/verify/09506000134352/HK2024A001"
    },
    {
      "id": "did:galileo:01:09506000134352:21:HK2024A001#gs1-link",
      "type": "GS1DigitalLink",
      "serviceEndpoint": "https://id.gs1.org/01/09506000134352/21/HK2024A001"
    }
  ]
}
```

### Endpoint URL Patterns

| Service | URL Pattern | Content |
|---------|-------------|---------|
| DPP | `/dpp/{gtin}/{serial}` | Digital Product Passport |
| Events | `/events/{gtin}/{serial}` | EPCIS event history |
| Verify | `/verify/{gtin}/{serial}` | Authenticity verification |
| Sustainability | `/sustainability/{gtin}/{serial}` | Environmental data |
| Care | `/care/{gtin}/{serial}` | Care instructions |

---

## Integration Scenarios

### Scenario 1: Consumer Scans NFC Tag

```
1. Consumer scans NFC chip on product
2. Phone opens: https://id.gs1.org/01/09506000134352/21/HK2024A001

3. GS1 resolver recognizes Galileo prefix (0950600)
4. Redirects to: https://resolver.galileoprotocol.io/pip/09506000134352/HK2024A001

5. Galileo resolver returns public DPP:
   - Product name, brand, authenticity status
   - Sustainability information
   - Care instructions link
   - No ownership history (privacy)
```

### Scenario 2: Brand Queries Full History

```
1. Brand system authenticates:
   POST https://auth.galileoprotocol.io/token
   { "client_id": "hermes-ops", "client_secret": "..." }

2. Receives JWT with role: "brand_admin"

3. Requests full traceability:
   GET https://resolver.galileoprotocol.io/events/09506000134352/HK2024A001
   Authorization: Bearer {jwt}
   Accept: application/ld+json

4. Receives complete EPCIS event history:
   - Creation, commission, all ownership transfers
   - Repair/service events
   - Authentication checks
```

### Scenario 3: Regulator Compliance Audit

```
1. Regulator authenticates via verified credential
2. Requests ESPR compliance data:
   GET https://resolver.galileoprotocol.io/dpp/09506000134352/HK2024A001?context=regulator
   Authorization: Bearer {jwt}

3. Receives compliance-focused view:
   - Material composition percentages
   - Carbon footprint data
   - Repairability index
   - Compliance declaration
   - Audit trail for verification
```

### Scenario 4: CPO Platform Verification

```
1. CPO platform receives product for resale
2. Scans product, extracts DID from NFC
3. Requests authenticity verification:
   GET https://resolver.galileoprotocol.io/verify/09506000134352/HK2024A001

4. Receives verification bundle:
   - Authenticity status: VERIFIED
   - Brand attestation signature
   - Last ownership transfer verified
   - Current provenance grade
```

---

## Security Considerations

### HTTPS Requirement

All resolver endpoints MUST use HTTPS with TLS 1.3 or higher.

### Rate Limiting

Public endpoints implement rate limiting:
- Anonymous: 100 requests/minute
- Authenticated: 1000 requests/minute
- Brand admins: 10000 requests/minute

### Input Validation

- GTINs validated against GS1 check digit algorithm
- Serial numbers validated against allowed character set
- DIDs validated against did:galileo ABNF grammar

### Cache Control

```
Cache-Control: public, max-age=300
ETag: "abc123"
```

Public data may be cached; authenticated data MUST NOT be cached by intermediaries.

---

## Implementation Notes

### Phase 2 did:galileo Alignment

This specification aligns with the did:galileo method defined in Phase 2 (02-03-PLAN):
- DID syntax follows the same ABNF grammar
- Service endpoint patterns are consistent
- Resolution metadata follows W3C DID Resolution specification

### GS1 Resolver CE Integration

For Phase 6 implementation, Galileo deploys a GS1 Resolver CE instance:
- Configured with Galileo member company prefixes
- Custom link type handlers for Galileo-specific endpoints
- Integration with Galileo authentication service

### Resolver Deployment

- Primary: `resolver.galileoprotocol.io`
- GS1 Digital Link: `id.galileoprotocol.io`
- Fallback: `resolver2.galileoprotocol.io`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial GS1 Digital Link integration specification |

---

*This document is part of the Galileo Luxury Protocol specification.*
*Requirement coverage: EVENT-07*
