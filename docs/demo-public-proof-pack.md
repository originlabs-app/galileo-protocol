# Galileo Public Demo Proof Pack

This is the public-safe gate before sharing the Galileo demo externally.

## Scope

The proof pack must show one complete path:

1. Maison Aurum demo data exists in the target database.
2. The dashboard can call the API from its deployed origin.
3. A product is minted on Base Sepolia.
4. The public resolver returns a verified JSON-LD passport.
5. The scanner PWA opens the same passport on desktop and mobile.
6. The packet contains only public URLs, screenshots, repo links, and public chain identifiers.

## Prepare

Seed and verify the demo dataset in the target environment:

```bash
API_URL="https://<api.example>" pnpm db:seed:demo
pnpm demo:dataset:check
```

Run the dataset check in a shell where `DATABASE_URL` already points to the
target database through your normal secret manager or ignored local env.

Mint one Maison Aurum DRAFT product from the dashboard. Use the product detail
page's Public proof block after minting:

- Download QR
- Open resolver
- Open scanner
- Open transaction
- Open token

## Required Evidence

| Evidence | Required value |
| --- | --- |
| Repository | GitHub URL plus branch and commit SHA |
| API health | `/health` status ok, database ok, chain ok, wallet ok |
| CORS | Dashboard origin passes POST preflight with `X-Galileo-Client` |
| Dataset | Maison Aurum brand, operator, 5 DRAFT products before mint |
| Mint | Base Sepolia transaction hash and token address |
| Resolver | Public JSON-LD URL, status `verified`, chain ID `84532` |
| Scanner | Scanner deep link for the same Digital Link |
| Screenshots | Dashboard product proof, resolver response, desktop scanner, mobile scanner |

## Automated Gate

Run this after the target product is minted:

```bash
DEMO_API_URL="https://<api.example>" \
DEMO_DASHBOARD_URL="https://<dashboard.example>" \
DEMO_SCANNER_URL="https://<scanner.example>" \
DEMO_DIGITAL_LINK="https://<api.example>/01/<gtin>/21/<serial>" \
DEMO_PROOF_PACK_OUT="proof-packs/galileo-demo-proof.json" \
pnpm demo:proof:check
```

The generated JSON is safe to share after review: it includes public URLs,
public chain data, CORS/health status, and git evidence only. Do not add env
files, wallet credentials, database URLs, RPC keys, screenshots containing
admin cookies, or private operator notes.

## Local Dry Run

For local work use the same command shape with local URLs:

```bash
DEMO_API_URL="http://localhost:4000" \
DEMO_DASHBOARD_URL="http://localhost:3000" \
DEMO_SCANNER_URL="http://localhost:3001" \
DEMO_DIGITAL_LINK="http://localhost:4000/01/<gtin>/21/<serial>" \
pnpm demo:proof:check
```

Local dry runs still require the product to be ACTIVE and minted in the target
database. The final external proof pack must be rerun against the deployed
demo URLs.
