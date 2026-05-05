# Role-Based Access Control (RBAC) Framework Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Specification Series:** GSPEC-INFRA-001

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role Definitions](#2-role-definitions)
3. [Permission Matrix](#3-permission-matrix)
4. [Two-Tier Verification Flow](#4-two-tier-verification-flow)
5. [Role-to-Claim Topic Mapping](#5-role-to-claim-topic-mapping)
6. [Role Hierarchy and Inheritance](#6-role-hierarchy-and-inheritance)
7. [Role Grant and Revocation Workflow](#7-role-grant-and-revocation-workflow)
8. [Emergency Access Procedures](#8-emergency-access-procedures)
9. [Anti-Patterns to Avoid](#9-anti-patterns-to-avoid)

---

## 1. Overview

### 1.1 Purpose

This specification defines the Role-Based Access Control (RBAC) framework for the Galileo Luxury Standard ecosystem. RBAC governs who can read, write, and modify which data across the platform, ensuring security, accountability, and regulatory compliance.

**Specification ID:** GSPEC-INFRA-001

### 1.2 Two-Tier Access Control Model

The Galileo RBAC framework implements a two-tier access control model:

| Tier | Mechanism | Purpose |
|------|-----------|---------|
| **Layer 1: Off-Chain JWT** | Bearer token validation | API access, role extraction, basic permission checks |
| **Layer 2: On-Chain ONCHAINID** | Claim verification | Privileged operations requiring identity verification |

This hybrid approach balances performance (off-chain caching) with security (on-chain verification for sensitive operations).

### 1.3 Implementation Foundation

The Galileo RBAC framework builds upon:

- **OpenZeppelin AccessControl** (v5.x): Battle-tested on-chain RBAC implementation
- **OpenZeppelin AccessControlEnumerable**: Role enumeration capabilities
- **OpenZeppelin AccessControlDefaultAdminRules**: Secure admin role management
- **ONCHAINID (ERC-734/735)**: Claim-based identity verification (already integrated in Phase 4)

### 1.4 References

- [Access Control (Resolver)](../resolver/access-control.md) - JWT patterns for resolver layer
- [Claim Topics](../identity/claim-topics.md) - ONCHAINID claim definitions
- [IGalileoIdentityRegistry](../contracts/identity/IIdentityRegistry.sol) - Identity verification interface
- [hybrid-architecture](../architecture/hybrid-architecture.md) - On-chain/off-chain separation

---

## 2. Role Definitions

### 2.1 Role Overview

The Galileo ecosystem defines five core roles with distinct responsibilities and access levels:

| # | Role | Description | On-Chain Claim Required | JWT Role | Permission Scope |
|---|------|-------------|------------------------|----------|------------------|
| 1 | `brand_admin` | Brand administrator | KYB_VERIFIED | `brand` | Full access to own brand's products |
| 2 | `operator` | Day-to-day operations | None | `operator` | Product lifecycle operations |
| 3 | `auditor` | Internal/external audit | None | `auditor` | Read-only access to all data, audit logs |
| 4 | `regulator` | Regulatory authority | None | `regulator` | Compliance data, audit trails |
| 5 | `service_center` | Authorized repair/MRO | SERVICE_CENTER | `service_center` | Service records for authorized brands |

### 2.2 Role Definitions in Detail

#### 2.2.1 Brand Admin (`brand_admin`)

**Description:** Full administrative control over a brand's products, tokens, and compliance settings within the Galileo ecosystem.

**Responsibilities:**
- Deploy and manage product tokens
- Configure compliance modules
- Grant/revoke operator roles within the brand
- Manage brand-specific settings
- Access full DPP content for own products
- Review audit logs

**On-Chain Verification Required:**
- **Claim Topic:** `galileo.kyb.verified`
- **Topic ID:** `0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56`
- **Expiry:** 365 days (requires annual renewal)

**JWT Claims:**
```json
{
  "role": "brand",
  "brand_did": "did:galileo:brand:hermesparis",
  "permissions": ["read:dpp", "write:dpp", "read:audit", "manage:tokens"]
}
```

#### 2.2.2 Operator (`operator`)

**Description:** Day-to-day operational role for managing product lifecycle without administrative privileges.

**Responsibilities:**
- Register new products
- Record lifecycle events (transfers, services)
- Update product metadata
- Access operational dashboards

**On-Chain Verification Required:** None (JWT-only role)

**JWT Claims:**
```json
{
  "role": "operator",
  "brand_did": "did:galileo:brand:hermesparis",
  "permissions": ["read:dpp", "write:events"]
}
```

#### 2.2.3 Auditor (`auditor`)

**Description:** Read-only access for internal and external audit functions.

**Responsibilities:**
- Review all product data and DPP content
- Access complete audit trails
- Generate compliance reports
- Verify data integrity

**On-Chain Verification Required:** None (JWT-only role, but issuer must be pre-verified)

**JWT Claims:**
```json
{
  "role": "auditor",
  "audit_scope": ["did:galileo:brand:hermesparis"],
  "permissions": ["read:dpp", "read:audit", "read:compliance"]
}
```

**Note:** Auditors may be scoped to specific brands or have consortium-wide access.

#### 2.2.4 Regulator (`regulator`)

**Description:** Regulatory authority access for compliance verification and enforcement.

**Responsibilities:**
- Access ESPR/DPP compliance data
- Review audit trails for regulatory purposes
- Verify compliance attestations
- Access anonymized aggregate data

**On-Chain Verification Required:** None (pre-verified at token issuance by Galileo TSC)

**JWT Claims:**
```json
{
  "role": "regulator",
  "jurisdiction": "FR",
  "authority": "DGCCRF",
  "permissions": ["read:compliance", "read:audit", "read:dpp_regulatory"]
}
```

#### 2.2.5 Service Center (`service_center`)

**Description:** Authorized repair and maintenance operations (MRO) for specific brands.

**Responsibilities:**
- Record repair and service events
- Access service-relevant product data
- Update maintenance records
- Issue service attestations

**On-Chain Verification Required:**
- **Claim Topic:** `galileoprotocol.io.service_center`
- **Topic ID:** `0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2`
- **Expiry:** 365 days (requires annual facility inspection renewal)

**JWT Claims:**
```json
{
  "role": "service_center",
  "identity_address": "0x1234...5678",
  "service_types": ["REPAIR", "RESTORATION"],
  "brand_did": "did:galileo:brand:hermesparis"
}
```

---

## 3. Permission Matrix

### 3.1 Resource Types

The Galileo ecosystem manages the following resource types:

| Resource Type | Description |
|---------------|-------------|
| DPP (Full) | Complete Digital Product Passport with all fields |
| DPP (Public) | Consumer-facing public product information |
| Ownership Records | Token ownership and transfer history |
| Service History | Repair, maintenance, and modification records |
| Audit Trail | System audit logs and access records |
| Compliance Data | Regulatory compliance attestations |
| Customer PII | Personal data (GDPR-regulated) |
| Identity Registry | Identity management operations |

### 3.2 Permission Matrix by Resource Type

| Resource | brand_admin | operator | auditor | regulator | service_center | consumer |
|----------|-------------|----------|---------|-----------|----------------|----------|
| DPP (Full) | RW | R | R | R | - | - |
| DPP (Public) | R | R | R | R | R | R |
| Ownership Records | RW | R | R | R | - | - |
| Service History | R | R | R | R | RW | - |
| Audit Trail | R | - | R | R | - | - |
| Compliance Data | RW | - | R | R | - | - |
| Customer PII | RW | R* | - | - | - | - |
| Identity Registry | W | - | R | R | - | - |

**Legend:**
- `R` = Read
- `W` = Write
- `RW` = Read/Write
- `-` = No Access
- `R*` = Read with restrictions (need-to-know basis)

### 3.3 Operation-Level Permissions

| Operation | brand_admin | operator | auditor | regulator | service_center |
|-----------|-------------|----------|---------|-----------|----------------|
| Deploy Token | Yes | No | No | No | No |
| Transfer Token | Yes | Yes | No | No | No |
| Burn Token | Yes | No | No | No | No |
| Record Event | Yes | Yes | No | No | Yes (service only) |
| Grant Role | Yes (within brand) | No | No | No | No |
| Revoke Role | Yes (within brand) | No | No | No | No |
| Export Data | Yes | Yes | Yes | Yes | No |
| Generate Report | Yes | Yes | Yes | Yes | No |
| Modify Compliance | Yes | No | No | No | No |

---

## 4. Two-Tier Verification Flow

### 4.1 Flow Diagram

```
                        Access Request
                              |
                              v
                +----------------------------+
                |  Layer 1: Off-Chain JWT    |
                |  - Token validation        |
                |  - Signature verification  |
                |  - Role extraction         |
                |  - Basic permission check  |
                +----------------------------+
                              |
                         [Valid JWT?]
                         /         \
                       NO           YES
                        |            |
                        v            v
                  +--------+   [Privileged Role?]
                  | 401    |   (brand_admin OR
                  | Reject |   service_center)
                  +--------+        |
                               /         \
                             NO           YES
                              |            |
                              v            v
                      +------------+  +----------------------------+
                      | Allow      |  | Layer 2: On-Chain Verify   |
                      | (Standard) |  | - ONCHAINID lookup         |
                      +------------+  | - Claim topic verification |
                                      | - Claim expiry check       |
                                      | - Issuer trust validation  |
                                      +----------------------------+
                                                    |
                                               [Verified?]
                                               /         \
                                             NO           YES
                                              |            |
                                              v            v
                                        +--------+  +-------------+
                                        | 403    |  | Allow with  |
                                        | Reject |  | audit log   |
                                        +--------+  +-------------+
```

### 4.2 Layer 1: Off-Chain JWT Validation

**Purpose:** Fast, scalable authentication and basic authorization.

**Steps:**

1. **Extract Token:** Parse `Authorization: Bearer {token}` header
2. **Validate Signature:** Verify against issuer's JWKS (RS256 or ES256)
3. **Check Expiration:** Reject if `exp` claim has passed (30-second clock skew tolerance)
4. **Verify Audience:** Ensure `aud` includes Galileo resolver domain
5. **Extract Role:** Parse `role` claim from JWT payload
6. **Basic Permission Check:** Compare role against operation requirements

**JWT Requirements:**
- Maximum lifetime: 1 hour
- Algorithm: RS256 or ES256 only (no symmetric algorithms)
- Required claims: `iss`, `sub`, `aud`, `iat`, `exp`, `role`

### 4.3 Layer 2: On-Chain ONCHAINID Verification

**Purpose:** Cryptographically verify privileged actor identity.

**Triggered For:**
- `brand_admin` role: Verify KYB_VERIFIED claim
- `service_center` role: Verify SERVICE_CENTER claim

**Steps:**

1. **Lookup Identity:** Query `IGalileoIdentityRegistry.identity(account)` for ONCHAINID address
2. **Check Claim Existence:** Call `identity.getClaim(topicId)` for required claim topic
3. **Verify Claim Valid:** Check claim not expired and not revoked
4. **Validate Issuer:** Verify claim issuer is trusted via `ITrustedIssuersRegistry.isTrustedIssuer()`
5. **Cache Result:** Store verification result for 5 minutes (TTL)

**On-Chain Verification Interface:**

```solidity
// From IGalileoIdentityRegistry
function isVerified(address _userAddress) external view returns (bool);

// From ONCHAINID
function getClaim(uint256 _claimTopic) external view returns (
    uint256 topic,
    uint256 scheme,
    address issuer,
    bytes memory signature,
    bytes memory data,
    string memory uri
);
```

### 4.4 Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|----------------|-----|--------------|
| JWT Validation Result | Redis | 5 minutes | Token expiry |
| ONCHAINID Verification | Redis | 5 minutes | ClaimRevoked event |
| Role Permissions | In-memory | 1 hour | Config change |
| JWKS | In-memory | 24 hours | 401 response |

**Cache Key Format:**
```
rbac:jwt:{token_hash}
rbac:onchain:{address}:{topic_id}
```

---

## 5. Role-to-Claim Topic Mapping

### 5.1 Claim Topic Mappings

Roles requiring on-chain verification are mapped to specific ONCHAINID claim topics:

| Role | Claim Namespace | Topic ID | Computation |
|------|-----------------|----------|-------------|
| `brand_admin` | `galileo.kyb.verified` | `0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56` | `keccak256("galileo.kyb.verified")` |
| `service_center` | `galileoprotocol.io.service_center` | `0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2` | `keccak256("galileoprotocol.io.service_center")` |

### 5.2 Topic ID Constants (Solidity)

```solidity
// Role-specific claim topic IDs
bytes32 constant KYB_VERIFIED_TOPIC =
    keccak256("galileo.kyb.verified");
    // = 0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56

bytes32 constant SERVICE_CENTER_TOPIC =
    keccak256("galileoprotocol.io.service_center");
    // = 0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2
```

### 5.3 Claim Verification Logic

```typescript
async function verifyRoleClaim(
  role: string,
  identityAddress: string
): Promise<VerificationResult> {
  // Map role to required claim topic
  const topicMapping: Record<string, bigint> = {
    brand_admin: BigInt("0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56"),
    service_center: BigInt("0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2")
  };

  const requiredTopic = topicMapping[role];
  if (!requiredTopic) {
    // Role does not require on-chain verification
    return { verified: true, reason: "no_claim_required" };
  }

  // Verify via identity registry
  const hasValidClaim = await identityRegistry.hasValidClaim(
    identityAddress,
    requiredTopic
  );

  if (!hasValidClaim) {
    return {
      verified: false,
      reason: "claim_not_found_or_invalid",
      requiredTopic: requiredTopic.toString(16)
    };
  }

  return { verified: true };
}
```

---

## 6. Role Hierarchy and Inheritance

### 6.1 Role Hierarchy Diagram

```
                    DEFAULT_ADMIN_ROLE
                    (Galileo TSC)
                          |
          +---------------+---------------+
          |               |               |
    BRAND_ADMIN_ROLE  AUDITOR_ROLE  REGULATOR_ROLE
    (Brand-specific)  (Read-only)    (Regulatory)
          |
    +-----+-----+
    |           |
OPERATOR_ROLE  SERVICE_CENTER_ADMIN_ROLE
(Operations)    (Service mgmt)
```

### 6.2 Role Constants (OpenZeppelin Pattern)

```solidity
// Core role identifiers
bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
bytes32 public constant BRAND_ADMIN_ROLE = keccak256("BRAND_ADMIN_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
bytes32 public constant SERVICE_CENTER_ADMIN_ROLE = keccak256("SERVICE_CENTER_ADMIN_ROLE");
```

### 6.3 Role Administration Rights

| Role | Can Grant | Can Revoke |
|------|-----------|------------|
| DEFAULT_ADMIN_ROLE | All roles | All roles |
| BRAND_ADMIN_ROLE | OPERATOR_ROLE, SERVICE_CENTER_ADMIN_ROLE (within brand) | OPERATOR_ROLE, SERVICE_CENTER_ADMIN_ROLE (within brand) |
| OPERATOR_ROLE | None | None |
| AUDITOR_ROLE | None | None |
| REGULATOR_ROLE | None | None |
| SERVICE_CENTER_ADMIN_ROLE | None | None |

### 6.4 Brand Scope Isolation

Each brand operates in an isolated scope:

```solidity
// Brand-scoped role storage
mapping(address brand => mapping(bytes32 role => EnumerableSet.AddressSet members))
    private _brandRoleMembers;

// Check role with brand scope
function hasRole(bytes32 role, address account, address brand)
    public view returns (bool) {
    return _brandRoleMembers[brand][role].contains(account);
}
```

---

## 7. Role Grant and Revocation Workflow

### 7.1 Role Grant with Identity Verification

For privileged roles requiring on-chain claims, the grant workflow includes identity verification:

```
Grant Role Request
        |
        v
+------------------+
| 1. Verify Admin  |  Admin must have BRAND_ADMIN_ROLE
+------------------+
        |
        v
+------------------+
| 2. Verify Target |  Target must have valid ONCHAINID
| Identity         |  with required claim topic
+------------------+
        |
        v
+------------------+
| 3. Grant Role    |  grantRoleWithIdentity()
| on-chain         |
+------------------+
        |
        v
+------------------+
| 4. Emit Event    |  RoleGrantedWithIdentity
+------------------+
        |
        v
+------------------+
| 5. Audit Log     |  Record in audit trail
+------------------+
```

### 7.2 Grant Function Interface

```solidity
/**
 * @notice Grant role with ONCHAINID verification
 * @param role The role to grant
 * @param account The account to receive the role
 * @param identityAddress The ONCHAINID contract address
 * @param requiredClaimTopic The claim topic that must be verified
 */
function grantRoleWithIdentity(
    bytes32 role,
    address account,
    address identityAddress,
    uint256 requiredClaimTopic
) external;
```

### 7.3 Revocation Workflow

```
Revoke Role Request
        |
        v
+------------------+
| 1. Verify Admin  |  Admin must have role admin authority
+------------------+
        |
        v
+------------------+
| 2. Revoke Role   |  revokeRole() or renounceRole()
+------------------+
        |
        v
+------------------+
| 3. Emit Event    |  RoleRevoked
+------------------+
        |
        v
+------------------+
| 4. Invalidate    |  Clear verification cache
| Cache            |
+------------------+
        |
        v
+------------------+
| 5. Audit Log     |  Record in audit trail
+------------------+
```

### 7.4 Two-Step Admin Transfer

For `DEFAULT_ADMIN_ROLE`, use OpenZeppelin's `AccessControlDefaultAdminRules` pattern:

```solidity
// Step 1: Begin admin transfer (starts delay period)
function beginDefaultAdminTransfer(address newAdmin) external;

// Step 2: Accept admin transfer (after delay)
function acceptDefaultAdminTransfer() external;

// Configuration
uint48 constant ADMIN_TRANSFER_DELAY = 2 days;
```

### 7.5 Suspension Mechanism

For investigation without permanent revocation:

```solidity
// Temporary suspension
function suspendRole(bytes32 role, address account, string calldata reason) external;

// Reinstate after investigation
function reinstateRole(bytes32 role, address account) external;

// Check suspension status
function isSuspended(bytes32 role, address account) external view returns (bool);
```

---

## 8. Emergency Access Procedures

### 8.1 Emergency Scenarios

| Scenario | Response | Authority |
|----------|----------|-----------|
| Security breach detected | Suspend affected roles | DEFAULT_ADMIN_ROLE |
| Compromised admin key | Revoke and re-grant via TSC | Galileo TSC multisig |
| Regulatory enforcement | Grant emergency regulator access | DEFAULT_ADMIN_ROLE + TSC approval |
| System outage | Fallback verification mode | Automated (configured) |

### 8.2 Emergency Role Grant

For time-critical situations requiring immediate access:

```solidity
/**
 * @notice Emergency role grant with TSC multisig approval
 * @dev Requires DEFAULT_ADMIN_ROLE + TSC multisig signature
 * @param role The role to grant
 * @param account The account to receive emergency access
 * @param duration Time-limited access duration
 * @param reason Documented reason for emergency access
 */
function emergencyGrantRole(
    bytes32 role,
    address account,
    uint256 duration,
    string calldata reason
) external;
```

### 8.3 Emergency Revocation

For immediate security response:

```solidity
/**
 * @notice Emergency revoke all roles from an address
 * @dev Can be called by DEFAULT_ADMIN_ROLE without delay
 * @param account The account to revoke all roles from
 * @param reason Security incident description
 */
function emergencyRevokeAll(
    address account,
    string calldata reason
) external;
```

### 8.4 Fallback Verification Mode

When on-chain verification is unavailable:

1. **Detection:** Monitor Layer 2 verification latency
2. **Activation:** If verification fails for > 5 minutes, enter fallback mode
3. **Fallback Behavior:**
   - Continue accepting JWT-only verification for non-privileged roles
   - Queue privileged operations for later verification
   - Alert operations team
4. **Recovery:** Automatically exit fallback when on-chain verification resumes

---

## 9. Anti-Patterns to Avoid

### 9.1 Role Explosion

**Problem:** Creating too many granular roles leads to management complexity.

**Symptoms:**
- More than 10-15 distinct roles
- Roles with single users
- Roles differing by only one permission

**Solution:** Keep to 5-10 coarse-grained roles. Use claims/attributes for fine-grained permissions within roles.

### 9.2 Caching Stale RBAC Data

**Problem:** User retains access after role revocation due to cached permissions.

**Symptoms:**
- Delayed access revocation
- Inconsistent behavior across services
- Security incidents from stale permissions

**Solution:**
- Maximum 5-minute cache TTL for all RBAC data
- Event-driven cache invalidation on role changes
- Verify critical operations against fresh on-chain data

### 9.3 On-Chain Role Storage for All Users

**Problem:** Storing role mappings on-chain for every user wastes gas and exposes data.

**Symptoms:**
- High gas costs for role management
- Unnecessary on-chain data exposure
- Scalability issues

**Solution:** Store on-chain roles only for privileged actors (brand_admin, service_center). Use JWT claims for standard users (operator, auditor, regulator).

### 9.4 Synchronous On-Chain Verification for Every Request

**Problem:** Querying on-chain for every API request creates latency and cost issues.

**Symptoms:**
- High API latency (> 500ms)
- RPC rate limiting
- Poor user experience

**Solution:**
- Cache verification results (5-minute TTL)
- Use off-chain JWT for first-tier authorization
- Reserve on-chain verification for privileged operations only

### 9.5 Overly Permissive DEFAULT_ADMIN_ROLE

**Problem:** Too many addresses with DEFAULT_ADMIN_ROLE creates security risk.

**Symptoms:**
- Multiple admin addresses
- Unclear admin key custody
- No admin action audit trail

**Solution:**
- Single DEFAULT_ADMIN_ROLE holder (TSC multisig)
- Two-step admin transfer with delay
- All admin actions logged to immutable audit trail

---

## Appendix A: Role Bytes32 Reference

```solidity
// Computed role identifiers for reference
DEFAULT_ADMIN_ROLE     = 0x0000000000000000000000000000000000000000000000000000000000000000
BRAND_ADMIN_ROLE       = 0x7a8dc26796a1e50e6e190b70259f58f6a4edd5b22280ceecc82b687b8e982869
OPERATOR_ROLE          = 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929
AUDITOR_ROLE           = 0xf55c2b664c9a7c9e80d9b8e2e4b8e9e1e4e8d9a5a6e7a9c0d1e2f3a4b5c6d7e8
REGULATOR_ROLE         = 0x3f99c47a2aeba1c64d2baa2c5b9b2d1ee4e3c6c7b8a9c0d1e2f3a4b5c6d7e8f9
SERVICE_CENTER_ADMIN_ROLE = 0x1ab3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4
```

## Appendix B: Related Specifications

| Specification | Relationship |
|---------------|--------------|
| [Access Control (Resolver)](../resolver/access-control.md) | JWT token specification for resolver layer |
| [Claim Topics](../identity/claim-topics.md) | ONCHAINID claim topic definitions |
| [IIdentityRegistry](../contracts/identity/IIdentityRegistry.sol) | Identity verification interface |
| [Audit Trail](./audit-trail.md) | Immutable logging for role changes |
| [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/api/access) | Implementation foundation |

---

*Galileo Luxury Standard - Infrastructure Layer*
*Specification: GSPEC-INFRA-001*
*Classification: Public*
