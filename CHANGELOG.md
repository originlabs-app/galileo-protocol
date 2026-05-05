# Changelog

All notable changes to Galileo Protocol are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [2026-05-04] — Live Base Sepolia Mint & Public Readiness

Galileo now has a verified live mint on Base Sepolia and public documentation aligned with the current
blockchain rollout state.

### Added
- **Live Base Sepolia mint evidence** — Constructor-path mint verified on-chain with mint transaction
  `0x9cca203f8c3d988ac79bd5ea5c17cfd23a76d0d1393f32e0fb0f82875ccbc026`
- **Public contract references** — Deployment manifest documents GalileoToken
  `0x11ef46e76ae5fbd0b14e29ac7b1fd93ad5ea01f9` and GalileoCompliance
  `0x688e071B5C7C09c7A9aA6fF0fdd204AD8a7a95Ee`
- **Open-source readiness guard** — Public repo hygiene, ignored local env files, and CI public-release audit
- **Wallet setup documentation** — Local operator flow documented for funding the minting wallet and
  preserving recovery material outside Git

### Changed
- **Roadmap alignment** — Phase 2 status now separates shipped live mint evidence from the remaining identity
  role administration required before full API-driven minting
- **Blockchain deployment notes** — `README.md`, `DEPLOYMENT.md`, and `features.json` now reflect the live
  Base Sepolia verification state

### Security
- **Public-safe documentation pass** — Only public wallet addresses, contract addresses, and transaction hashes
  are documented; mnemonics, private keys, and local environment files remain excluded from Git

## [2026-03-22] — Production Deployment Complete

All four platform components are now live in production: API, Dashboard, Scanner, and Website.

### Added
- **Brand Dashboard live** — The B2B portal is deployed and open for brand onboarding
- **Consumer Scanner live** — The QR-based product verification PWA is accessible for end-users
- **Cloud storage for product assets** — Product images and Digital Passport assets are stored in Cloudflare R2
- **Smart contract verification** — Contracts are now verifiable on the Base Sepolia block explorer
- **Automated release pipeline** — Changesets + GitHub Actions for versioning, changelog generation, and release notes
- **Project engineering standards** — Documentation structure, agent guidelines, and architecture reference
- **Website /changelog and /roadmap** — Public-facing pages live with Base ecosystem integration section

### Fixed
- **Node.js ESM compatibility** — Postbuild script patches Prisma client `.js` extensions for ESM resolution in production
- **Container build reliability** — Smart contract `deployments/` artifacts correctly copied in multi-stage Docker build
- **Vercel deployment scope** — `.vercelignore` updated to exclude `/governance` and `/docs` from website builds

### Infrastructure
- **Production database live** — Full product registry and brand management schema deployed and migrated on Railway
- **End-to-end configuration verified** — Dashboard and Scanner correctly connected to the production API
- **Git hygiene** — 61 stale branches and 60 worktrees pruned from repository

## [1.0.0] — 2026-03-20 — Foundation Release

The complete Galileo Protocol foundation: authentication, product lifecycle, blockchain integration, and consumer verification — shipped and tested.

### Added

**Authentication & Security**
- Session-based authentication with secure httpOnly cookies (no localStorage)
- Web3 wallet sign-in via Sign-In With Ethereum (SIWE / EIP-4361) with one-time nonce protection
- Role-based access control: ADMIN, BRAND_ADMIN, OPERATOR, VIEWER — each brand scoped to its own data
- ERC-1271 Smart Wallet support (Coinbase passkey compatible)
- Wallet linking via EIP-191 signature
- GDPR-compliant data export (Art. 15) and right-to-erasure (Art. 17) endpoints
- CSRF protection, per-IP rate limiting, and versioned API endpoints

**Product Lifecycle**
- Product registry with full lifecycle state machine: DRAFT → MINTING → ACTIVE → TRANSFERRED / RECALLED
- GTIN validation and normalization per GS1 standard (14-digit, mod-10 check digit)
- Decentralized Identifier generation: `did:galileo:01:{gtin}:21:{serial}` format
- Product image upload with cloud storage integration
- QR code generation compliant with GS1 Digital Link specification
- Bulk CSV import with per-row validation (up to 500 products per batch)
- Batch minting of up to 100 DRAFT products in a single operation
- Product recall workflow
- ERC-3643 compliant ownership transfer with five-module compliance verification (jurisdiction, sanctions/OFAC, brand authorization, CPO status, service center)

**Blockchain & Standards**
- GS1 Digital Link resolver returning JSON-LD Digital Product Passports
- JSON-LD output with `IndividualProduct` type, `galileo` and `gs1` context namespaces
- viem client configured for Base Sepolia with failover transport
- ERC-3643 Solidity interfaces with 722 contract tests (Foundry)
- `@galileo/shared` package: Zod schemas, GTIN validation utilities, DID generation, GS1 URL encoding, and 8 luxury product categories

**B2B Dashboard**
- Product list with filtering, sorting, and pagination
- Product creation form with real-time GTIN and serial number validation
- Product detail page with lifecycle controls (mint, transfer, recall)
- CSV import UI with drag-and-drop and per-row error reporting
- Audit log viewer with CSV/JSON export and date-range filtering
- GDPR self-service: data export and account deletion
- Brand onboarding wizard
- Web3 wallet connection (MetaMask, Rabby, Coinbase Smart Wallet via wagmi)

**Consumer Scanner PWA**
- QR code scanning via native Barcode Detection API with WASM fallback (ZXing)
- Product authenticity page with full provenance timeline
- Material composition display
- GS1 Digital Link deep-link routing (`/01/:gtin/21/:serial`)
- Offline support: previously scanned products cached locally
- In-app camera guidance for optimal scanning

**Observability & Reliability**
- Structured logging with automatic PII redaction
- Error tracking and alerting
- Health probes for database and blockchain connectivity
- Webhook system: outbox pattern, HMAC-SHA256 cryptographic signing, exponential backoff retry
- Append-only audit trail with actor anonymization on account deletion
- Multi-stage Docker image with health check
- CI pipeline: automated typecheck, lint, and test on every push

**Testing**
- 372 unit tests covering the API and shared library
- 9 end-to-end scenarios: authentication, product lifecycle, batch import, wallet sign-in, audit export, and transfer compliance
- Isolated test environment with a dedicated test database
