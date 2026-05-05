# Product Sense — Galileo Protocol

## What it is

B2B SaaS platform for luxury brands to authenticate physical products via blockchain-backed Digital
Product Passports. Compliant with EU ESPR regulation 2024/1781 (effective 2027). Target market: luxury
goods brands (watches, jewelry, leather goods, apparel) that need product provenance for consumers,
regulators, and transfer compliance.

## Actors

| Actor | Role | Capabilities |
|-------|------|-------------|
| **ADMIN** | Origin Labs operator | Audit logs, webhook management, cross-brand access |
| **BRAND_ADMIN** | Brand employee | Create/mint/recall products, batch ops, transfers, image upload |
| **OPERATOR** | Brand partner | View products, scan QR |
| **VIEWER** | Read-only user | View products |
| **Consumer** | End user (unauthenticated) | Scan QR → scanner PWA shows provenance + material composition |

## Key user journeys

### Product authentication lifecycle
1. BRAND_ADMIN creates product (GTIN + serial number + metadata + category) → `DRAFT`
2. Optional: upload product image (stored in R2/S3)
3. BRAND_ADMIN mints → `ACTIVE` (DID generated: `did:galileo:{gtin}:{serial}`, DPP created, on-chain record)
4. QR code generated with GS1 Digital Link (`/01/{gtin}/21/{serial}`)
5. Consumer scans QR → scanner PWA shows provenance, material composition, authenticity

### Transfer to distribution
1. BRAND_ADMIN initiates transfer (5-module compliance: jurisdiction, sanctions, brand auth, CPO, service center)
2. Product → `TRANSFERRED` with wallet address recorded

### Batch operations
- CSV import: up to 500 products in one request (row-level validation + error report)
- Batch mint: up to 100 DRAFT products in one call

### Compliance & GDPR
- Audit log exportable (CSV/JSON) — ADMIN role only
- GDPR Art. 15: user data export on demand
- GDPR Art. 17: user data erasure (PII sanitized from audit trail)

## Product decisions

- **No personal data on-chain** — GDPR compliance and privacy-first architecture
- **httpOnly cookies only** — no localStorage tokens, resilient against XSS token theft
- **SIWE (EIP-4361)** — wallet-only login path without email/password
- **GS1 Digital Link standard** — `/01/{gtin}/21/{serial}` makes QR codes interoperable
- **ERC-3643** — regulated token standard ensures transfer compliance gates enforced on-chain
- **Fastify-only API** — no Next.js Route Handlers, single API surface to audit and secure

## Success metrics

- Products minted per brand per period
- Consumer scan events (verifications)
- Transfer compliance pass rate
- Batch import success rate
