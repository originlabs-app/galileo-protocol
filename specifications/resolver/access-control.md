# Access Control Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-RESOLVER-004

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Methods](#2-authentication-methods)
3. [JWT Token Specification](#3-jwt-token-specification)
4. [Authorization Flow](#4-authorization-flow)
5. [JWKS Configuration](#5-jwks-configuration)
6. [Rate Limiting](#6-rate-limiting)
7. [Error Responses](#7-error-responses)
8. [Security Considerations](#8-security-considerations)
9. [ONCHAINID Integration](#9-onchainid-integration)

---

## 1. Overview

### 1.1 Purpose

This specification defines the authentication and authorization mechanisms for the Galileo resolver. Access control enables:

- **Public access** for consumer-facing product information
- **Authenticated access** for privileged link types (brand, regulator, service center)
- **Role-based authorization** tied to on-chain identity verification

### 1.2 Access Model

The Galileo resolver implements a tiered access model:

| Tier | Authentication | Use Case |
|------|----------------|----------|
| **Public** | None | Consumer product information |
| **Authenticated** | JWT Bearer token | Brand admin, regulator, service center |
| **Verified** | JWT + ONCHAINID claim | Service centers with on-chain verification |

### 1.3 References

- [Resolution Protocol](./resolution-protocol.md) - Resolution algorithm
- [Context Routing](./context-routing.md) - Role-based view selection
- [Claim Topics](../identity/claim-topics.md) - ONCHAINID claim definitions
- [DID Method](../identity/DID-METHOD.md) - Identity resolution

---

## 2. Authentication Methods

### 2.1 Supported Methods

| Method | Header | Use Case |
|--------|--------|----------|
| **Bearer Token (JWT)** | `Authorization: Bearer {token}` | Primary method for all privileged access |
| **No Authentication** | None | Consumer public view only |
| **API Key** | `X-API-Key: {key}` | Rate limiting identification (not authorization) |

### 2.2 Bearer Token (Primary)

JWT Bearer tokens are the primary authentication method for all privileged access.

**Request:**
```http
GET /01/09506000134352/21/ABC123?linkType=galileo:internalDPP
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdhbGlsZW8ta2V5LTEifQ...
```

**Token Requirements:**
- Asymmetric algorithm (RS256 or ES256)
- Valid signature against issuer's public key
- Not expired (`exp` claim)
- Correct audience (`aud` claim)
- Role claim present (`role`)

### 2.3 No Authentication (Public)

Public requests receive consumer view without authentication:

**Request:**
```http
GET /01/09506000134352/21/ABC123
Accept: application/linkset+json
```

**Response:**
- Consumer-accessible links only
- Cached (public, max-age=300)
- Rate limited by IP address

### 2.4 API Key (Rate Limiting Only)

API keys identify callers for rate limiting but do NOT grant authorization:

**Request:**
```http
GET /01/09506000134352/21/ABC123
X-API-Key: gal_live_abc123def456
```

**Behavior:**
- Higher rate limits than anonymous
- Still consumer role (no elevated access)
- Useful for system integrations

---

## 3. JWT Token Specification

### 3.1 Token Structure

Galileo resolver JWTs follow RFC 7519 with specific claim requirements.

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "galileo-key-1"
}
```

**Payload:**
```json
{
  "iss": "https://auth.galileoprotocol.io",
  "sub": "did:galileo:brand:hermesparis",
  "aud": "https://id.galileoprotocol.io",
  "iat": 1738345200,
  "exp": 1738348800,
  "role": "brand",
  "brand_did": "did:galileo:brand:hermesparis",
  "permissions": ["read:dpp", "read:audit"]
}
```

### 3.2 Required Claims

| Claim | Type | Description | Validation |
|-------|------|-------------|------------|
| `iss` | string | Token issuer | Must be `https://auth.galileoprotocol.io` |
| `sub` | string | Subject identifier (user/org DID) | Valid DID format |
| `aud` | string/array | Audience (resolver domain) | Must include `https://id.galileoprotocol.io` |
| `iat` | number | Issued at (Unix timestamp) | Not in future |
| `exp` | number | Expiration (Unix timestamp) | Not expired (max 1 hour from iat) |
| `role` | string | Requester role | One of: `brand`, `regulator`, `service_center` |

### 3.3 Role-Specific Claims

#### Brand Role

```json
{
  "role": "brand",
  "brand_did": "did:galileo:brand:hermesparis"
}
```

| Claim | Required | Description |
|-------|----------|-------------|
| `brand_did` | Yes | Brand DID for authorization scope |
| `permissions` | No | Specific permissions array |

**Authorization:** `brand_did` must match product controller DID.

#### Regulator Role

```json
{
  "role": "regulator",
  "jurisdiction": "FR",
  "authority": "DGCCRF"
}
```

| Claim | Required | Description |
|-------|----------|-------------|
| `jurisdiction` | Yes | ISO 3166-1 alpha-2 country code |
| `authority` | No | Regulatory authority name |
| `permissions` | No | Specific permissions array |

**Authorization:** Jurisdiction may be checked against product geo-restrictions.

#### Service Center Role

```json
{
  "role": "service_center",
  "identity_address": "0x1234...5678",
  "service_types": ["REPAIR", "RESTORATION"]
}
```

| Claim | Required | Description |
|-------|----------|-------------|
| `identity_address` | Yes | ONCHAINID contract address |
| `service_types` | No | Authorized service types |
| `brand_did` | No | Specific brand authorization |

**Authorization:** ONCHAINID must have valid SERVICE_CENTER claim topic.

### 3.4 Optional Claims

| Claim | Type | Description |
|-------|------|-------------|
| `permissions` | string[] | Granular permissions array |
| `products` | string[] | Specific product DIDs (service_center scope) |
| `jti` | string | JWT ID for revocation checking |
| `nbf` | number | Not before timestamp |

### 3.5 Token Lifetime

| Setting | Value | Rationale |
|---------|-------|-----------|
| Maximum lifetime | 1 hour | Security best practice |
| Recommended lifetime | 15 minutes | Active sessions |
| Clock skew tolerance | 30 seconds | System time differences |

---

## 4. Authorization Flow

### 4.1 Complete Authorization Flow

```
1. Extract Bearer token from Authorization header
         |
         v
2. Validate JWT signature against issuer JWKS
         |
   [Invalid] --> 401 Unauthorized (invalid_token)
         |
         v
3. Check exp claim (reject if expired)
         |
   [Expired] --> 401 Unauthorized (expired_token)
         |
         v
4. Check aud claim (must include resolver)
         |
   [Invalid] --> 401 Unauthorized (invalid_audience)
         |
         v
5. Extract role claim
         |
   [Missing] --> 401 Unauthorized (missing_role)
         |
         v
6. Role-specific authorization:
   |
   +--[brand]-----------> Verify brand_did matches product controller
   |                              |
   |                      [Mismatch] --> 403 Forbidden
   |
   +--[regulator]-------> Accept (pre-verified at token issuance)
   |
   +--[service_center]--> Verify ONCHAINID has valid claim
                                  |
                          [Invalid] --> 403 Forbidden
         |
         v
7. Return authorized context
```

### 4.2 Step-by-Step Implementation

```typescript
async function authorizeRequest(
  authHeader: string | null,
  productDID: string,
  requestedLinkType: string | null
): Promise<AuthorizationResult> {

  // Step 1: Extract token
  if (!authHeader) {
    // No auth - check if link type requires it
    if (requestedLinkType && isPrivilegedLinkType(requestedLinkType)) {
      return { authorized: false, error: "missing_token", status: 401 };
    }
    return { authorized: true, role: "consumer" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false, error: "invalid_auth_scheme", status: 401 };
  }

  const token = authHeader.slice(7);

  // Step 2: Validate signature
  const jwks = await getJWKS();
  let decoded: JWTPayload;

  try {
    decoded = await verifyJWT(token, jwks);
  } catch (e) {
    return { authorized: false, error: "invalid_token", status: 401 };
  }

  // Step 3: Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now - CLOCK_SKEW_SECONDS) {
    return { authorized: false, error: "expired_token", status: 401 };
  }

  // Step 4: Check audience
  const audience = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
  if (!audience.includes(RESOLVER_AUDIENCE)) {
    return { authorized: false, error: "invalid_audience", status: 401 };
  }

  // Step 5: Extract role
  if (!decoded.role || !VALID_ROLES.includes(decoded.role)) {
    return { authorized: false, error: "missing_role", status: 401 };
  }

  const role = decoded.role as RequesterRole;

  // Step 6: Role-specific authorization
  switch (role) {
    case "brand":
      return await authorizeBrand(decoded, productDID);

    case "regulator":
      return await authorizeRegulator(decoded, productDID);

    case "service_center":
      return await authorizeServiceCenter(decoded, productDID);

    default:
      return { authorized: false, error: "unknown_role", status: 401 };
  }
}
```

### 4.3 Brand Authorization

```typescript
async function authorizeBrand(
  claims: JWTPayload,
  productDID: string,
  didDocument?: DIDDocument
): Promise<AuthorizationResult> {
  // Brand DID must be present
  if (!claims.brand_did) {
    return {
      authorized: false,
      error: "missing_brand_did",
      status: 401
    };
  }

  // Get product's controller (ONCHAINID address)
  const productRecord = await registry.getRecord(productDID);
  if (!productRecord) {
    return {
      authorized: false,
      error: "product_not_found",
      status: 404
    };
  }

  // Resolve controller ONCHAINID address to brand DID
  // ProductRecord.controller is an address, not a DID
  // We must resolve it via the identity registry
  const controllerDID = await resolveControllerDID(
    productRecord.controller,
    didDocument
  );
  if (!controllerDID) {
    return {
      authorized: false,
      error: "controller_resolution_failed",
      status: 500,
      details: {
        controllerAddress: productRecord.controller
      }
    };
  }

  // Brand DID must match resolved controller DID
  if (claims.brand_did !== controllerDID) {
    return {
      authorized: false,
      error: "brand_did_mismatch",
      status: 403,
      details: {
        provided: claims.brand_did,
        expected: controllerDID
      }
    };
  }

  return {
    authorized: true,
    role: "brand",
    identity: claims.sub,
    brandDID: claims.brand_did
  };
}
```

### 4.3.1 Controller DID Resolution

The `ProductRecord.controller` field stores an ONCHAINID contract address, not a DID string. Resolution is required:

```typescript
/**
 * Resolve ONCHAINID address to brand DID
 * Uses the identity's DID claim or derives from address
 */
async function resolveControllerDID(
  controllerAddress: string,
  didDocument?: DIDDocument
): Promise<string | null> {
  // Option 1 (preferred): Use controller from DID document
  // The resolver already fetches the DID document in the resolution flow.
  if (didDocument?.controller) {
    return didDocument.controller;
  }

  // Option 2: Resolve via consortium brand registry mapping
  // Maps ONCHAINID controller address -> brand DID
  const brandInfo = await brandRegistry.getBrandByIdentity(controllerAddress);
  if (brandInfo?.did) {
    return brandInfo.did;
  }

  return null;
}
```

**Reference:** [DID-METHOD.md Section 2.4](../identity/DID-METHOD.md#24-examples) for brand DID format.

### 4.4 Regulator Authorization

```typescript
async function authorizeRegulator(
  claims: JWTPayload,
  productDID: string
): Promise<AuthorizationResult> {
  // Jurisdiction should be present
  if (!claims.jurisdiction) {
    return {
      authorized: false,
      error: "missing_jurisdiction",
      status: 401
    };
  }

  // SECURITY DESIGN DECISION: JWT-only verification for regulators
  //
  // Unlike service centers, regulators are NOT verified via ONCHAINID.
  // This is an explicit security choice:
  //
  // 1. Regulatory authorities operate outside commercial blockchain networks
  // 2. Regulator verification occurs at token issuance by auth.galileoprotocol.io
  // 3. The auth service maintains a whitelist of approved regulatory bodies
  // 4. Token issuance requires out-of-band verification (legal agreements)
  //
  // This means the security boundary is the JWT issuer (auth.galileoprotocol.io),
  // NOT the on-chain identity registry. The auth service is responsible for
  // validating regulator identity before issuing tokens.
  //
  // See: TSC decision TSC-2026-007 (Regulator Authentication Policy)

  // Optional: check jurisdiction against product geo-restrictions
  // (e.g., FR regulator can only access EU-market products)

  return {
    authorized: true,
    role: "regulator",
    identity: claims.sub,
    jurisdiction: claims.jurisdiction
  };
}
```

### 4.5 Service Center Authorization

```typescript
async function authorizeServiceCenter(
  claims: JWTPayload,
  productDID: string
): Promise<AuthorizationResult> {
  // Identity address must be present
  if (!claims.identity_address) {
    return {
      authorized: false,
      error: "missing_identity_address",
      status: 401
    };
  }

  // Verify ONCHAINID has SERVICE_CENTER claim
  const hasValidClaim = await identityRegistry.hasValidClaim(
    claims.identity_address,
    SERVICE_CENTER_TOPIC
  );

  if (!hasValidClaim) {
    return {
      authorized: false,
      error: "invalid_service_center_claim",
      status: 403,
      details: {
        identity: claims.identity_address,
        requiredClaim: "SERVICE_CENTER"
      }
    };
  }

  // Optional: check if authorized for this product's brand
  const productBrand = await getProductBrand(productDID);
  const claimData = await getClaimData(
    claims.identity_address,
    SERVICE_CENTER_TOPIC
  );

  if (claimData.brandDID && claimData.brandDID !== "*") {
    if (claimData.brandDID !== productBrand) {
      return {
        authorized: false,
        error: "service_center_brand_mismatch",
        status: 403
      };
    }
  }

  return {
    authorized: true,
    role: "service_center",
    identity: claims.sub,
    serviceTypes: claims.service_types
  };
}
```

---

## 5. JWKS Configuration

### 5.1 JWKS Endpoint

The Galileo authentication service publishes keys at:

```
https://auth.galileoprotocol.io/.well-known/jwks.json
```

### 5.2 JWKS Structure

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "galileo-key-1",
      "alg": "RS256",
      "n": "0vx7agoebGc...",
      "e": "AQAB"
    },
    {
      "kty": "EC",
      "use": "sig",
      "kid": "galileo-key-2",
      "alg": "ES256",
      "crv": "P-256",
      "x": "f83OJ3D2xF1Bg...",
      "y": "x_FEzRu9m36HLN..."
    }
  ]
}
```

### 5.3 Key Selection

Token `kid` header selects the verification key:

```typescript
function selectKey(jwks: JWKS, token: string): JWK {
  const header = decodeJWTHeader(token);

  if (!header.kid) {
    // Use first key matching algorithm
    return jwks.keys.find(k => k.alg === header.alg);
  }

  const key = jwks.keys.find(k => k.kid === header.kid);
  if (!key) {
    throw new Error(`Key ${header.kid} not found in JWKS`);
  }

  return key;
}
```

### 5.4 Key Rotation

| Parameter | Value | Description |
|-----------|-------|-------------|
| JWKS cache TTL | 24 hours | Cache duration |
| Invalidation trigger | 401 response | Force refresh on auth failure |
| Overlap period | 7 days | Old key valid during rotation |
| Key lifetime | 1 year | Recommended rotation frequency |

**Rotation Process:**
1. Generate new key pair with new `kid`
2. Add new public key to JWKS
3. Start signing new tokens with new key
4. After overlap period, remove old key from JWKS

### 5.5 Supported Algorithms

| Algorithm | Key Type | Security Level | Use Case |
|-----------|----------|----------------|----------|
| RS256 | RSA 2048+ | Standard | General use |
| RS384 | RSA 3072+ | Higher | Extended validity |
| RS512 | RSA 4096 | Maximum | High-value operations |
| ES256 | EC P-256 | Standard | Mobile/IoT |
| ES384 | EC P-384 | Higher | Enterprise |
| ES512 | EC P-521 | Maximum | High security |

**Not Supported:**
- HS256/HS384/HS512 (symmetric - requires shared secret)
- none (unsigned - insecure)

---

## 6. Rate Limiting

### 6.1 Rate Limit Tiers

| Tier | Identification | Requests/Minute | Use Case |
|------|----------------|-----------------|----------|
| Anonymous | IP address | 100 | Consumer scans |
| API Key | X-API-Key header | 1,000 | System integrations |
| Authenticated | JWT token | 10,000 | Application access |
| Brand Admin | JWT + brand role | 50,000 | Bulk operations |

### 6.2 Rate Limit Headers

**Response Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1738345260
Retry-After: 45
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests in window |
| `X-RateLimit-Remaining` | Requests remaining in window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds until rate limit lifts (on 429) |

### 6.3 Rate Limit Algorithm

Sliding window counter per identifier:

```typescript
interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  anonymous: { windowSeconds: 60, maxRequests: 100 },
  api_key: { windowSeconds: 60, maxRequests: 1000 },
  authenticated: { windowSeconds: 60, maxRequests: 10000 },
  brand_admin: { windowSeconds: 60, maxRequests: 50000 }
};

async function checkRateLimit(
  identifier: string,
  tier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[tier];
  const key = `ratelimit:${tier}:${identifier}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, config.windowSeconds);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed: current <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - current),
    reset: Math.floor(Date.now() / 1000) + ttl
  };
}
```

### 6.4 Rate Limit Response

**429 Too Many Requests:**

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1738345260
Retry-After: 45

{
  "error": "rateLimited",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Retry after 45 seconds.",
  "retryAfter": 45
}
```

### 6.5 Burst Allowance

| Tier | Burst Multiplier | Burst Requests |
|------|------------------|----------------|
| Anonymous | 2x | 200 |
| API Key | 2x | 2,000 |
| Authenticated | 1.5x | 15,000 |
| Brand Admin | 1.5x | 75,000 |

Burst allows temporary spikes above normal limits.

---

## 7. Error Responses

### 7.1 401 Unauthorized

Returned when authentication is required but missing or invalid.

**Missing Token:**
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="galileo"
Content-Type: application/json

{
  "error": "unauthorized",
  "errorCode": "MISSING_TOKEN",
  "message": "Authentication required for link type galileo:internalDPP",
  "details": {
    "requestedLinkType": "galileo:internalDPP",
    "requiredRole": "brand"
  }
}
```

**Invalid Token:**
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="galileo", error="invalid_token", error_description="JWT signature verification failed"
Content-Type: application/json

{
  "error": "unauthorized",
  "errorCode": "INVALID_TOKEN",
  "message": "JWT signature verification failed"
}
```

**Expired Token:**
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="galileo", error="invalid_token", error_description="Token expired"
Content-Type: application/json

{
  "error": "unauthorized",
  "errorCode": "EXPIRED_TOKEN",
  "message": "JWT token has expired",
  "details": {
    "expiredAt": "2026-01-31T10:00:00Z"
  }
}
```

### 7.2 403 Forbidden

Returned when authenticated but not authorized for the requested resource.

**Insufficient Role:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "forbidden",
  "errorCode": "INSUFFICIENT_ROLE",
  "message": "Your role 'service_center' cannot access link type 'galileo:auditTrail'",
  "details": {
    "yourRole": "service_center",
    "requiredRole": ["brand", "regulator"],
    "requestedLinkType": "galileo:auditTrail"
  }
}
```

**Brand DID Mismatch:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "forbidden",
  "errorCode": "BRAND_DID_MISMATCH",
  "message": "Your brand DID does not match the product controller",
  "details": {
    "yourBrandDID": "did:galileo:brand:chanel",
    "productController": "did:galileo:brand:hermesparis"
  }
}
```

**Invalid Service Center Claim:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "forbidden",
  "errorCode": "INVALID_SERVICE_CENTER_CLAIM",
  "message": "No valid SERVICE_CENTER claim found on ONCHAINID",
  "details": {
    "identityAddress": "0x1234...5678",
    "requiredClaimTopic": "SERVICE_CENTER"
  }
}
```

### 7.3 WWW-Authenticate Header

Format per RFC 6750:

```
WWW-Authenticate: Bearer realm="galileo" [, error="error_code"] [, error_description="description"]
```

| Error Code | Description |
|------------|-------------|
| `invalid_request` | Malformed request |
| `invalid_token` | Token validation failed |
| `insufficient_scope` | Token lacks required scope |

---

## 8. Security Considerations

### 8.1 Transport Security

| Requirement | Specification |
|-------------|---------------|
| Protocol | HTTPS only (HTTP rejected) |
| TLS Version | 1.2 minimum, 1.3 recommended |
| Cipher Suites | Modern suites only (no RC4, DES, 3DES) |
| HSTS | Enabled with max-age=31536000 |

### 8.2 Token Security

| Requirement | Implementation |
|-------------|----------------|
| Transmission | HTTPS only |
| Storage | Never log full tokens |
| Lifetime | 1 hour maximum |
| Algorithm | Asymmetric only (RS256, ES256) |
| Signature | Always verify (never accept unsigned) |
| Clock skew | 30 seconds tolerance |

### 8.3 Token Handling Best Practices

**Do:**
- Validate signature before parsing claims
- Check `exp` and `aud` claims
- Use constant-time comparison for sensitive values
- Log authorization failures (without token)
- Rotate keys periodically

**Don't:**
- Log full token contents
- Accept `alg: none` tokens
- Cache tokens (cache authorization results only)
- Use symmetric algorithms (HS256)
- Ignore token expiration

### 8.4 Defense in Depth

| Layer | Protection |
|-------|------------|
| Network | TLS, firewall rules |
| Application | JWT validation, rate limiting |
| Data | Role-based filtering, field redaction |
| Audit | Access logging, anomaly detection |

### 8.5 Audit Logging

All authorization decisions are logged:

```json
{
  "timestamp": "2026-01-31T10:30:00Z",
  "event": "authorization",
  "decision": "granted",
  "requester": {
    "identity": "did:galileo:brand:hermesparis",
    "role": "brand",
    "ip": "192.168.1.100"
  },
  "resource": {
    "productDID": "did:galileo:01:09506000134352:21:ABC123",
    "linkType": "galileo:internalDPP"
  },
  "tokenId": "jti-abc123"
}
```

**Logged Events:**
- Authorization granted
- Authorization denied (with reason)
- Token validation failures
- Rate limit triggers
- ONCHAINID claim verification results

---

## 9. ONCHAINID Integration

### 9.1 Overview

Service center authorization requires on-chain identity verification via ONCHAINID (ERC-3643 compliant).

**Verification Flow:**
1. Extract `identity_address` from JWT
2. Query ONCHAINID for SERVICE_CENTER claim
3. Verify claim not expired and not revoked
4. Optionally verify brand authorization

### 9.2 SERVICE_CENTER Claim Topic

**Namespace:** `galileoprotocol.io.service_center`

**Topic ID:**
```
0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2
```

**Computation:**
```solidity
uint256 topicId = uint256(keccak256(bytes("galileoprotocol.io.service_center")));
```

### 9.3 Claim Verification Interface

```typescript
interface IdentityRegistryInterface {
  /**
   * Check if identity has valid claim for topic
   */
  hasValidClaim(
    identity: address,
    claimTopic: uint256
  ): boolean;

  /**
   * Get claim data for topic
   */
  getClaim(
    identity: address,
    claimTopic: uint256
  ): ClaimData;

  /**
   * Check if claim issuer is trusted for topic
   */
  isTrustedIssuer(
    issuer: address,
    claimTopic: uint256
  ): boolean;
}

interface ClaimData {
  topic: uint256;
  scheme: uint256;
  issuer: address;
  signature: bytes;
  data: bytes;
  uri: string;
}
```

### 9.4 Claim Data Decoding

SERVICE_CENTER claim data is ABI-encoded:

```solidity
struct ServiceCenterClaimData {
    string brandDID;        // Brand authorization ("*" for any)
    string[] serviceTypes;  // Authorized service types
    uint256 certifiedAt;    // Certification timestamp
    uint256 facilityInspection; // Last inspection timestamp
}
```

**Decoding:**
```typescript
function decodeServiceCenterClaim(data: bytes): ServiceCenterClaimData {
  return abi.decode(
    data,
    ["string", "string[]", "uint256", "uint256"]
  );
}
```

### 9.5 Verification Implementation

```typescript
const SERVICE_CENTER_TOPIC = BigInt(
  "0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2"
);

async function verifyServiceCenterClaim(
  identityAddress: string,
  productBrandDID: string | null
): Promise<VerificationResult> {
  // 1. Check identity exists
  const identity = await identityRegistry.getIdentity(identityAddress);
  if (!identity) {
    return { valid: false, reason: "identity_not_found" };
  }

  // 2. Check for SERVICE_CENTER claim
  const hasClaim = await identityRegistry.hasValidClaim(
    identityAddress,
    SERVICE_CENTER_TOPIC
  );

  if (!hasClaim) {
    return { valid: false, reason: "claim_not_found" };
  }

  // 3. Get claim details
  const claim = await identityRegistry.getClaim(
    identityAddress,
    SERVICE_CENTER_TOPIC
  );

  // 4. Verify issuer is trusted
  const isTrusted = await trustedIssuersRegistry.isTrustedIssuer(
    claim.issuer,
    SERVICE_CENTER_TOPIC
  );

  if (!isTrusted) {
    return { valid: false, reason: "untrusted_issuer" };
  }

  // 5. Decode and check claim data
  const claimData = decodeServiceCenterClaim(claim.data);

  // 6. Check brand authorization (if applicable)
  if (productBrandDID && claimData.brandDID !== "*") {
    if (claimData.brandDID !== productBrandDID) {
      return { valid: false, reason: "brand_not_authorized" };
    }
  }

  return {
    valid: true,
    serviceTypes: claimData.serviceTypes,
    certifiedAt: claimData.certifiedAt
  };
}
```

### 9.6 Caching ONCHAINID Verification

| Cache Setting | Value | Rationale |
|---------------|-------|-----------|
| TTL | 5 minutes | Balance freshness vs. performance |
| Invalidation | On-chain events | ClaimRevoked, IdentityRemoved |
| Key | `onchainid:{address}:{topic}` | Per identity per topic |

---

## Appendix A: Token Examples

### Example 1: Brand Admin Token

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "galileo-key-1"
  },
  "payload": {
    "iss": "https://auth.galileoprotocol.io",
    "sub": "did:galileo:brand:hermesparis",
    "aud": "https://id.galileoprotocol.io",
    "iat": 1738345200,
    "exp": 1738348800,
    "role": "brand",
    "brand_did": "did:galileo:brand:hermesparis",
    "permissions": ["read:dpp", "read:audit", "read:events"]
  }
}
```

### Example 2: Regulator Token

```json
{
  "header": {
    "alg": "ES256",
    "typ": "JWT",
    "kid": "galileo-key-2"
  },
  "payload": {
    "iss": "https://auth.galileoprotocol.io",
    "sub": "did:galileo:regulator:dgccrf-fr",
    "aud": "https://id.galileoprotocol.io",
    "iat": 1738345200,
    "exp": 1738348800,
    "role": "regulator",
    "jurisdiction": "FR",
    "authority": "DGCCRF",
    "permissions": ["read:compliance", "read:audit"]
  }
}
```

### Example 3: Service Center Token

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "galileo-key-1"
  },
  "payload": {
    "iss": "https://auth.galileoprotocol.io",
    "sub": "did:galileo:service:paris-atelier",
    "aud": "https://id.galileoprotocol.io",
    "iat": 1738345200,
    "exp": 1738348800,
    "role": "service_center",
    "identity_address": "0x1234567890abcdef1234567890abcdef12345678",
    "service_types": ["REPAIR", "RESTORATION"],
    "brand_did": "did:galileo:brand:hermesparis"
  }
}
```

---

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [resolution-protocol.md](./resolution-protocol.md) | Resolution algorithm |
| [context-routing.md](./context-routing.md) | Role-based routing |
| [claim-topics.md](../identity/claim-topics.md) | ONCHAINID claims |
| [DID-METHOD.md](../identity/DID-METHOD.md) | Identity DIDs |
| [RFC 7519](https://datatracker.ietf.org/doc/rfc7519/) | JWT specification |
| [RFC 6750](https://datatracker.ietf.org/doc/rfc6750/) | Bearer token usage |
| [RFC 7517](https://datatracker.ietf.org/doc/rfc7517/) | JWK specification |

---

*Galileo Luxury Standard - Resolver Layer*
*Specification: GSPEC-RESOLVER-004*
*Classification: Public*
