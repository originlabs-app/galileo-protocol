# Deployment — Galileo Protocol

## Target environments

| Service | Platform | Notes |
|---------|----------|-------|
| `apps/api` | Docker (Railway or self-hosted) | Multi-stage Dockerfile in `apps/api/Dockerfile` |
| `apps/dashboard` | Vercel | `apps/dashboard/vercel.json` |
| `apps/scanner` | Vercel | `apps/scanner/vercel.json` |
| `apps/website` | Vercel or static | |
| Database | PostgreSQL 16+ | Railway managed or self-hosted |
| Object storage | Cloudflare R2 (or AWS S3-compatible) | Product images |

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) — runs on push/PR to `main`:

```
1. Lint         — pnpm lint
2. Typecheck    — pnpm typecheck
3. DB push      — prisma db push (against PostgreSQL service)
4. Unit tests   — pnpm test (443 specs)
5. Build dashboard
6. E2E tests    — Playwright (75 tests)
7. (parallel) Contracts — forge build && forge test
8. (parallel) Website   — lint + build
```

CI uses a real PostgreSQL 16 service container (no mocks). Tests blocked if any gate fails.

## Required env vars (API)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_URL_TEST` | Test DB (separate `galileo_test`) |
| `JWT_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `CORS_ORIGIN` | Comma-separated dashboard and scanner origins |
| `NEXT_PUBLIC_API_URL` | API URL (for dashboard) |
| `NEXT_PUBLIC_SCANNER_URL` | Scanner URL used by dashboard public proof links |
| `PORT` | API port (default 4000) |
| `NODE_ENV` | `development` / `production` / `test` |
| `SEED_ADMIN_PASSWORD` | Initial admin password for seeding |

## Blockchain env vars (testnet/mainnet)

See `.env.testnet.example` for full blockchain configuration:

| Variable | Description |
|----------|-------------|
| `CHAIN_ID` | 84532 (Base Sepolia) or 8453 (Base Mainnet) |
| `BASE_SEPOLIA_RPC_URL` | Alchemy/Infura RPC URL. `BASE_SEPOLIA_RPC` is also accepted as a compatibility alias. |
| `MINTING_MNEMONIC` | Dedicated testnet minting wallet mnemonic, preferred for API minting. Keep in an ignored local env file or secret manager. |
| `DEPLOYER_PRIVATE_KEY` | Raw deployer wallet private key fallback for testnet-only operations. Do not use a production wallet. |
| `BASESCAN_API_KEY` | For contract verification |
| `R2_ACCOUNT_ID` / `R2_*` | Cloudflare R2 credentials for image storage |
| `SIWE_DOMAIN` / `SIWE_ORIGIN` | Domain for SIWE nonce validation |

## API Docker

```bash
# Build
docker build -f apps/api/Dockerfile -t galileo-api .

# Run
docker run -p 4000:4000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  galileo-api
```

Multi-stage build: `deps` → `builder` → `runner` (slim Node 22 image with `HEALTHCHECK`).

## Live minting status

ERC-3643 identity infrastructure is deployed on Base Sepolia for testnet
validation. Public documentation records only on-chain addresses, transaction
hashes, and non-sensitive deployment facts. Role administration and custody
procedures belong in the internal operator runbook, not in this public
repository.
