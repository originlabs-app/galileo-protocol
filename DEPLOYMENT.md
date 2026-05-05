# ERC-3643 Infrastructure — Base Sepolia Deployment

Deployed **2026-03-21**. Chain: **Base Sepolia** (chain ID `84532`).
Deployer: `0xA46a59EcD84486f31Bc54A4D9d5C8241Aa998c2e`

Source of truth: [`contracts/deployments/base-sepolia.json`](contracts/deployments/base-sepolia.json)
Minting service: [`apps/api/src/services/blockchain/`](apps/api/src/services/blockchain/)

---

## Contract Addresses

| Contract | Address | Explorer |
|----------|---------|---------|
| GalileoAccessControl | `0xbDC20FA6469fDE0200d8c87CE883D2DE3cAceeE1` | [view](https://sepolia.basescan.org/address/0xbDC20FA6469fDE0200d8c87CE883D2DE3cAceeE1) |
| GalileoClaimTopicsRegistry | `0x5d3d76fcFB1927853e5B7b6B6671fDe749eA41E1` | [view](https://sepolia.basescan.org/address/0x5d3d76fcFB1927853e5B7b6B6671fDe749eA41E1) |
| GalileoTrustedIssuersRegistry | `0x78833255f0c85bB17ee317b9Af3AD39c1173E348` | [view](https://sepolia.basescan.org/address/0x78833255f0c85bB17ee317b9Af3AD39c1173E348) |
| GalileoIdentityRegistryStorage | `0x516cD7a94d402c0bc265057939f2b5eb64e1865D` | [view](https://sepolia.basescan.org/address/0x516cD7a94d402c0bc265057939f2b5eb64e1865D) |
| GalileoIdentityRegistry | `0x04B0318E368C187F9d10681fDDBBBFBC7C6b82B3` | [view](https://sepolia.basescan.org/address/0x04B0318E368C187F9d10681fDDBBBFBC7C6b82B3) |
| GalileoCompliance | `0x4Ae2336E70fc9765Ea0438Ae9563E204B0dF8D18` | [view](https://sepolia.basescan.org/address/0x4Ae2336E70fc9765Ea0438Ae9563E204B0dF8D18) |
| BrandAuthorizationModule | `0x83aA36D6c518151E37bC84732ED424B5bC31B888` | [view](https://sepolia.basescan.org/address/0x83aA36D6c518151E37bC84732ED424B5bC31B888) |
| CPOCertificationModule | `0xC91Ecdf36097D8F5E50B208550a85B0434984bd0` | [view](https://sepolia.basescan.org/address/0xC91Ecdf36097D8F5E50B208550a85B0434984bd0) |
| JurisdictionModule | `0xB8e3E1de072b231494177f9e456128F8D8F86aa6` | [view](https://sepolia.basescan.org/address/0xB8e3E1de072b231494177f9e456128F8D8F86aa6) |
| SanctionsModule | `0xB7fBf8F21A92E8fFc9D4Ec69999d06B6357f5127` | [view](https://sepolia.basescan.org/address/0xB7fBf8F21A92E8fFc9D4Ec69999d06B6357f5127) |
| ServiceCenterModule | `0xa7859F1724c3b40AF6Fd9292ca0233eb7e88e936` | [view](https://sepolia.basescan.org/address/0xa7859F1724c3b40AF6Fd9292ca0233eb7e88e936) |
| GalileoToken (example) | `0x0Eb8764115147Cea9299815ba18bc4724925Afcd` | [view](https://sepolia.basescan.org/address/0x0Eb8764115147Cea9299815ba18bc4724925Afcd) |

> The example token is a pilot deployment. Production tokens are deployed per-product by the minting service — each product gets its own `GalileoToken` contract. The infrastructure addresses above are canonical and shared across all tokens.

---

## Bridge

L1 Standard Bridge (Ethereum Sepolia → Base Sepolia): `0xfd0Bf71F60660E2f608ed56e1659C450eB113120`

Helper script: [`scripts/bridge-to-base.mjs`](scripts/bridge-to-base.mjs)

---

## Testnet Faucet

The faucet lets developers request free Base Sepolia ETH to pay for gas when minting Digital Product Passports.

| Item | Value |
|------|-------|
| API endpoint | `POST /api/v1/faucet/drip` |
| Status endpoint | `GET /api/v1/faucet/status` |
| Public page | `/tools/faucet` (website) |
| Drip amount | 0.001 ETH per request |
| Rate limit | 1 request per wallet per 24h |
| Faucet wallet | `0xA46a59EcD84486f31Bc54A4D9d5C8241Aa998c2e` |

### Monitoring

```bash
# Check faucet balance and drip count
curl "$API_URL/api/v1/faucet/status"
```

### Refilling the faucet

When the faucet balance drops below 0.002 ETH, drips are automatically disabled.
To refill, send Base Sepolia ETH directly to the deployer wallet:

```
0xA46a59EcD84486f31Bc54A4D9d5C8241Aa998c2e
```

Bridge from Ethereum Sepolia using the [L1 Standard Bridge](https://superbridge.app/base-sepolia):

```bash
# Using the helper script
node scripts/bridge-to-base.mjs --amount=0.05
```

Or bridge manually via Superbridge at https://superbridge.app/base-sepolia.

### Enabling / disabling

Set `FAUCET_ENABLED=false` in `apps/api/.env` and restart the API to disable without redeploying.

---

## Post-Deployment TODOs

These steps are required before the first product can be minted end-to-end:

- [ ] **Add trusted issuer** — register Galileo's issuer DID in `GalileoTrustedIssuersRegistry` so identity claims are accepted
- [ ] **Register brand identities** — each brand deploying products must have an on-chain identity in `GalileoIdentityRegistry`
- [ ] **Unpause tokens** — newly deployed `GalileoToken` contracts start paused; call `unpause()` after setup
- [ ] **Sanctions oracle (mainnet only)** — wire a live sanctions list feed to `SanctionsModule` before going to Base Mainnet

---

## How to Use

### Mint a product token (API)

The minting service at `apps/api/src/services/blockchain/` handles the full lifecycle:

```ts
// Deploy a new product token
await mintingService.deployProductToken({ gtin, serial, brandId });

// Issue DPP to consumer wallet
await mintingService.issueToken({ tokenAddress, recipientAddress });
```

Configuration is read from `contracts/deployments/base-sepolia.json` at startup — no hardcoded addresses in application code.
The API minting service embeds the compiled `GalileoCompliance` and
`GalileoToken` bytecode in `apps/api/src/services/blockchain/bytecode.ts` so
Docker/runtime deployments do not depend on ignored `contracts/out` artifacts.

### Re-deploy infrastructure (Foundry)

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

Update `contracts/deployments/base-sepolia.json` after any redeployment.

### Prepare the minting wallet

Generate a dedicated Base Sepolia minting wallet locally. The helper writes
sensitive values only to ignored environment files and prints only public
funding details during normal use.

Security reminder: this repository is public on GitHub. Never commit wallet
secrets, RPC keys, API keys, database credentials, generated backups, or local
environment files. Keep production and testnet secrets in a secret manager.

```bash
node scripts/setup-wallet.mjs --write-env
```

Fund the printed `MINTING_WALLET_ADDRESS` with Base Sepolia ETH, then set
`BASE_SEPOLIA_RPC_URL` in `apps/api/.env.local`. The API also accepts the legacy
alias `BASE_SEPOLIA_RPC`.

Check readiness before attempting a live deploy/mint. This command prints only
public wallet/RPC/balance status and exits non-zero until the wallet is funded
and the RPC points to Base Sepolia:

```bash
node scripts/check-base-sepolia-readiness.mjs
```

Identity registry role administration is intentionally kept outside public
documentation. Operators should use the internal runbook and secret manager for
custody, approvals, and one-time role grants.
