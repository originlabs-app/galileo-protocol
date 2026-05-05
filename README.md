# Galileo Protocol

**Open standard for luxury product traceability on blockchain**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/originlabs-app/galileo-protocol/releases/tag/v1.0.0)

> *Protecting brand heritage and human craftsmanship through a common interoperable language.*

**Galileo Protocol — B2B SaaS for luxury product authentication via DPP (Digital Product Passports)**

---

## Project Stewardship

**Galileo Luxury Standard** is an open-source software project led by **Galileo Network EURL**, based in France, with support from **Origin Labs**.

The project is developed as part of a collaboration between Galileo Network EURL and Origin Labs. Origin Labs provides technical assistance, development support, and repository hosting.

This repository is hosted under the Origin Labs GitHub organization for practical development and maintenance purposes.

---

## Overview

The Galileo Protocol provides specifications for Digital Product Passports, decentralized identity, and compliant token transfers.

### Key Features

- **Privacy-First Architecture** — No personal data on-chain (GDPR compliant)
- **Digital Product Passports** — ESPR 2024/1781 ready schemas
- **Compliant Transfers** — ERC-3643 token standard with modular compliance
- **Authentication & RBAC** — httpOnly cookie auth, UserPublic/UserInternal roles, CSRF header protection (`X-Galileo-Client`), SIWE wallet login, Smart Wallet (ERC-1271)
- **Product Management** — CRUD operations with GTIN validation, DID generation (`did:galileo`), Dashboard product pages (list, create, detail)
- **Blockchain Integration** — Live Base Sepolia minting verified with per-product ERC-3643 `GalileoToken` deployments, embedded contract bytecode for API runtime minting, synthetic fallback when chain writes are disabled, and optimistic concurrency control (updateMany WHERE status=DRAFT)
- **GS1 Conformity** — Digital Link 1.6.0 resolver with 14-digit GTIN padding, check digit validation, JSON-LD with custom `galileo`/`gs1` context namespaces
- **Security Hardening** — Scoped content-type parser, brandId null guards, validation bounds (name 255, serial 100, desc 2000, brandName 255), portable test DB (`DATABASE_URL_TEST`), SSR-safe refresh token handling, AuthProvider Context (single /auth/me fetch), CSRF on POST/PATCH/DELETE/PUT, E2E in CI with pnpm cache
- **Shared Validation** — Robust URL encoding, DID GTIN check digit fixes, `padGtin14()` normalization, 8 luxury categories aligned across API/dashboard/shared
- **GDPR Compliance** — Data export (Art. 15) and erasure (Art. 17) endpoints, PII-free structured logging, DPIA scaffold
- **Audit Trail** — Append-only audit log with CSV/JSON export, actor sanitization on user deletion
- **Wallet Authentication** — SIWE (EIP-4361) login, ERC-1271 Smart Wallet support (Coinbase), nonce-protected wallet linking
- **Batch Operations** — CSV import (up to 500 products) and batch mint (up to 100), with row-level validation and error reporting
- **Transfer Compliance** — 5-module compliance check (jurisdiction, sanctions, brand auth, CPO, service center)
- **Webhook System** — Outbox pattern with HMAC-SHA256 signing and exponential backoff retry
- **Observability** — Sentry error tracking, Vercel Analytics, structured Pino logging with PII redaction
- **Deployment Ready** — Vercel configs for frontend apps, multi-stage Dockerfile for API, HEALTHCHECK directive

---

## Architecture & Tech Stack

**Turborepo** monorepo using **pnpm** (exact semver pinned):
- **API**: Fastify 5 server, Prisma 7, PostgreSQL
- **Dashboard**: Next.js app, shadcn/ui, Playwright e2e tests
- **Scanner**: Next.js PWA with QR scanning (barcode-detector), material composition display, GS1 deep links
- **Shared**: Utilities for GTIN validation, URL encoding, DID generation

---

## Quick Start / Local Development

### Prerequisites
- Node.js 22, pnpm, PostgreSQL 16+

### Setup Instructions

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup Database:**
   Ensure PostgreSQL is running. Run initialization script:
   ```bash
   ./init.sh
   ```
   *(Creates required databases including test isolation `galileo_test`)*

3. **Configure Environment:**
   Copy the example environment file for the API:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

4. **Initialize Database & Seed:**
   *(Guarded for production)*
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start Development Servers:**
   ```bash
   pnpm dev
   ```

### Wallet Integration

- **Browser wallets**: MetaMask, Rabby, and other injected wallets via wagmi
- **Smart Wallets**: Coinbase Smart Wallet with passkey support (ERC-1271 verification)
- **SIWE Login**: Sign-In With Ethereum for wallet-only authentication
- **Wallet Linking**: Nonce-protected EIP-191 signature flow for linking wallet to existing account

---

## Testing

**443 unit/integration tests + 75 Playwright browser tests.** Test database (`galileo_test`) is isolated via `DATABASE_URL_TEST`.

| Suite | Tests | Scope |
|-------|-------|-------|
| @galileo/shared | 74 | GTIN validation, DID generation, auth schemas, user types |
| @galileo/api | 369 | Auth, Products, Security, Mint, Resolver/QR, CSRF, Health, Logging, GDPR, Upload, Recall, Transfer, Verify, Link-Wallet, Sentry, Webhooks, Batch-Import, Batch-Mint, SIWE, Audit, Audit-Export |
| Playwright e2e | 75 tests | Auth, product lifecycle, dashboard home, product filters, product upload, transfer compliance, audit export, batch import, SIWE + wallet auth, scanner offline replay |

```bash
pnpm test              # Unit/integration tests (443)
pnpm --filter dashboard exec playwright test  # Playwright browser tests (75)
pnpm turbo typecheck   # TypeScript validation
pnpm turbo lint        # ESLint
pnpm turbo build       # Full build
```

---

## API Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | public | Create account (+ optional brand) |
| POST | `/auth/login` | public | Login (sets httpOnly cookies) |
| POST | `/auth/logout` | authenticated | Clear cookies |
| POST | `/auth/refresh` | cookie | Refresh access token |
| GET | `/auth/me` | authenticated | Current user info + wallet address |
| POST | `/auth/link-wallet` | authenticated | Link wallet via EIP-191 signature |
| GET | `/auth/me/data` | authenticated | GDPR data export (Art. 15) |
| DELETE | `/auth/me/data` | authenticated + CSRF | GDPR erasure (Art. 17) |
| GET | `/auth/nonce` | authenticated | Generate nonce for wallet-link signing |
| GET | `/auth/siwe/nonce` | public | Generate SIWE nonce |
| POST | `/auth/siwe/verify` | public | Verify SIWE signature, issue session |
| GET | `/health` | public | Health check (DB + chain status) |
| POST | `/products` | BRAND_ADMIN+ | Create product |
| GET | `/products` | authenticated | List products (brand-scoped, filterable) |
| GET | `/products/:id` | authenticated | Product detail |
| PATCH | `/products/:id` | BRAND_ADMIN+ | Update DRAFT product |
| POST | `/products/:id/mint` | BRAND_ADMIN+ | Mint product (real chain write when configured, synthetic fallback otherwise) |
| POST | `/products/:id/recall` | BRAND_ADMIN+ | Recall product (ACTIVE -> RECALLED) |
| POST | `/products/:id/transfer` | BRAND_ADMIN+ | Transfer to wallet (with compliance check) |
| POST | `/products/:id/verify` | public | Record verification event |
| POST | `/products/:id/upload` | BRAND_ADMIN+ | Upload product image (multipart) |
| GET | `/products/:id/qr` | authenticated | QR code (PNG) |
| GET | `/products/stats` | authenticated | Product statistics |
| POST | `/products/batch-import` | BRAND_ADMIN+ | CSV import (max 500 rows) |
| POST | `/products/batch-mint` | BRAND_ADMIN+ | Batch mint DRAFT products (max 100) |
| GET | `/01/:gtin/21/:serial` | public | GS1 Digital Link resolver (JSON-LD) |
| GET | `/audit-log` | ADMIN | Audit log entries (paginated) |
| GET | `/audit-log/export` | ADMIN | Export audit log (CSV/JSON) |
| POST | `/webhooks` | ADMIN | Register webhook subscription |
| GET | `/webhooks` | ADMIN | List webhook subscriptions |

---

## Security

Security hardened across 10 sprints of development:

- **Authentication:** httpOnly cookies (SameSite=Lax), SHA-256 hashed refresh tokens, timing-safe login, CSRF header (`X-Galileo-Client`) on all mutating requests (POST/PATCH/DELETE/PUT)
- **Authorization:** RBAC with brandId scoping on all product routes, null-brandId guard (403)
- **Input Validation:** Zod schemas with bounds (name ≤255, serial ≤100, description ≤2000, brandName ≤255), scoped JSON parser (no global content-type override)
- **Frontend:** AuthProvider Context (single /auth/me fetch), SSR-safe AuthGuard (useSyncExternalStore), no localStorage tokens
- **Concurrency:** Optimistic concurrency control on mint (updateMany WHERE status=DRAFT, atomic 409 on race)
- **CI/CD:** pnpm cache + frozen-lockfile, Playwright E2E in CI, production API build for E2E, portable paths
- **GS1 Conformity:** GTIN check digit validation, 14-digit padding normalization, JSON-LD with IndividualProduct type and custom galileo/gs1 context
- **Cookie Hardening:** `__Host-galileo_at` (access) + `__Secure-galileo_rt` (refresh) prefixes in production, signed cookies via `@fastify/cookie`
- **Wallet Security:** Nonce-protected wallet linking (5-min TTL), SIWE with one-time nonce, ERC-1271 Smart Wallet verification
- **Compliance:** Transfer compliance check (5 modules), GDPR Art. 15/17 endpoints, audit trail with PII sanitization

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Repository Structure

```text
├── apps/
│   ├── api/                   # Fastify 5 API server
│   ├── dashboard/             # Next.js B2B dashboard
│   └── scanner/               # Next.js scanner PWA (QR scanning, GS1 deep links)
├── packages/
│   └── shared/                # @galileo/shared utilities
├── contracts/                 # Solidity interfaces
├── website/                   # Next.js documentation portal
└── specifications/            # Schemas, guides, DID methods
```

*For details on compliance (GDPR, MiCA, ESPR), governance, and contributions, see `specifications/`, `governance/`, and `CONTRIBUTING.md`.*
