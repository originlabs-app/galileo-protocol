# Jurisdiction Rules Specification

**Specification:** GSPEC-JURISDICTION-001
**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31

## 1. Overview

### 1.1 Purpose

The jurisdiction rules specification defines country-based transfer restrictions for luxury goods tokens within the Galileo ecosystem. These rules enable:

- **Export Control Compliance:** Blocking transfers to countries under sanctions or export restrictions
- **Territory Rights Enforcement:** Enforcing brand-specific territorial distribution agreements
- **Regulatory Compliance:** Meeting jurisdiction-specific regulatory requirements
- **Risk Management:** Limiting exposure to high-risk jurisdictions

### 1.2 Regulatory Drivers

| Regulation | Scope | Requirement |
|------------|-------|-------------|
| OFAC SDN | United States | Block transactions with sanctioned countries/entities |
| EAR | United States | Export Administration Regulations for controlled items |
| ITAR | United States | International Traffic in Arms (for certain materials) |
| EU Sanctions | European Union | Block transactions with EU-sanctioned countries |
| UN Sanctions | Global | UN Security Council resolutions |
| FATF Recommendations | Global | Enhanced due diligence for grey-list countries |

### 1.3 ERC-3643 Patterns

This specification builds upon two ERC-3643 compliance module patterns:

- **CountryAllowModule:** Whitelist approach - only specified countries can receive transfers
- **CountryRestrictModule:** Blacklist approach - specified countries cannot receive transfers

Both patterns use the country code stored in the Identity Registry for each registered identity.

## 2. Country Code Standard

### 2.1 ISO 3166-1 Numeric Codes

Galileo uses ISO 3166-1 numeric codes (uint16) for country identification, as specified in ERC-3643:

| Country | ISO Code | Common Use |
|---------|----------|------------|
| United States | 840 | Primary market |
| France | 250 | Primary market (luxury headquarters) |
| United Kingdom | 826 | Primary market |
| Germany | 276 | Primary market |
| Italy | 380 | Primary market |
| Switzerland | 756 | Watch industry hub |
| Japan | 392 | Major luxury market |
| China | 156 | Major luxury market |
| Hong Kong | 344 | Luxury retail hub |
| Singapore | 702 | APAC luxury hub |
| United Arab Emirates | 784 | Middle East hub |

### 2.2 Sanctioned Countries (Reference List)

Current OFAC comprehensive sanctions (as of specification date):

| Country | ISO Code | Sanctions Regime |
|---------|----------|-----------------|
| North Korea | 408 | OFAC Comprehensive |
| Iran | 364 | OFAC Comprehensive |
| Cuba | 192 | OFAC Comprehensive |
| Syria | 760 | OFAC Comprehensive |
| Russia | 643 | OFAC/EU Partial (evolving) |
| Belarus | 112 | EU Sanctions |
| Myanmar | 104 | OFAC Targeted |

**Note:** Sanctions lists are dynamic. Implementations MUST provide mechanisms for regular updates.

### 2.3 Identity Registry Integration

Country codes are stored per-identity via the ERC-3643 `registerIdentity` function:

```solidity
// From IIdentityRegistry (ERC-3643)
function registerIdentity(
    address _userAddress,
    IIdentity _identity,
    uint16 _country  // ISO 3166-1 numeric code
) external;

// Retrieve country code
function investorCountry(address _userAddress) external view returns (uint16);
```

The Galileo `IGalileoIdentityRegistry` inherits this functionality.

## 3. Restriction Modes

### 3.1 Allow Mode (CountryAllowModule Pattern)

**Behavior:** Only addresses registered in allowed countries can receive transfers.

**Use Cases:**
- Territory-limited product launches (e.g., Japan-exclusive watch edition)
- Regulatory restrictions (products only cleared for certain markets)
- Distribution agreement enforcement (exclusive retailer territories)

**Configuration Schema:**

```json
{
  "mode": "ALLOW",
  "countries": [392, 156, 344, 702],
  "description": "Asia-Pacific limited edition launch",
  "effectiveDate": "2026-03-01T00:00:00Z",
  "expiryDate": null
}
```

**Verification Logic:**

```
IF receiver.country IN allowedCountries
  THEN transfer ALLOWED
  ELSE transfer BLOCKED (reason: "Country not in allowed list")
```

### 3.2 Restrict Mode (CountryRestrictModule Pattern)

**Behavior:** Addresses registered in restricted countries cannot receive transfers.

**Use Cases:**
- Export control compliance (sanctioned countries)
- High-risk jurisdiction blocking
- Regulatory prohibition

**Configuration Schema:**

```json
{
  "mode": "RESTRICT",
  "countries": [408, 364, 192, 760],
  "description": "OFAC comprehensive sanctions compliance",
  "effectiveDate": "2026-01-01T00:00:00Z",
  "expiryDate": null
}
```

**Verification Logic:**

```
IF receiver.country IN restrictedCountries
  THEN transfer BLOCKED (reason: "Country in restricted list")
  ELSE transfer ALLOWED
```

## 4. Brand-Specific Territory Rights

### 4.1 Territory Configuration

Brands can define product-specific or category-specific territory restrictions:

```json
{
  "brandDID": "did:galileo:brand:hermes",
  "territoryRules": [
    {
      "id": "TR-001",
      "name": "Europe Initial Launch",
      "scope": {
        "categories": ["HANDBAG", "LEATHER_GOODS"],
        "productPattern": null
      },
      "restriction": {
        "mode": "ALLOW",
        "countries": [250, 276, 380, 826, 756, 040, 056],
        "countryGroups": ["EU_MEMBERS"]
      },
      "effectiveDate": "2026-03-01",
      "expiryDate": "2026-06-01",
      "reason": "Initial launch territories for Spring collection"
    },
    {
      "id": "TR-002",
      "name": "Global Sanctions Compliance",
      "scope": {
        "categories": null,
        "productPattern": null
      },
      "restriction": {
        "mode": "RESTRICT",
        "countries": [],
        "countryGroups": ["OFAC_SANCTIONED", "EU_SANCTIONED"]
      },
      "effectiveDate": "2026-01-01",
      "expiryDate": null,
      "reason": "Export control compliance"
    }
  ]
}
```

### 4.2 Product-Specific Overrides

Individual products can have territory restrictions that override brand defaults:

```json
{
  "productDID": "did:galileo:01:01234567890128:21:SN123456",
  "territoryOverride": {
    "mode": "ALLOW",
    "countries": [392],
    "reason": "Japan-exclusive numbered edition"
  }
}
```

## 5. Export Control Lists

### 5.1 Integration with Control Regimes

| Regime | Authority | Data Source | Update Frequency |
|--------|-----------|-------------|------------------|
| OFAC SDN | US Treasury | treasury.gov/ofac | Daily |
| OFAC Consolidated | US Treasury | treasury.gov/ofac | Daily |
| EU Consolidated | European Commission | ec.europa.eu | Weekly |
| UN Security Council | United Nations | un.org/securitycouncil | As published |
| UK Sanctions | OFSI | gov.uk/ofsi | Weekly |

### 5.2 ITAR Considerations

For products containing controlled materials (certain exotic leathers, precious metals from controlled sources):

| Control Type | Jurisdiction | Galileo Handling |
|--------------|--------------|------------------|
| ITAR Category XIII | US Only | Off-chain compliance check |
| Dual-Use (EAR) | US Export | Country restriction integration |
| CITES Appendix I | Global | Off-chain documentation |

**Note:** ITAR/EAR compliance typically requires additional off-chain documentation and export licenses. The on-chain jurisdiction module provides the blocking mechanism; full export compliance requires supplementary processes.

### 5.3 Update Process

```
1. Regulatory change detected (OFAC update, EU regulation)
        |
        v
2. Compliance team reviews change
        |
        v
3. Mapping to ISO 3166-1 codes
        |
        v
4. TSC approval (for global consortium changes)
   OR Brand admin approval (for brand-specific changes)
        |
        v
5. On-chain update via addCountry()/removeCountry()
        |
        v
6. Events emitted for audit trail
        |
        v
7. Affected transfers immediately blocked/unblocked
```

## 6. Country Group Definitions

### 6.1 Predefined Country Groups

The Galileo ecosystem defines standard country groups for convenience:

| Group ID | Description | Example Countries |
|----------|-------------|-------------------|
| `OFAC_SANCTIONED` | Countries under comprehensive US sanctions | 408 (DPRK), 364 (Iran), 192 (Cuba), 760 (Syria) |
| `EU_SANCTIONED` | Countries under EU comprehensive sanctions | 643 (Russia), 112 (Belarus), 760 (Syria) |
| `FATF_GREYLIST` | FATF grey list countries | Dynamic - updated based on FATF announcements |
| `OECD_MEMBERS` | OECD member countries | 840, 250, 276, 826, 392, etc. (38 countries) |
| `EU_MEMBERS` | European Union member states | 250, 276, 380, 724, 056, etc. (27 countries) |
| `APAC_DEVELOPED` | Developed APAC markets | 392, 410, 702, 344, 158 |
| `GCC` | Gulf Cooperation Council | 784, 682, 634, 414, 048, 512 |

### 6.2 Group Resolution

Groups are resolved at check time to their constituent countries:

```solidity
// Library for group resolution
library CountryGroups {
    bytes32 public constant OFAC_SANCTIONED = keccak256("OFAC_SANCTIONED");
    bytes32 public constant EU_SANCTIONED = keccak256("EU_SANCTIONED");
    bytes32 public constant FATF_GREYLIST = keccak256("FATF_GREYLIST");
    bytes32 public constant OECD_MEMBERS = keccak256("OECD_MEMBERS");
    bytes32 public constant EU_MEMBERS = keccak256("EU_MEMBERS");
    bytes32 public constant APAC_DEVELOPED = keccak256("APAC_DEVELOPED");
}
```

### 6.3 Group Management

- **Consortium-managed groups:** OFAC_SANCTIONED, EU_SANCTIONED, FATF_GREYLIST
- **Static groups:** OECD_MEMBERS, EU_MEMBERS (updated only on political changes)
- **Custom groups:** Brands can define custom groups for internal use

## 7. Conflict Resolution

### 7.1 Priority Hierarchy

When multiple rules apply to a transfer, the following priority order is enforced:

| Priority | Rule Type | Effect |
|----------|-----------|--------|
| 1 (Highest) | Consortium sanctions | Always blocks if matched |
| 2 | Brand sanctions override | Blocks if brand restricts |
| 3 | Product territory restrictions | Blocks if product restricts |
| 4 | Brand territory defaults | Blocks if brand restricts |
| 5 (Lowest) | Default behavior | Allow transfer |

### 7.2 Conflict Resolution Flow

```
Transfer request: from -> to
          |
          v
[1. Check consortium sanctions list]
     |
     +-- Match found? --> BLOCKED: "Sanctioned country (consortium)"
     |
     (no match)
     v
[2. Check brand-specific sanctions]
     |
     +-- Match found? --> BLOCKED: "Sanctioned country (brand)"
     |
     (no match)
     v
[3. Check product territory restrictions (if any)]
     |
     +-- Product has allow list AND country not in list? --> BLOCKED: "Outside product territory"
     +-- Product has restrict list AND country in list? --> BLOCKED: "Product territory restriction"
     |
     (passes or no product restrictions)
     v
[4. Check brand territory defaults]
     |
     +-- Brand has allow list AND country not in list? --> BLOCKED: "Outside brand territory"
     +-- Brand has restrict list AND country in list? --> BLOCKED: "Brand territory restriction"
     |
     (passes or no brand restrictions)
     v
ALLOWED: Transfer permitted
```

### 7.3 Exception Handling

In rare cases, authorized agents may override restrictions:

| Exception Type | Authority | Use Case |
|----------------|-----------|----------|
| Diplomatic Transfer | TSC Multi-sig | Government/diplomatic transfers |
| Legal Compliance | Brand + TSC | Court-ordered transfers |
| Emergency Repatriation | Brand Agent | Return to country of origin |

Exceptions MUST be documented with legal justification and logged for audit.

## 8. Country Code Verification Flow

### 8.1 Complete Verification Sequence

```
Transfer requested (from, to, amount)
          |
          v
[1. Get receiver identity from Identity Registry]
    └── identityRegistry.identity(to)
    └── If not registered -> BLOCKED: "Receiver not registered"
          |
          v
[2. Get receiver country code]
    └── identityRegistry.investorCountry(to)
    └── If country == 0 -> BLOCKED: "Country not specified"
          |
          v
[3. Check active jurisdiction mode]
    └── jurisdictionModule.jurisdictionMode()
          |
          |--- ALLOW mode ---+
          |                  |
          v                  v
[Check if country in      [Check if country in
 restricted list]          allowed list]
          |                  |
    In list?              In list?
     YES: BLOCKED         NO: BLOCKED
     NO: continue          YES: continue
          |                  |
          +--------+---------+
                   |
                   v
[4. Check country groups (if applicable)]
    └── For each active group, check membership
    └── If any group blocks -> BLOCKED
          |
          v
ALLOWED: Jurisdiction check passed
```

### 8.2 Cross-Border Transfer Requirements

For transfers where sender and receiver are in different countries:

| Scenario | Additional Requirements |
|----------|------------------------|
| Intra-EU | No additional requirements (single market) |
| US to EU | May require export documentation |
| EU to non-EU | May require customs declaration |
| Any to sanctioned | BLOCKED regardless of documentation |
| Cross-border with CITES items | Off-chain CITES permit verification |

## 9. Events for Compliance Audit

### 9.1 Jurisdiction-Specific Events

```solidity
/// @notice Emitted when jurisdiction check is performed
/// @param receiver The address being checked
/// @param country The ISO 3166-1 country code
/// @param allowed Whether the transfer was allowed
event JurisdictionCheckPerformed(
    address indexed receiver,
    uint16 indexed country,
    bool allowed
);

/// @notice Emitted when transfer is blocked due to jurisdiction
/// @param from The sender address
/// @param to The receiver address
/// @param country The blocked country code
event TransferBlockedJurisdiction(
    address indexed from,
    address indexed to,
    uint16 indexed country
);

/// @notice Emitted when countries are added to the list
/// @param countries Array of country codes added
/// @param mode Current jurisdiction mode
event CountriesAdded(
    uint16[] countries,
    JurisdictionMode mode
);

/// @notice Emitted when countries are removed from the list
/// @param countries Array of country codes removed
/// @param mode Current jurisdiction mode
event CountriesRemoved(
    uint16[] countries,
    JurisdictionMode mode
);

/// @notice Emitted when jurisdiction mode changes
/// @param oldMode Previous mode
/// @param newMode New mode
event JurisdictionModeChanged(
    JurisdictionMode oldMode,
    JurisdictionMode newMode
);

/// @notice Emitted when a country group is activated
/// @param groupId The group identifier
event CountryGroupAdded(bytes32 indexed groupId);

/// @notice Emitted when a country group is deactivated
/// @param groupId The group identifier
event CountryGroupRemoved(bytes32 indexed groupId);
```

### 9.2 Audit Log Requirements

All jurisdiction events MUST be retained for:
- **Minimum 7 years** for financial regulatory compliance
- **Indexed by country code** for regulatory reporting
- **Cross-referenced with off-chain compliance documentation**

## 10. Dynamic Restriction Updates

### 10.1 Update Authorization

| Update Type | Authorization Required |
|-------------|----------------------|
| Add sanctioned country | TSC approval (quorum vote) |
| Remove sanctioned country | TSC approval + legal review |
| Add brand territory restriction | Brand admin |
| Modify brand territory | Brand admin |
| Add country group | TSC approval |
| Update country group membership | TSC approval for sanctions, auto-update for static |

### 10.2 Update Process

```
Regulatory change detected
         |
         v
+--[Sanctions change?]--+
|        YES            |        NO
v                       v
[TSC emergency     [Brand/product
 session]           territory change]
         |               |
         v               v
[Legal review      [Brand admin
 + impact          approval]
 assessment]            |
         |               |
         v               v
[Quorum vote       [Standard admin
 (6/11 TSC)]        transaction]
         |               |
         +-------+-------+
                 |
                 v
[On-chain transaction submitted]
         |
         v
[addCountry() / removeCountry() /
 addCountryGroup() / removeCountryGroup()]
         |
         v
[Events emitted for audit trail]
         |
         v
[Affected transfers immediately blocked/unblocked]
```

### 10.3 Emergency Updates

For urgent sanctions changes (e.g., new OFAC designation):

1. **Security session convened** (reduced quorum: 6/11 TSC)
2. **Fast-track legal review** (24-hour maximum)
3. **Multi-sig execution** (3/5 TSC officers)
4. **Immediate effect** upon transaction confirmation
5. **Post-hoc documentation** within 72 hours

## 11. Implementation Considerations

### 11.1 Gas Optimization

- Country lists stored as `mapping(uint16 => bool)` for O(1) lookup
- Country groups resolved lazily at check time
- Batch country updates for efficiency
- View functions for off-chain pre-checking

### 11.2 Upgradability

- Country lists are mutable (sanctions change)
- Country groups are mutable (membership changes)
- Core logic follows proxy pattern for bug fixes
- State migration support for major upgrades

### 11.3 Multi-Chain Considerations

- Same country restrictions on all chains
- Cross-chain message verification for unified compliance
- Chain-specific module deployments with synchronized state

## 12. Related Specifications

- `IGalileoIdentityRegistry.sol` - Country code storage and retrieval
- `IComplianceModule.sol` - Base compliance module interface
- `IJurisdictionModule.sol` - Solidity interface for this specification
- `ownership-transfer.md` - Transfer flow integration

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-31 | Galileo Protocol Contributors | Initial specification |
