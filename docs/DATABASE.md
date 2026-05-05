# Database — Galileo Protocol

## Stack

- **Database**: PostgreSQL 16+
- **ORM**: Prisma 7 (`apps/api/prisma/schema.prisma`)
- **Client generated to**: `apps/api/src/generated/prisma` (non-default path)
- **Migrations**: `prisma db push` for dev (schema-first), `prisma migrate` for production-safe migrations
- **Test DB**: `galileo_test` (isolated via `DATABASE_URL_TEST` env var)

## Schema

### Enums

| Enum | Values |
|------|--------|
| `Role` | `ADMIN`, `BRAND_ADMIN`, `OPERATOR`, `VIEWER` |
| `ProductStatus` | `DRAFT`, `MINTING`, `ACTIVE`, `TRANSFERRED`, `RECALLED` |
| `EventType` | `CREATED`, `UPDATED`, `MINTED`, `TRANSFERRED`, `VERIFIED`, `RECALLED` |

### Tables

#### `User`
| Column | Type | Notes |
|--------|------|-------|
| `id` | String (cuid) | PK |
| `email` | String | UNIQUE |
| `passwordHash` | String | bcrypt, max 128 chars |
| `role` | Role | default VIEWER |
| `brandId` | String? | FK → Brand. Null = platform admin |
| `refreshToken` | String? | SHA-256 hash of issued token |
| `walletAddress` | String? | UNIQUE, set via SIWE or link-wallet |
| `createdAt` / `updatedAt` | DateTime | |

Indexes: `email`, `brandId`

#### `Brand`
| Column | Type | Notes |
|--------|------|-------|
| `id` | String (cuid) | PK |
| `name` | String | |
| `slug` | String | UNIQUE |
| `did` | String | UNIQUE — `did:galileo:{slug}` format |

Index: `slug`

#### `Product`
| Column | Type | Notes |
|--------|------|-------|
| `id` | String (cuid) | PK |
| `gtin` | String | 14-digit with check digit |
| `serialNumber` | String | max 100 chars |
| `did` | String | UNIQUE — `did:galileo:{gtin}:{serial}` |
| `name` | String | max 255 chars |
| `description` | String? | max 2000 chars |
| `category` | String | 8 luxury categories (enum validated in Zod) |
| `status` | ProductStatus | default DRAFT |
| `brandId` | String | FK → Brand (required) |
| `walletAddress` | String? | Set on transfer |
| `imageUrl` / `imageCid` | String? | R2/S3 storage |

Unique constraint: `(gtin, serialNumber)`. Indexes: `brandId`, `status`, `gtin`

#### `ProductPassport`
| Column | Type | Notes |
|--------|------|-------|
| `productId` | String | UNIQUE FK → Product |
| `digitalLink` | String | GS1 Digital Link URL |
| `metadata` | Json | DPP metadata blob |
| `txHash` | String? | On-chain transaction hash |
| `tokenAddress` / `chainId` | String? / Int? | ERC-3643 token location |
| `mintedAt` | DateTime? | |

#### `ProductEvent`
Append-only lifecycle events.

| Column | Type | Notes |
|--------|------|-------|
| `productId` | String | FK → Product |
| `type` | EventType | |
| `data` | Json | Event payload |
| `performedBy` | String? | FK → User |
| `createdAt` | DateTime | |

Indexes: `productId`, `performedBy`, `type`

#### `AuditLog`
Append-only compliance trail.

| Column | Type | Notes |
|--------|------|-------|
| `actor` | String? | User ID (sanitized on GDPR erasure) |
| `action` | String | e.g. `product.mint`, `user.login` |
| `resource` | String | e.g. `product`, `user` |
| `resourceId` | String? | |
| `metadata` | Json | PII-free structured data |
| `ip` | String? | |
| `createdAt` | DateTime | |

Indexes: `actor`, `resource`, `createdAt`

## Migrations

```bash
# Dev: push schema changes directly (no migration files)
pnpm db:push

# After schema change, regenerate Prisma client
pnpm --filter @galileo/api exec prisma generate

# Prod: create migration file first, review, then apply
pnpm --filter @galileo/api exec prisma migrate dev --name "description"
```

**Schema changes are sensitive** — always regenerate client and run full test suite after.

## Seed data

```bash
pnpm db:seed   # creates default ADMIN user (password from SEED_ADMIN_PASSWORD env var)
```
