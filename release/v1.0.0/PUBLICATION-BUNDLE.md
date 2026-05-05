# Publication Bundle — Galileo Luxury Standard v1.0.0

**Prepared:** 2026-05-05
**License:** Apache 2.0
**Status:** Ready for Publication

---

## Quick Links

| Resource | Path |
|----------|------|
| **License** | [LICENSE](../../LICENSE) |
| **Charter** | [CHARTER.md](../../governance/CHARTER.md) |
| **Contributing** | [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| **Changelog** | [CHANGELOG.md](./CHANGELOG.md) |

---

## Specification Index

### Architecture Layer

| Specification | Path | Standards |
|---------------|------|-----------|
| Hybrid Architecture | `specifications/architecture/hybrid-architecture.md` | GDPR, EDPB 2025 |
| Crypto-Agility | `specifications/crypto/crypto-agility.md` | NIST PQC, ML-DSA |

### Identity Layer

| Specification | Path | Standards |
|---------------|------|-----------|
| DID Method | `specifications/identity/DID-METHOD.md` | W3C DID Core v1.0 |
| DID Document | `specifications/identity/DID-DOCUMENT.md` | W3C DID Core v1.0 |
| Claim Topics | `specifications/identity/claim-topics.md` | ERC-3643 |
| ONCHAINID | `specifications/identity/onchainid-specification.md` | ERC-734/735 |
| Verifiable Credentials | `specifications/identity/verifiable-credentials.md` | W3C VC 2.0 |

### Contract Interfaces

| Interface | Path | Standards |
|-----------|------|-----------|
| IIdentityRegistry | `specifications/contracts/identity/IIdentityRegistry.sol` | ERC-3643 |
| IIdentityRegistryStorage | `specifications/contracts/identity/IIdentityRegistryStorage.sol` | ERC-3643 |
| ITrustedIssuersRegistry | `specifications/contracts/identity/ITrustedIssuersRegistry.sol` | ERC-3643 |
| IClaimTopicsRegistry | `specifications/contracts/identity/IClaimTopicsRegistry.sol` | ERC-3643 |
| IGalileoToken | `specifications/contracts/token/IGalileoToken.sol` | ERC-3643 |
| IModularCompliance | `specifications/contracts/compliance/IModularCompliance.sol` | ERC-3643 |

### Data Schemas

| Schema | Path | Standards |
|--------|------|-----------|
| DPP Core | `specifications/schemas/dpp/dpp-core.schema.json` | JSON-LD, ESPR |
| DPP Textile | `specifications/schemas/dpp/dpp-textile.schema.json` | ESPR 2027 |
| DPP Leather | `specifications/schemas/dpp/dpp-leather.schema.json` | ESPR 2027 |
| DPP Watch | `specifications/schemas/dpp/dpp-watch.schema.json` | ESPR 2027 |

### Event Schemas

| Schema | Path | Standards |
|--------|------|-----------|
| Event Base | `specifications/schemas/events/event-base.schema.json` | EPCIS 2.0 |
| Creation | `specifications/schemas/events/creation.schema.json` | EPCIS 2.0 |
| Commission | `specifications/schemas/events/commission.schema.json` | EPCIS 2.0 |
| Sale | `specifications/schemas/events/sale.schema.json` | EPCIS 2.0 |
| Resale | `specifications/schemas/events/resale.schema.json` | EPCIS 2.0 |
| Repair | `specifications/schemas/events/repair.schema.json` | EPCIS 2.0 |
| Decommission | `specifications/schemas/events/decommission.schema.json` | EPCIS 2.0 |

### Resolver Layer

| Specification | Path | Standards |
|---------------|------|-----------|
| Digital Link URI | `specifications/resolver/digital-link-uri.md` | GS1 DL 1.6.0 |
| Resolution Protocol | `specifications/resolver/resolution-protocol.md` | GS1 Resolver 1.2.0 |
| Context Routing | `specifications/resolver/context-routing.md` | ESPR tiered access |
| Access Control | `specifications/resolver/access-control.md` | RFC 7519 JWT |
| Linkset Schema | `specifications/resolver/linkset-schema.json` | RFC 9264 |

### Infrastructure Layer

| Specification | Path | Standards |
|---------------|------|-----------|
| RBAC Framework | `specifications/infrastructure/rbac-framework.md` | OpenZeppelin |
| Audit Trail | `specifications/infrastructure/audit-trail.md` | SOX, 5AMLD |
| Data Retention | `specifications/infrastructure/data-retention.md` | GDPR, AML |
| Hybrid Sync | `specifications/infrastructure/hybrid-sync.md` | Event Sourcing |

### Compliance Guides

| Guide | Path | Regulation |
|-------|------|------------|
| GDPR Compliance | `specifications/compliance/guides/gdpr-compliance.md` | GDPR |
| MiCA Compliance | `specifications/compliance/guides/mica-compliance.md` | MiCA 2023/1114 |
| ESPR Readiness | `specifications/compliance/guides/espr-readiness.md` | ESPR 2024/1781 |

---

## Repository Structure

```
├── LICENSE                    # Apache 2.0
├── CONTRIBUTING.md            # RFC process & DCO sign-off
├── CODE_OF_CONDUCT.md         # Contributor Covenant 2.1
├── SECURITY.md                # Vulnerability disclosure policy
├── governance/
│   ├── CHARTER.md             # Governance charter
│   ├── NOTICE                 # Copyright attribution
│   ├── VERSIONING.md          # Semver policy
│   ├── tsc/                   # TSC procedures
│   ├── membership/            # Membership tiers
│   └── rfcs/                  # RFC templates
├── specifications/
│   ├── architecture/          # Hybrid architecture, crypto-agility
│   ├── identity/              # DID, ONCHAINID, VC
│   ├── contracts/             # Solidity interfaces
│   ├── schemas/               # JSON schemas (DPP, events)
│   ├── resolver/              # GS1 resolver specs
│   ├── infrastructure/        # RBAC, audit, retention
│   └── compliance/            # Regulatory guides
├── website/                   # Next.js documentation portal
└── release/
    └── v1.0.0/
        ├── TSC-REVIEW-PACK.md
        ├── CHANGELOG.md
        └── PUBLICATION-BUNDLE.md
```

---

## External References

### Standards Bodies

| Organization | Standard | Version |
|--------------|----------|---------|
| W3C | DID Core | v1.0 (July 2022) |
| W3C | Verifiable Credentials | v2.0 |
| GS1 | Digital Link | 1.6.0 (April 2025) |
| GS1 | Conformant Resolver | 1.2.0 (January 2026) |
| GS1 | EPCIS | 2.0 |
| IETF | RFC 9264 (Linkset) | |
| IETF | RFC 7519 (JWT) | |
| ERC | ERC-3643 (T-REX) | v4.1.3 |
| ERC | ERC-734/735 | |
| NIST | ML-DSA | FIPS 204 |

### Regulations

| Regulation | Identifier | Deadline |
|------------|------------|----------|
| GDPR | 2016/679 | Active |
| MiCA | 2023/1114 | July 2026 |
| ESPR | 2024/1781 | 2027 (textiles) |
| 5AMLD | 2018/843 | Active |

---

## Publication Checklist

- [x] All specifications complete
- [x] License files in place
- [x] Governance documents ready
- [x] TSC Review Pack prepared
- [x] Changelog finalized
- [x] Specification index created
- [ ] TSC ratification vote
- [ ] GitHub repository public
- [ ] Documentation site deployed
- [ ] Announcement published

---

*Galileo Luxury Standard v1.0.0 — Ready for Publication*
