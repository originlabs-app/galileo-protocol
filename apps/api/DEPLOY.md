# Deploying the Galileo API

The API is a Fastify 5 server in a pnpm Turborepo monorepo. It ships with a multi-stage
Dockerfile and a `railway.toml` for one-click Railway deployment.

---

## Railway (recommended)

### First deploy

1. Push the repo to GitHub (if not already done).
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Select this repository. Railway auto-detects `apps/api/railway.toml`.
4. Add a **PostgreSQL** plugin inside the Railway project (it will set `DATABASE_URL` automatically).
5. Set the environment variables below under **Variables**.
6. Deploy — Railway builds the Docker image from `apps/api/Dockerfile` using the repo root
   as build context, then starts `node dist/main.js`.

### Required environment variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL plugin |
| `JWT_SECRET` | Min 32 chars — generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `CORS_ORIGIN` | Comma-separated allowed dashboard and scanner origins, e.g. `https://dashboard.example,https://scanner.example` |
| `BASE_SEPOLIA_RPC_URL` | Alchemy/Infura Base Sepolia endpoint |
| `DEPLOYER_PRIVATE_KEY` | `0x`-prefixed 32-byte hex — faucet & minting wallet |
| `FAUCET_ENABLED` | `true` to enable `POST /api/v1/faucet/drip` |
| `NODE_ENV` | `production` |

Optional but recommended:

| Variable | Notes |
|---|---|
| `COOKIE_SECRET` | Min 32 chars — hardens cookie signing |
| `ENABLE_SWAGGER` | `false` in production to hide `/docs` |
| `SENTRY_DSN` | Error tracking |

### Database migration

After the first deploy, run Prisma migrations from the Railway shell or a one-off job:

```bash
npx prisma migrate deploy
```

---

## Website (Vercel)

The website should point to the public Galileo Protocol domain.
Once the API is live on Railway, set this variable in Vercel's project settings:

```
NEXT_PUBLIC_API_URL=https://<your-railway-domain>.railway.app
```

The Faucet component reads this variable and falls back to `http://localhost:4000` in dev.

---

## Health check

The API exposes `GET /health` — Railway uses this for zero-downtime deploys.

```bash
curl https://<your-railway-domain>.railway.app/health
# → {"status":"ok"}
```

---

## Local Docker test

```bash
# Build from repo root
docker build -f apps/api/Dockerfile -t galileo-api .

docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  galileo-api
```
