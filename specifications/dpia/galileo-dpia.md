# Data Protection Impact Assessment (DPIA) — Galileo Protocol

> Status: SCAFFOLD — requires DPO review before mainnet deployment.
>
> Prepared following EDPB Guidelines 02/2025 and GDPR Articles 35-36.
>
> Sections marked `[TODO: DPO review required]` need legal/compliance input.

---

## 1. Systematic Description of Processing

### 1.1 Nature of Processing

Galileo Protocol is a digital product passport (DPP) platform for the luxury goods industry. It enables brands to create verifiable digital identities for physical products, track their lifecycle (creation, minting, transfer, recall), and allow consumers to verify product authenticity.

### 1.2 Scope of Processing

| Data Category | Personal Data Elements | Data Subjects | Retention |
|---------------|----------------------|---------------|-----------|
| Account data | Email address, bcrypt-hashed password | Brand administrators, operators, viewers | Until account deletion (GDPR Art. 17) |
| Wallet data | Ethereum wallet address (pseudonymous) | Users who link a wallet | Until account deletion or wallet unlink |
| Session data | JWT access/refresh tokens (httpOnly cookies) | Authenticated users | Access: 15 min. Refresh: 7 days. |
| Audit trail | Actor (userId string), IP address, action, resource | All authenticated users performing mutations | Indefinite (forensic/compliance requirement) |
| Product events | performedBy (userId, nullable) | Users who create/update/mint/transfer/verify products | Indefinite (product lifecycle) |
| Analytics | Page views, anonymized usage (Vercel Analytics) | All visitors (dashboard + scanner) | Per Vercel data retention policy |

### 1.3 Context of Processing

- **Controller**: [TODO: DPO review required — legal entity name and contact details]
- **Processor(s)**: See Section 6 (Subprocessors)
- **Purpose**: Product authenticity verification, supply chain traceability, anti-counterfeiting for luxury goods
- **Legal basis**: [TODO: DPO review required]
  - Account data: Contractual necessity (Art. 6(1)(b)) for platform access
  - Audit trail: Legitimate interest (Art. 6(1)(f)) for security and fraud prevention
  - Analytics: Legitimate interest (Art. 6(1)(f)) for service improvement
  - Wallet linking: Consent (Art. 6(1)(a)) — user-initiated action

### 1.4 Data Flows

```
User (browser)
  |
  |-- HTTPS --> Dashboard (Next.js on Vercel)
  |               |-- API calls --> API (Fastify)
  |                                   |-- Read/Write --> PostgreSQL
  |                                   |-- Upload --> R2/S3 (product images)
  |                                   |-- Mint/Transfer --> Base Sepolia blockchain (NO personal data)
  |
  |-- HTTPS --> Scanner PWA (Next.js on Vercel)
                  |-- Verify --> API (Fastify)
```

### 1.5 On-Chain Data (Blockchain)

**Critical design decision**: Zero personal data is stored on-chain. The blockchain contains only:
- Decentralized Identifiers (DIDs) — synthetic identifiers, not linked to natural persons
- GTIN (product barcode) — product identifier, not personal data
- Serial numbers — product-level, not personal data
- Token metadata (txHash, tokenAddress, chainId)

Wallet addresses appear on-chain as transaction signers. While pseudonymous, the EDPB considers them potentially personal data if linkable to a natural person (see Risk R3 below).

---

## 2. Assessment of Necessity and Proportionality

### 2.1 Purpose Limitation

Each data element serves a specific, documented purpose:

| Data Element | Purpose | Alternatives Considered |
|-------------|---------|------------------------|
| Email | Account identification, password recovery | Wallet-only auth (implemented via SIWE, but email remains for traditional users) |
| Password hash | Authentication | Passkeys/FIDO2 (planned, not yet implemented) |
| Wallet address | On-chain product ownership, SIWE login | Could be optional — currently optional, user-initiated |
| IP address (audit) | Fraud detection, abuse prevention | Could anonymize after 30 days [TODO: DPO review required] |
| performedBy (events) | Product lifecycle attribution | Already nullable for anonymous verification |

### 2.2 Data Minimization

Measures already implemented:
- **Password**: Only bcrypt hash stored (cost factor 10), never plaintext
- **Refresh token**: SHA-256 hashed in database, never stored raw
- **JWT claims**: Contain only `sub` (userId), `role`, `brandId`, `iat`, `exp` — no PII
- **Product events**: `performedBy` is nullable (anonymous verify is allowed)
- **AuditLog**: Actor is a string (userId), not a full user object. No FK relation — survives user deletion
- **On-chain**: Zero personal data — DIDs, GTINs, serials only

### 2.3 Storage Limitation

| Data | Current Retention | Recommendation |
|------|------------------|----------------|
| User accounts | Until deletion request | Adequate |
| Refresh tokens | 7 days (auto-expire) | Adequate |
| Audit logs | Indefinite | [TODO: DPO review required — consider 2-year retention policy] |
| Product events | Indefinite (product lifecycle) | Adequate — product traceability requirement |
| On-chain data | Permanent (blockchain) | Acceptable — no personal data on-chain |

---

## 3. Assessment of Risks to Rights and Freedoms

### Risk Matrix

| ID | Risk | Likelihood | Severity | Level | Mitigation |
|----|------|-----------|----------|-------|------------|
| R1 | Unauthorized access to user accounts | Medium | High | High | See M1-M4 |
| R2 | PII leakage through logs or error messages | Low | Medium | Medium | See M5-M6 |
| R3 | Wallet address linkability to real identity | Medium | Medium | Medium | See M7 |
| R4 | Data breach of PostgreSQL database | Low | High | Medium | See M8-M9 |
| R5 | Cross-brand data exposure through filtering | Low | High | Medium | See M10 |
| R6 | GDPR erasure incomplete (data remnants) | Low | Medium | Low | See M11-M12 |
| R7 | Insider threat (ADMIN role abuse) | Low | High | Medium | See M13 |
| R8 | Session hijacking via cookie theft | Low | High | Medium | See M14-M15 |

### R1: Unauthorized Account Access
- **Scenario**: Brute-force login, credential stuffing, stolen credentials
- **Impact**: Access to product management, brand data

### R2: PII Leakage in Logs
- **Scenario**: Email, password, or tokens logged by mistake
- **Impact**: PII exposure to log aggregation systems

### R3: Wallet Address Linkability
- **Scenario**: Wallet address linked to real identity through exchange KYC, ENS, or social media
- **Impact**: Pseudonymous on-chain activity becomes attributable
- [TODO: DPO review required — EDPB position on wallet addresses as personal data]

### R4: Database Breach
- **Scenario**: SQL injection, misconfigured access, compromised credentials
- **Impact**: Exposure of emails, hashed passwords, wallet addresses

### R5: Cross-Brand Data Exposure
- **Scenario**: BRAND_ADMIN accesses another brand's products through API manipulation
- **Impact**: Competitive intelligence leak, trust violation

### R6: Incomplete GDPR Erasure
- **Scenario**: DELETE /auth/me/data misses some data
- **Impact**: GDPR Art. 17 violation, regulatory fine

### R7: Insider Threat
- **Scenario**: ADMIN user exports or modifies data beyond legitimate need
- **Impact**: Data misuse, brand trust violation

### R8: Session Hijacking
- **Scenario**: XSS attack steals authentication cookies
- **Impact**: Full account takeover

---

## 4. Measures to Address Risks

### M1: Rate Limiting (mitigates R1)
- `@fastify/rate-limit` on all endpoints
- Login endpoint has stricter limits to prevent brute-force
- Implementation: `apps/api/src/plugins/rate-limit.ts`

### M2: Password Security (mitigates R1)
- bcrypt with cost factor 10
- Timing-safe comparison with DUMMY_HASH for non-existent users (prevents user enumeration)
- Implementation: `apps/api/src/utils/password.ts`

### M3: RBAC Authorization (mitigates R1, R5, R7)
- Role-based access control: ADMIN, BRAND_ADMIN, OPERATOR, VIEWER
- `requireRole()` middleware on all protected routes
- Brand-scoped queries: non-ADMIN users only see their brand's data
- Implementation: `apps/api/src/middleware/rbac.ts`

### M4: CSRF Protection (mitigates R1, R8)
- `X-Galileo-Client` header required on all mutating requests (POST, PATCH, PUT, DELETE)
- Implementation: `apps/api/src/middleware/csrf.ts`

### M5: PII Redaction in Logs (mitigates R2)
- Custom Pino serializers whitelist safe request/response fields only
- `redact` paths for body.password, body.email, headers.authorization, headers.cookie
- Implementation: `apps/api/src/main.ts` (Pino logger config)

### M6: Audit Body Sanitization (mitigates R2)
- SENSITIVE_FIELDS set (password, email, refreshToken, passwordHash) redacted in audit logs
- Implementation: `apps/api/src/plugins/audit.ts`

### M7: Zero PII On-Chain (mitigates R3)
- No personal data written to blockchain — only DIDs, GTINs, serial numbers
- Wallet addresses appear as transaction signers (pseudonymous, user-initiated)
- [TODO: DPO review required — consider documenting wallet address as optional]

### M8: Input Validation (mitigates R4)
- Zod `.strict()` on all request body schemas (rejects unknown fields)
- Prevents prototype pollution (`__proto__`, `constructor`)
- SQL injection prevented by Prisma parameterized queries
- Implementation: All route files use Zod schemas

### M9: Security Headers (mitigates R4, R8)
- `@fastify/helmet` with strict CSP
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Implementation: `apps/api/src/plugins/security-headers.ts`

### M10: Brand Scoping (mitigates R5)
- All product queries AND with brand scoping (R31 pattern)
- BRAND_ADMIN can only access own brand's products
- Batch operations fail with 403 if any cross-brand item detected (R43)
- Implementation: `apps/api/src/routes/products/`

### M11: GDPR Data Export — Art. 15 (mitigates R6)
- `GET /auth/me/data` returns all personal data: user, brand, products, events
- Explicit field selection (R26) — new columns excluded by default
- Implementation: `apps/api/src/routes/auth/` (me/data endpoint)

### M12: GDPR Erasure — Art. 17 (mitigates R6)
- `DELETE /auth/me/data` deletes user record
- ProductEvent.performedBy set to null (anonymization)
- AuditLog actor string preserved for forensics (no FK, standalone — R32)
- Transaction-then-clear-cookies pattern (R25)
- Implementation: `apps/api/src/routes/auth/` (me/data endpoint)

### M13: Audit Trail (mitigates R7)
- All successful mutations logged (POST, PATCH, PUT, DELETE returning 2xx)
- AuditLog records: actor, action, resource, resourceId, metadata, IP, timestamp
- Export endpoint: `GET /audit-log/export` (CSV or JSON)
- Audit hook failure caught silently — never breaks the request (R29)
- Implementation: `apps/api/src/plugins/audit.ts`

### M14: Cookie Security (mitigates R8)
- httpOnly cookies (not accessible via JavaScript)
- `__Host-galileo_at` (access token): Secure, Path=/, no Domain
- `__Secure-galileo_rt` (refresh token): Secure, Path=/auth/refresh
- Cookie signing with COOKIE_SECRET
- SameSite=Lax (CSRF protection)
- Implementation: `apps/api/src/utils/cookies.ts`

### M15: Token Security (mitigates R8)
- Short-lived access tokens (15 min)
- Refresh token rotation (one-time use, hashed in DB)
- Atomic rotation: old token invalidated before new one issued
- Implementation: `apps/api/src/routes/auth/`, `apps/api/src/utils/token-hash.ts`

### M16: Error Tracking (mitigates R2)
- Sentry plugin with decorate-null pattern (no-op without SENTRY_DSN)
- Error events may contain request context — Sentry scrubs PII by default
- Implementation: `apps/api/src/plugins/sentry.ts`
- [TODO: DPO review required — verify Sentry PII scrubbing config]

---

## 5. Involvement of Stakeholders

### 5.1 Data Subjects

- Users can export their data at any time (Art. 15)
- Users can delete their account and data at any time (Art. 17)
- Wallet linking is optional and user-initiated
- [TODO: DPO review required — privacy notice/policy to be drafted and published]

### 5.2 Data Protection Officer

- [TODO: DPO review required — DPO designation and contact information]
- [TODO: DPO review required — DPO consultation on this DPIA]

### 5.3 Supervisory Authority

- [TODO: DPO review required — lead supervisory authority determination based on main establishment]
- Prior consultation (Art. 36) required if residual risks remain high after mitigation

---

## 6. Subprocessors

| Subprocessor | Service | Data Processed | Location | Adequacy |
|-------------|---------|---------------|----------|----------|
| PostgreSQL provider | Database hosting | All application data | [TODO: DPO review required] | [TODO: DPO review required] |
| Vercel | Dashboard + Scanner hosting, analytics | Page views, IP (anonymized) | Global (Edge) | [TODO: DPO review required — SCCs or adequacy decision] |
| Cloudflare R2 / AWS S3 | Product image storage | Product images (no PII) | [TODO: DPO review required] | [TODO: DPO review required] |
| Sentry | Error tracking | Error context (scrubbed PII) | US (Sentry Inc.) | [TODO: DPO review required — SCCs] |
| Base network (Coinbase) | Blockchain | No personal data | Global (decentralized) | N/A — no personal data on-chain |

[TODO: DPO review required — Data Processing Agreements (DPAs) with all subprocessors]

---

## 7. Monitoring and Review

### 7.1 Review Schedule

- **Quarterly**: Review audit logs for anomalous access patterns
- **Semi-annually**: Review this DPIA for accuracy against current architecture
- **On change**: Update DPIA when adding new data processing activities, subprocessors, or significant feature changes
- **On incident**: Update risk assessment after any data breach or security incident

### 7.2 Metrics to Monitor

| Metric | Source | Threshold |
|--------|--------|-----------|
| Failed login attempts | Audit log | [TODO: DPO review required — alert threshold] |
| GDPR erasure requests | Audit log | Track volume and completion time |
| Cross-brand access attempts (403s) | API logs | Any occurrence triggers review |
| Data export requests | Audit log | Track volume |

### 7.3 Change Triggers Requiring DPIA Update

- New personal data categories collected
- New subprocessor added
- Change in legal basis for processing
- New data sharing arrangement
- Cross-border transfer to new jurisdiction
- Database migration adding personal data columns (marked with lock icon in sprint)
- MFA/passkey implementation (new biometric data processing)

---

## 8. Conclusion and Residual Risk

### 8.1 Summary

The Galileo Protocol implements privacy-by-design principles with strong technical measures:
- Zero personal data on blockchain
- Comprehensive RBAC and brand scoping
- GDPR Art. 15 (export) and Art. 17 (erasure) endpoints
- PII redaction in logs and audit trails
- httpOnly cookies with security prefixes
- Input validation preventing injection attacks

### 8.2 Residual Risks

| Risk | Residual Level | Reason |
|------|---------------|--------|
| R1 (Unauthorized access) | Low | Rate limiting + bcrypt + CSRF + cookie security |
| R2 (PII in logs) | Low | Custom serializers + redaction + audit sanitization |
| R3 (Wallet linkability) | Medium | Pseudonymous by design, but external linkability possible |
| R4 (DB breach) | Low | Parameterized queries + input validation + hashed credentials |
| R5 (Cross-brand exposure) | Low | Brand scoping on all queries + batch 403 fail-fast |
| R6 (Incomplete erasure) | Low | Transaction-based deletion + explicit field selection |
| R7 (Insider threat) | Low | Audit trail + role-based access |
| R8 (Session hijacking) | Low | httpOnly + __Host- prefix + short-lived tokens + rotation |

### 8.3 Recommendation

[TODO: DPO review required — final recommendation on whether processing can proceed, and whether prior consultation with the supervisory authority is needed under Art. 36]

---

## Appendix A: Legal References

- GDPR Articles 35-36 (DPIA requirements)
- EDPB Guidelines 02/2025 on DPIAs
- GDPR Article 6 (Lawfulness of processing)
- GDPR Article 15 (Right of access)
- GDPR Article 17 (Right to erasure)
- GDPR Article 25 (Data protection by design and by default)
- GDPR Article 28 (Processor obligations)
- GDPR Article 44-49 (International transfers)

## Appendix B: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-03-10 | Automated scaffold | Initial scaffold based on current architecture |
| | | | [TODO: DPO review required — version after DPO review] |
