# Changelog — Galileo Luxury Standard

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-05

### Added

#### Governance (Phase 1)
- Apache 2.0 license with NOTICE and DCO 1.1 sign-off
- CHARTER.md establishing 11-member TSC with anti-dominance rules
- CODE_OF_CONDUCT.md (Contributor Covenant 2.1)
- CONTRIBUTING.md with RFC lifecycle (Draft → Proposed → Accepted)
- VERSIONING.md with semver policy and 10-year deprecation sunset
- TSC operational procedures (quorum, voting, escalation)
- Membership tiers (Founding, Contributing, Associate)

#### Architecture (Phase 2)
- hybrid-architecture.md defining on-chain/off-chain data boundary
- CRAB model (Create-Read-Append-Burn) for GDPR erasure
- crypto-agility.md with ML-DSA-65/87 post-quantum migration path
- Hybrid signature period 2027-2029
- did:galileo DID method specification (W3C DID Core v1.0)
- DID document schema for products and entities

#### Data Models (Phase 3)
- DPP Core Schema (JSON-LD) with ESPR mandatory fields
- Product-specific schemas: textile, leather, watch
- 6 EPCIS 2.0 lifecycle event schemas:
  - ObjectEvent: Creation, Commission, Decommission
  - TransactionEvent: Sale, Resale
  - TransformationEvent: Repair/MRO
- CBV vocabulary alignment (bizStep, disposition, bizLocation)
- Molecular signature extensions (spectral fingerprint, terroir, leather)
- Artisan attribution with pseudonymous DIDs

#### Identity (Phase 4)
- IIdentityRegistry.sol extending ERC-3643
- IIdentityRegistryStorage.sol with federated brand binding
- ITrustedIssuersRegistry.sol with issuer categories and certifications
- IClaimTopicsRegistry.sol with 12 predefined Galileo claim topics:
  - Compliance: KYC_BASIC, KYC_ENHANCED, KYB_VERIFIED
  - Jurisdiction: KYC_EU_MIFID, KYC_US_SEC, KYC_APAC_SG
  - Luxury: AUTHORIZED_RETAILER, SERVICE_CENTER, AUTHENTICATOR, AUCTION_HOUSE
  - Heritage: ORIGIN_CERTIFIED, AUTHENTICITY_VERIFIED
- ONCHAINID specification (ERC-734/735)
- W3C Verifiable Credentials 2.0 integration
- BitstringStatusList for credential revocation

#### Token & Compliance (Phase 5)
- IGalileoToken.sol extending ERC-3643
- Single-supply pattern (1 token = 1 product)
- IModularCompliance.sol with pluggable rules
- 5 compliance modules:
  - IBrandAuthorizationModule (brand-verified transfers)
  - ICPOModule (certified pre-owned)
  - IServiceCenterModule (authorized service verification)
  - ISanctionsModule (Chainalysis oracle integration)
  - IJurisdictionModule (export controls, geo-restrictions)
- 8-step transfer validation sequence
- KYC/AML hooks specification

#### Resolver (Phase 6)
- GS1 Digital Link 1.6.0 URI specification
- GS1-Conformant Resolver 1.2.0 protocol
- 8-step resolution algorithm
- Context-aware routing (consumer, brand, regulator, service_center)
- JWT authentication with JWKS
- Linkset response format (RFC 9264)
- GTIN normalization and Modulo-10 validation

#### Infrastructure (Phase 7)
- RBAC framework with 5 roles and 2-tier verification
- Hash-chain audit trail with daily Merkle anchoring
- Data retention policies:
  - 7-year audit retention (SOX)
  - 5-year AML retention (5AMLD)
  - GDPR deletion rights with CRAB model
- Event sourcing pattern for hybrid sync

#### Compliance Documentation (Phase 8)
- GDPR compliance guide with CRAB erasure workflow
- MiCA compliance guide (July 2026 CASP deadline)
- ESPR readiness checklist (2027 textile DPP)

### Changed

- N/A (initial release)

### Deprecated

- N/A (initial release)

### Removed

- N/A (initial release)

### Fixed

#### Post-Audit (2026-05-05)
- Extended did:galileo entity-types (12 types including facility, technician, supplier, etc.)
- Extended entity-name length from {1,64} to {1,80} for anonymized customer DIDs
- Added explicit GS1→DID AI mapping table (identity vs operational AIs)
- Fixed case-sensitive serial normalization in resolution protocol
- Added controller ONCHAINID → brand DID resolution step
- Documented regulator JWT-only authentication as explicit security design decision
- Harmonized all JSON Schema DID patterns with grammar

### Security

- No PII stored on-chain (GDPR compliance)
- Post-quantum cryptography migration path defined
- Asymmetric JWT algorithms only (RS256, ES256)
- 1-hour maximum JWT lifetime
- ONCHAINID verification for service centers

---

## [1.2.0] — 2026-02-22

### Added

#### Smart Contract Implementations (Solidity / Foundry)

Complete Solidity implementation of all Galileo Protocol interfaces defined in v1.0.0, built on ERC-3643 (T-REX v4.1.3) with OpenZeppelin v4.9.6.

**Infrastructure**
- `GalileoAccessControl.sol` — RBAC with ONCHAINID integration, 5 roles (Brand Admin, Operator, Auditor, Regulator, Service Center Admin), two-phase grants, suspension, emergency access (60 tests)

**Identity Layer**
- `GalileoClaimTopicsRegistry.sol` — Claim topic management with group organization, batch operations, and topic metadata (47 tests)
- `GalileoTrustedIssuersRegistry.sol` — Trusted issuer registry with suspension/revocation, expiry tracking, and delegation (65 tests)
- `GalileoIdentityRegistryStorage.sol` — Identity data storage with brand DID binding and federated lookup (68 tests)
- `GalileoIdentityRegistry.sol` — Identity verification engine with consortium features, batch verification, and GDPR consent checking (61 tests)

**Token**
- `GalileoToken.sol` — Single-supply ERC-20 product token (1 token = 1 physical product) with ERC-3643 compliance pipeline, CPO certification lifecycle, `transferWithReason`, decommission, and freeze/unfreeze (141 tests)

**Compliance Engine**
- `GalileoCompliance.sol` — Modular compliance engine with ordered module execution, batch checks, detailed failure reasons, emergency pause, and module introspection (53 tests)
- `BaseComplianceModule.sol` — Abstract base for all compliance modules with bind/unbind lifecycle
- `BrandAuthorizationModule.sol` — Verifies authorized retailers via identity claims (35 tests)
- `CPOCertificationModule.sol` — Enforces CPO requirements for secondary market sales (35 tests)
- `JurisdictionModule.sol` — Country-based transfer restrictions and export controls (36 tests)
- `SanctionsModule.sol` — OFAC/EU sanctions screening via Chainalysis oracle (40 tests)
- `ServiceCenterModule.sol` — MRO authorization for service transfers (39 tests)

**Integration & Deployment**
- `FullLifecycle.t.sol` — End-to-end integration test covering the complete luxury product lifecycle: creation, compliance setup, identity verification, transfers, CPO certification, service center MRO, and decommission (40 tests)
- `Deploy.s.sol` — Full-stack deployment script for all contracts

**Test Coverage: 722 tests (0 failures, 0 skipped)**

| Test Suite | Tests |
|------------|-------|
| GalileoToken | 141 |
| IdentityRegistryStorage | 68 |
| TrustedIssuersRegistry | 65 |
| IdentityRegistry | 61 |
| AccessControl | 60 |
| GalileoCompliance | 53 |
| ClaimTopicsRegistry | 47 |
| FullLifecycle (integration) | 40 |
| SanctionsModule | 40 |
| ServiceCenterModule | 39 |
| JurisdictionModule | 36 |
| BrandAuthorizationModule | 35 |
| CPOCertificationModule | 35 |
| **Total** | **722** |

### Fixed

- `vm.prank` consumption by staticcalls in Foundry test arguments — cached role constants in `setUp()` to prevent external view calls from consuming prank context
- Stale suspension flag deadlock in `TrustedIssuersRegistry.suspendIssuer` — uses live state check instead of cached flag
- Decommissioned token allowing mint/forcedTransfer — added decommission guard to both operations
- Identity registry claim verification robustness — added try/catch safety to `getClaim` and `getClaimIdsByTopic` external calls

---

## [Unreleased]

### Planned for v2.0.0

- Account Abstraction (ERC-4337 integration)
- Gasless transactions via Paymaster
- Smart account multi-sig and session keys
- Social recovery
- Passkey authentication (WebAuthn/FIDO2)
- CPO framework enhancements
- Condition scoring standardization
- Multi-chain support
- Cross-consortium bridges (Aura, Arianee)

---

*Galileo Luxury Standard — Protecting Heritage Through Interoperability*
