# Frontend — Galileo Protocol

## Apps

| App | Stack | Purpose |
|-----|-------|---------|
| `apps/dashboard` | Next.js 16, React 19 | B2B portal for brand admins |
| `apps/scanner` | Next.js 16, React 19 | Consumer-facing QR scanner PWA |
| `apps/website` | Next.js | Documentation portal |

## Dashboard

### Design system

- **shadcn/ui** — component library (Radix UI primitives + Tailwind CSS)
- **Tailwind CSS 4** — utility-first styling
- **Radix UI** — accessible headless components
- `apps/dashboard/components.json` — shadcn configuration

### Routing (App Router)

```
app/
├── layout.tsx              # Root layout with AuthProvider
├── page.tsx                # Home → redirect to dashboard or login
├── login/                  # Login page (email/password + SIWE)
├── register/               # Registration page
└── dashboard/              # Protected B2B area
```

### State management

- **TanStack Query** — server state, API data fetching and caching
- **wagmi** — wallet state (connect, disconnect, sign)
- **AuthProvider context** — single `/auth/me` fetch, SSR-safe via `useSyncExternalStore`

### Auth guard

`AuthGuard` component uses `useSyncExternalStore` for SSR safety — no localStorage, reads cookies
server-side. Protects all dashboard routes.

### API communication

All API calls go to Fastify (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000`). Dashboard uses a
central API helper that automatically appends `X-Galileo-Client: true` header on mutating requests.

### Wallet integration

- **wagmi + viem** — wallet connection (MetaMask, Rabby, injected)
- **Coinbase Smart Wallet** — ERC-1271 passkey support
- **SIWE** — sign-in with Ethereum flow

### E2E tests

Playwright (`apps/dashboard/e2e/`). Run:
```bash
pnpm --filter dashboard exec playwright test
```

9 specs: auth, product lifecycle, dashboard home, product filters, upload, transfer compliance, audit
export, batch import, SIWE + wallet auth.

## Scanner

- Next.js 16 PWA
- `barcode-detector` API for QR scanning
- GS1 Digital Link deep links — decodes `/01/{gtin}/21/{serial}` to display product info
- Material composition display from DPP metadata
- No auth required — public consumer surface
