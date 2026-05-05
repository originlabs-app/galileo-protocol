# Galileo Protocol Smart Contracts

Solidity implementation of the Galileo Protocol — an open standard for luxury product traceability and digital ownership on EVM blockchains.

Built on [ERC-3643 (T-REX)](https://erc3643.org/) with luxury-specific extensions for CPO certification, compliance modules, and consortium identity management.

## Architecture

```
contracts/
├── src/
│   ├── infrastructure/
│   │   └── GalileoAccessControl.sol      # RBAC + ONCHAINID integration
│   ├── identity/
│   │   ├── GalileoClaimTopicsRegistry.sol # Claim topic management
│   │   ├── GalileoTrustedIssuersRegistry.sol # Trusted issuer registry
│   │   ├── GalileoIdentityRegistryStorage.sol # Identity data storage
│   │   └── GalileoIdentityRegistry.sol    # Identity verification engine
│   ├── token/
│   │   └── GalileoToken.sol               # Single-supply product token
│   └── compliance/
│       ├── GalileoCompliance.sol          # Modular compliance engine
│       └── modules/
│           ├── BrandAuthorizationModule.sol
│           ├── CPOCertificationModule.sol
│           ├── JurisdictionModule.sol
│           ├── SanctionsModule.sol
│           └── ServiceCenterModule.sol
├── test/                                  # 722 tests
├── script/
│   └── Deploy.s.sol                       # Full-stack deployment
└── foundry.toml
```

## Key Concepts

### Single-Supply Token Pattern
Each `GalileoToken` deployment represents **one physical luxury product** (totalSupply = 1). The token holder is the product owner. This enables:
- 1:1 mapping between token and physical item
- Individual product lifecycle management (CPO certification, decommission)
- Product-specific compliance rules

### ERC-3643 Compliance
All transfers go through a modular compliance pipeline. Five built-in modules:

| Module | Purpose |
|--------|---------|
| **BrandAuthorization** | Verifies authorized retailers via identity claims |
| **CPOCertification** | Enforces CPO requirements for secondary sales |
| **Jurisdiction** | Country-based transfer restrictions |
| **Sanctions** | OFAC/EU sanctions screening via oracle |
| **ServiceCenter** | MRO authorization for service transfers |

### Identity Layer
GDPR-compliant identity verification using ONCHAINID:
- Cross-brand consent verification (GDPR Article 6)
- Batch verification for gas efficiency
- Consortium membership for federated identity

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Build

```bash
cd contracts
forge build
```

### Test

```bash
forge test
```

Run with verbosity for detailed output:
```bash
forge test -vvv
```

Run specific test suite:
```bash
forge test --match-path test/token/GalileoToken.t.sol
```

### Deploy (local)

```bash
# Start local node
anvil

# Deploy full stack
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

## Data Flow

```
1. Brand deploys GalileoToken (1 per product)
2. Brand registers in IdentityRegistry via ONCHAINID
3. Brand configures compliance modules on token
4. Buyer gets verified via ClaimTopicsRegistry + TrustedIssuers
5. Transfer request → Compliance pipeline checks all modules
6. If compliant → ownership transferred on-chain
7. CPO certifier can certify token for secondary market
```

## Dependencies

- **OpenZeppelin Contracts** v4.9.6 — Access control, ERC-20 utilities
- **ERC-3643 T-REX** v4.1.3 — Permissioned token interfaces
- **ONCHAINID** — Decentralized identity (claim verification)

## Tech Stack

- Solidity ^0.8.17
- Foundry (forge, cast, anvil)
- 722 tests (unit + integration)

## License

Apache-2.0
