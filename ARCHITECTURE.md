# Architecture — Galileo Protocol

## System overview

```
Client Browser
    ↓ HTTPS
apps/dashboard (Next.js 16, port 3000)    — B2B admin portal
apps/scanner   (Next.js 16, port 3001)    — Consumer QR verification PWA
    ↓ REST API (CORS, httpOnly cookies)
apps/api       (Fastify 5, port 4000)     — Single API server
    ↓ Prisma ORM
PostgreSQL 16                             — Primary database
    ↓ viem client
Base Sepolia / Base Mainnet               — ERC-3643 token registry
```

## Workspaces

| Workspace | Role |
|-----------|------|
| `apps/api` | Fastify 5: auth, products, audit, webhooks, GS1 resolver, health |
| `apps/dashboard` | Next.js 16 B2B portal: product lifecycle, wallet, batch ops |
| `apps/scanner` | Next.js 16 PWA: barcode-detector, material composition, GS1 deep links |
| `apps/website` | Documentation portal |
| `packages/shared` | `@galileo/shared`: Zod schemas, GTIN validation, DID generation, URL encoding |
| `contracts/` | Solidity ERC-3643 interfaces (Foundry, Base Sepolia) |

## API structure

```
apps/api/src/
├── routes/
│   ├── auth/          # login, register, refresh, me, SIWE, link-wallet, GDPR
│   ├── products/      # CRUD, mint, recall, transfer, upload, batch-import, batch-mint, QR
│   ├── audit/         # audit-log entries + CSV/JSON export
│   ├── resolver/      # GS1 Digital Link (/01/:gtin/21/:serial → JSON-LD)
│   ├── webhooks/      # subscription management (outbox + HMAC-SHA256 retry)
│   └── health.ts      # DB + chain connectivity status
├── services/          # Business logic separated from route handlers
├── middleware/        # Auth guards, CSRF validation
├── plugins/           # Fastify plugins (cookie, cors, type-provider-zod)
├── utils/             # Crypto helpers, pagination, GS1 utils
└── config.ts          # Env var validation (Zod)
apps/api/prisma/
└── schema.prisma      # Source of truth for DB schema — edit here, then prisma db push
```

## Data model (key tables)

| Table | Purpose |
|-------|---------|
| `User` | Accounts with Role enum (ADMIN, BRAND_ADMIN, OPERATOR, VIEWER), optional `brandId` scoping, optional `walletAddress` |
| `Brand` | Brand entity with `slug` (unique), `did` (unique) |
| `Product` | Core product: GTIN, serial, DID, status, brandId (FK), walletAddress |
| `ProductPassport` | DPP metadata, txHash, tokenAddress, chainId, mintedAt |
| `ProductEvent` | Append-only lifecycle events (CREATED, MINTED, TRANSFERRED, RECALLED, VERIFIED) |
| `AuditLog` | Append-only compliance audit trail with actor, action, resource, ip |

## Authentication flow

```
POST /auth/login      → validates credentials → sets __Host-galileo_at + __Secure-galileo_rt cookies
POST /auth/refresh    → rotates refresh token (SHA-256 hash, stored in DB)
GET  /auth/me         → returns current user + walletAddress
SIWE: GET /auth/siwe/nonce → POST /auth/siwe/verify → session cookie
Wallet link: GET /auth/nonce → sign EIP-191 → POST /auth/link-wallet
```

## Product lifecycle

```
DRAFT → (mint) → MINTING → ACTIVE → (transfer) → TRANSFERRED
                                  → (recall)   → RECALLED
```
Mint uses optimistic concurrency: `updateMany WHERE status=DRAFT` (atomic 409 on race condition).

## Key invariants

- All mutating requests require `X-Galileo-Client: true` header (CSRF)
- Products always scoped to `brandId` — null brandId returns 403 at route level
- Tokens: httpOnly cookies only (`__Host-` prefix in production requires HTTPS)
- Prisma client generated to `src/generated/prisma` (not default path)
- Test isolation: `galileo_test` DB via `DATABASE_URL_TEST` env var

## Sensitive zones

- `apps/api/src/routes/auth/` — session management, token rotation, SIWE
- `apps/api/src/routes/products/transfer.ts` — 5-module compliance check (jurisdiction, sanctions, brand auth, CPO, service center)
- `apps/api/prisma/schema.prisma` — any change requires `prisma generate` + migration
- `contracts/` — immutable once deployed to mainnet
