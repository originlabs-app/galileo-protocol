# Base Ecosystem Integration

Research findings for integrating Galileo Protocol with Base ecosystem tooling.
Last updated: 2026-03-21.

---

## Priority Matrix

| Tool | Priority | Effort | Impact |
|------|----------|--------|--------|
| Coinbase Smart Wallet | HIGH | Medium | Consumer UX — no seed phrase onboarding |
| OnchainKit | HIGH | Low | Drop-in React components for wallet + tx |
| Paymaster | HIGH | Low | Gasless transactions for consumers |
| BaseScan API | MEDIUM | Low | Contract verification in CI |
| The Graph | MEDIUM | Medium | DPP event indexing for audit trail |
| Spindl | MEDIUM | Low | Onchain analytics |

---

## HIGH Priority

### OnchainKit (`@coinbase/onchainkit`)

React component library for Base-native UX — wallet connection, transaction flows, identity display.

**What it provides:**
- `<ConnectWallet>` — one-click wallet connect with Coinbase Smart Wallet, MetaMask, WalletConnect
- `<Transaction>` — guided transaction flow with status feedback (pending → confirmed → error)
- `<Identity>` — renders ENS/basename + avatar for a wallet address
- `<TokenChip>`, `<NFTCard>` — display token/NFT metadata

**Integration targets:**
- **Dashboard** (`apps/dashboard`): Replace current SIWE wallet connect UI with `<ConnectWallet>`. Wrap mint/transfer calls in `<Transaction>` for better operator UX.
- **Scanner** (`apps/scanner`): Use `<Identity>` to display owner wallet info on DPP verification page.

**Install:**
```bash
pnpm --filter dashboard add @coinbase/onchainkit
pnpm --filter scanner add @coinbase/onchainkit
```

**Docs:** https://onchainkit.xyz

---

### Coinbase Smart Wallet

ERC-4337 smart account with passkey authentication — no seed phrase, no browser extension required.

**What it provides:**
- Passkey-based auth (Face ID / Touch ID / platform authenticator)
- Wallet creation in ~3 seconds
- Social recovery options
- Works with OnchainKit out of the box

**Why it matters for Galileo:**
- Consumer-facing scanner must have near-zero friction. Luxury goods buyers should not need MetaMask.
- Brand admins in dashboard benefit from hardware-backed key security without managing a hardware wallet.

**Integration targets:**
- **Scanner**: Primary wallet option for consumers claiming DPP ownership
- **Dashboard**: Optional for brand admins (alongside existing SIWE flow)

**Docs:** https://www.coinbase.com/developer-platform/smart-wallet

---

### Paymaster (`paymaster.base.org`)

ERC-4337 paymaster that sponsors gas fees for end users.

**What it provides:**
- Gasless transactions — Galileo pays gas, consumers pay nothing
- Up to **$10K/month free** on Base Mainnet (Coinbase Developer Platform tier)
- Configurable sponsorship policies (allowlist by contract, method selector, user)

**Why it matters for Galileo:**
- Consumers scanning a DPP should never be asked to pay gas. This removes the biggest Web3 UX barrier.
- Product token transfers (ownership changes) become frictionless.

**Integration targets:**
- **API** (`apps/api`): Configure paymaster URL in `viem` WalletClient for minting service
- **Scanner**: Route consumer-initiated transactions through paymaster

**Config example:**
```ts
// apps/api/src/services/blockchain/client.ts
const paymasterClient = createPaymasterClient({
  transport: http('https://api.developer.coinbase.com/rpc/v1/base-sepolia/<KEY>'),
});
```

**Docs:** https://docs.base.org/docs/tools/paymaster

---

## MEDIUM Priority

### BaseScan API

Programmatic contract verification on https://sepolia.basescan.org.

**Integration targets:**
- **CI** (`.github/workflows/ci.yml`): Auto-verify contracts after Foundry deployment
- **Foundry** (`contracts/`): Add `--verify --etherscan-api-key $BASESCAN_API_KEY` to deploy script

**Config:**
```bash
# foundry.toml
[etherscan]
base-sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
```

---

### The Graph

Subgraph for indexing `GalileoToken` events (Transfer, Paused, IdentityRegistered, etc.).

**What it provides:**
- GraphQL API over indexed contract events
- Historical DPP ownership trail without scanning the full chain
- Real-time event subscriptions

**Integration targets:**
- **API** (`apps/api`): Replace direct RPC event queries with subgraph queries for ownership history endpoint
- **Dashboard**: DPP audit trail UI

**Steps:**
1. Write subgraph manifest (`subgraph.yaml`) for `GalileoToken` ABI
2. Deploy to The Graph hosted service or self-hosted Graph Node
3. Expose ownership history via `/products/:id/history` API route

**Docs:** https://thegraph.com/docs

---

### Spindl

Onchain analytics platform — tracks wallet interactions, conversion funnels, retention.

**What it provides:**
- Per-wallet event tracking without cookies or fingerprinting
- Conversion analytics (scan → claim → transfer)
- Cohort analysis by acquisition channel

**Integration targets:**
- **Scanner** (`apps/scanner`): Instrument DPP scan events with Spindl SDK
- **Dashboard**: Analytics view for brand admins (scan counts, claim rates per product)

**Install:**
```bash
pnpm --filter scanner add @spindl-xyz/attribution
```

---

## Per-App Integration Plan

### `apps/dashboard`
1. Install `@coinbase/onchainkit`
2. Replace wallet connect UI with `<ConnectWallet>` (Smart Wallet as default provider)
3. Wrap minting/transfer calls with `<Transaction>` component
4. Add Spindl dashboard view (brand analytics)

### `apps/scanner`
1. Install `@coinbase/onchainkit`
2. Add `<ConnectWallet>` for DPP claim flow
3. Display owner identity with `<Identity>`
4. Route claim transactions through Paymaster (gasless)
5. Instrument scan events with Spindl

### `apps/api`
1. Configure Paymaster URL in `viem` client factory
2. Add `/products/:id/history` route backed by The Graph subgraph
3. Expose Spindl event forwarding endpoint (optional server-side attribution)

### `apps/website`
1. Add "Built on Base" badge + OnchainKit showcase
2. Link to BaseScan for contract transparency

### `contracts/`
1. Add BaseScan verification to Foundry deploy script
2. Write and deploy The Graph subgraph manifest
