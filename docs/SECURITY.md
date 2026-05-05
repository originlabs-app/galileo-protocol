# Security — Galileo Protocol

## Authentication

### Session management
- **Tokens**: httpOnly cookies only — no localStorage, no memory storage
  - `__Host-galileo_at` — access token (15 min TTL, requires HTTPS + no Path in prod)
  - `__Secure-galileo_rt` — refresh token (7 day TTL)
- **Refresh token storage**: SHA-256 hash stored in DB (`User.refreshToken`), not plaintext
- **Token rotation**: old refresh token invalidated in same DB transaction (atomic)
- **Password hashing**: bcrypt, max 128 chars (DoS prevention), timing-safe comparison
- **Cookies signed** via `@fastify/cookie`

### SIWE (Sign-In With Ethereum)
- One-time nonces (5-min TTL) — `GET /auth/siwe/nonce` → `POST /auth/siwe/verify`
- Nonce stored in DB, invalidated on use (replay protection)
- Validates `domain` and `origin` fields against `SIWE_DOMAIN` / `SIWE_ORIGIN` env vars

### Wallet linking
- Nonce-protected EIP-191 signature flow — 5-min TTL
- `GET /auth/nonce` → sign → `POST /auth/link-wallet`

## Authorization (RBAC)

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Audit log, webhooks, cross-brand access |
| `BRAND_ADMIN` | Products CRUD (create, mint, recall, transfer, batch), image upload |
| `OPERATOR` | Product read, QR scan |
| `VIEWER` | Product read only |

**brandId scoping**: all product routes enforce `WHERE brandId = user.brandId`. Users with `brandId = null` get 403 unless ADMIN role.

ERC-1271 Smart Wallet verification for Coinbase Smart Wallet (passkey auth).

## CSRF protection

Custom header `X-Galileo-Client: true` required on all mutating requests (POST, PATCH, DELETE, PUT).
GET requests exempt by design. Dashboard sends header automatically via central API helper.

## Input validation

All Fastify endpoints validated via Zod schemas (no raw `any`):
- `name` ≤ 255 chars, `serialNumber` ≤ 100, `description` ≤ 2000, `brandName` ≤ 255
- GTIN: 14-digit check digit validation (GS1 mod-10 algorithm)
- Category: strict enum (8 luxury categories)
- Scoped JSON body parser (no global content-type override)

## Secrets management

All secrets via env vars (see `docs/DEPLOYMENT.md`). Never committed. `apps/api/config.ts` validates
required env vars at startup with Zod.

## GDPR compliance

- `GET /auth/me/data` — Art. 15 data export (user + products)
- `DELETE /auth/me/data` — Art. 17 erasure: deletes user, sanitizes `AuditLog.actor` field
- No PII in structured logs (Pino with PII redaction)
- No personal data on-chain

## Transfer compliance

5-module compliance check before any product transfer:
1. Jurisdiction validation
2. Sanctions screening
3. Brand authorization
4. CPO (Certified Pre-Owned) check
5. Service center authorization

## Webhook security

- HMAC-SHA256 payload signing on all webhook deliveries
- Exponential backoff retry (outbox pattern)
- Subscriptions scoped to ADMIN role

## Concurrency

Optimistic concurrency on mint: `updateMany WHERE status=DRAFT` → atomic 409 on race condition.
Prevents double-minting.
