# Ownership Transfer Specification

**Specification:** GSPEC-TRANSFER-001
**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-31

## 1. Overview

### 1.1 Purpose

This specification defines the complete ownership transfer flows for luxury goods tokens in the Galileo ecosystem. It covers:

- Primary sales (brand to retailer to consumer)
- Secondary market transactions (resale, auction)
- Service and repair transfers (MRO)
- Administrative transfers (recovery, forced)
- Batch operations

### 1.2 Single-Supply Token Pattern

Each `IGalileoToken` deployment represents ONE physical luxury product:

- `totalSupply() = 1` (always)
- `balanceOf(owner) = 1` for current owner
- Transfer of entire balance = ownership change
- One owner at any time (no fractional ownership)

### 1.3 Integration Layers

Ownership transfer integrates three protocol layers:

| Layer | Interface | Role |
|-------|-----------|------|
| Identity | `IGalileoIdentityRegistry` | Verify participant identities and claims |
| Compliance | `IGalileoCompliance` | Enforce transfer rules via modules |
| Token | `IGalileoToken` | Execute transfers and manage state |

## 2. Transfer Validation Sequence

### 2.1 Complete Validation Flow

Every transfer must pass through this validation sequence:

```
transfer(to, amount) called on IGalileoToken
           |
           v
[1. Check token pause status]
    └── token.paused() == true?
    └── REVERT: TokenPaused
           |
           v
[2. Check sender freeze status]
    └── token.isFrozen(from) == true?
    └── REVERT: SenderFrozen(from)
           |
           v
[3. Check receiver freeze status]
    └── token.isFrozen(to) == true?
    └── REVERT: ReceiverFrozen(to)
           |
           v
[4. Check sender partial freeze]
    └── amount > (balanceOf(from) - frozenTokens(from))?
    └── REVERT: InsufficientUnfrozenBalance
           |
           v
[5. Identity Registry verification]
    └── identityRegistry.isVerified(to) == false?
    └── REVERT: ReceiverNotVerified(to)

    Verification checks:
    - Address registered in Identity Registry
    - Identity has required claims
    - Claims from trusted issuers
    - Claims not expired
           |
           v
[6. Compliance check (all modules)]
    └── compliance.canTransfer(from, to, amount) == false?
    └── REVERT: TransferNotCompliant

    Module checks (in order):
    - Jurisdiction restrictions
    - Balance limits
    - Time locks
    - Role requirements
    - Sanctions screening
    - Brand authorization
    - CPO certification
    - Service center authorization
           |
           v
[7. Execute transfer]
    └── Update balances: from -= amount, to += amount
    └── EMIT: Transfer(from, to, amount)
           |
           v
[8. Post-transfer notification]
    └── compliance.transferred(from, to, amount)
    └── Modules update internal state
           |
           v
TRANSFER COMPLETE
```

### 2.2 Compliance Module Evaluation Order

Modules are evaluated in priority order for efficiency (fail-fast):

| Priority | Module Type | Rationale |
|----------|-------------|-----------|
| 1 | Sanctions | Fastest check, highest risk |
| 2 | Jurisdiction | Geographic restrictions |
| 3 | Balance | Quantity limits |
| 4 | Time | Temporal restrictions |
| 5 | Role | Permission checks |
| 6 | Brand | Brand-specific rules |
| 7 | Certification | CPO requirements |
| 8 | Service | Service authorization |

## 3. Primary Sale Flow

### 3.1 Brand to Authorized Retailer

**Scenario:** Brand distribution center transfers newly manufactured product token to authorized retailer.

```
Brand Wallet ──[IGalileoToken.transfer()]──> Retailer Wallet
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Brand is token issuer | `msg.sender == tokenIssuer` |
| Retailer registered | `identityRegistry.isVerified(retailer) == true` |
| Retailer has claim | `batchVerify(retailer, [AUTHORIZED_RETAILER]) == [true]` |
| Retailer country allowed | `jurisdictionModule.isCountryAllowed(retailerCountry)` |
| Token not paused | `token.paused() == false` |

**Compliance Modules Active:**

- `IJurisdictionModule`: Territory distribution rights
- `IBrandAuthorizationModule`: Retailer authorization verification

**Event Emissions:**

```solidity
// Standard ERC-20
emit Transfer(brandWallet, retailerWallet, 1);

// If using extended transfer
emit TransferWithReason(
    brandWallet,
    retailerWallet,
    1,
    keccak256("PRIMARY_SALE"),
    "B2B distribution to authorized retailer"
);
```

**Post-Conditions:**

- Token balance: Brand = 0, Retailer = 1
- CPO status: Not applicable (new product)
- Product state: In retail inventory

### 3.2 Retailer to Consumer (First Sale)

**Scenario:** Authorized retailer sells product to verified consumer.

```
Retailer Wallet ──[IGalileoToken.transfer()]──> Consumer Wallet
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Retailer has token | `balanceOf(retailer) == 1` |
| Retailer is authorized | `batchVerify(retailer, [AUTHORIZED_RETAILER]) == [true]` |
| Consumer registered | `identityRegistry.isVerified(consumer) == true` |
| Consumer has KYC | `batchVerify(consumer, [KYC_BASIC]) == [true]` |
| Consumer country not sanctioned | `jurisdictionModule.isCountryAllowed(consumerCountry)` |
| High-value: Enhanced KYC | If value > threshold: `batchVerify(consumer, [KYC_ENHANCED])` |

**Compliance Modules Active:**

- `IJurisdictionModule`: Consumer country verification
- `IBrandAuthorizationModule`: Retailer validation
- Balance modules (if applicable)

**Event Emissions:**

```solidity
emit Transfer(retailerWallet, consumerWallet, 1);

emit TransferWithReason(
    retailerWallet,
    consumerWallet,
    1,
    keccak256("PRIMARY_SALE"),
    "First retail sale to consumer"
);

// Optional: Lifecycle event
emit FirstSaleRecorded(productDID, consumerWallet, block.timestamp);
```

**Post-Conditions:**

- Token balance: Retailer = 0, Consumer = 1
- Warranty period starts (if applicable)
- Product state: Owned by consumer
- First sale timestamp recorded

## 4. Secondary Sale (Resale) Flow

### 4.1 Consumer to Consumer (Standard Resale)

**Scenario:** Current owner sells to another verified consumer.

```
Seller Wallet ──[IGalileoToken.transfer()]──> Buyer Wallet
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Seller owns token | `balanceOf(seller) == 1` |
| Seller has KYC | `batchVerify(seller, [KYC_BASIC]) == [true]` |
| Buyer registered | `identityRegistry.isVerified(buyer) == true` |
| Buyer has KYC | `batchVerify(buyer, [KYC_BASIC]) == [true]` |
| Buyer country not sanctioned | `jurisdictionModule.isCountryAllowed(buyerCountry)` |

**Compliance Modules Active:**

- `IJurisdictionModule`: Buyer country verification
- `ICPOCertificationModule`: If CPO required for resale

**Event Emissions:**

```solidity
emit Transfer(sellerWallet, buyerWallet, 1);

emit TransferWithReason(
    sellerWallet,
    buyerWallet,
    1,
    keccak256("SECONDARY_SALE"),
    "Peer-to-peer resale"
);
```

**Post-Conditions:**

- Token balance: Seller = 0, Buyer = 1
- CPO status: Maintained if was certified
- Provenance: Updated with new ownership record

### 4.2 Resale with CPO Certification Required

**Scenario:** Brand requires CPO certification before resale is permitted.

```
Compliance check: token.isCPOCertified() == true required
```

**Full CPO Resale Flow:**

```
Step 1: Seller sends to Authenticator (temporary transfer)
Seller Wallet ──[transfer]──> Authenticator Wallet

Step 2: Authenticator inspects and certifies
Authenticator ──[token.certifyCPO(uri)]──> Token Contract

Step 3: Authenticator returns to Seller
Authenticator Wallet ──[transfer]──> Seller Wallet

Step 4: Seller completes sale to Buyer
Seller Wallet ──[transfer]──> Buyer Wallet
```

**CPO Certification Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Authenticator has claim | `batchVerify(authenticator, [AUTHENTICATOR]) == [true]` |
| Authenticator is brand-approved | Brand-specific claim or whitelist |
| Token not already certified | `token.isCPOCertified() == false` |

**CPO Certification Events:**

```solidity
// On certification
emit CPOCertified(
    tokenAddress,
    authenticatorAddress,
    block.timestamp,
    "ipfs://Qm...certification-details"
);

// On transfer after certification
emit CPOTransferred(tokenAddress, sellerWallet, buyerWallet);
```

### 4.3 Auction House Sale

**Scenario:** Consignor sells through auction house to winning bidder.

```
Consignor Wallet ──[transfer]──> Auction House Wallet ──[transfer]──> Winner Wallet
```

**Step 1: Consignment (Consignor to Auction House)**

| Requirement | Verification |
|-------------|--------------|
| Consignor owns token | `balanceOf(consignor) == 1` |
| Consignor has KYC | `batchVerify(consignor, [KYC_BASIC]) == [true]` |
| Auction house registered | `identityRegistry.isVerified(auctionHouse) == true` |
| Auction house has claim | `batchVerify(auctionHouse, [AUCTION_HOUSE]) == [true]` |
| CPO verified | Pre-auction authentication completed |

**Step 2: Settlement (Auction House to Winner)**

| Requirement | Verification |
|-------------|--------------|
| Auction house holds token | `balanceOf(auctionHouse) == 1` |
| Winner registered | `identityRegistry.isVerified(winner) == true` |
| Winner has KYC | High-value auctions: `batchVerify(winner, [KYC_ENHANCED])` |
| Winner country not sanctioned | `jurisdictionModule.isCountryAllowed(winnerCountry)` |

**Event Emissions:**

```solidity
// Consignment transfer
emit TransferWithReason(
    consignorWallet,
    auctionHouseWallet,
    1,
    keccak256("AUCTION_CONSIGNMENT"),
    "Consigned for auction lot #12345"
);

// Settlement transfer
emit TransferWithReason(
    auctionHouseWallet,
    winnerWallet,
    1,
    keccak256("AUCTION_SALE"),
    "Auction settlement lot #12345"
);

// Custom auction event
emit AuctionSaleCompleted(productDID, lotNumber, hammerPrice, winnerWallet);
```

## 5. MRO (Maintenance, Repair, Overhaul) Transfer

### 5.1 Transfer to Service Center

**Scenario:** Owner sends product for service/repair.

```
Owner Wallet ──[IGalileoToken.transfer()]──> Service Center Wallet
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Owner holds token | `balanceOf(owner) == 1` |
| Owner has KYC | `batchVerify(owner, [KYC_BASIC]) == [true]` |
| Service center registered | `identityRegistry.isVerified(serviceCenter) == true` |
| Service center has claim | `batchVerify(serviceCenter, [SERVICE_CENTER]) == [true]` |
| Service center authorized for type | `serviceModule.isAuthorizedForService(serviceCenter, serviceType)` |

**Service Types:**

| Type | Description | Authorization |
|------|-------------|---------------|
| REPAIR | Standard repair work | Basic SERVICE_CENTER claim |
| RESTORATION | Full restoration | Brand + SERVICE_CENTER claims |
| AUTHENTICATION | Authenticity verification | AUTHENTICATOR claim |
| CUSTOMIZATION | Custom modifications | Brand authorization required |
| INSPECTION | Condition assessment | SERVICE_CENTER claim |

**Event Emissions:**

```solidity
emit Transfer(ownerWallet, serviceCenterWallet, 1);

emit TransferWithReason(
    ownerWallet,
    serviceCenterWallet,
    1,
    keccak256("MRO_TRANSFER"),
    "Service request: movement overhaul"
);

emit MROTransferInitiated(
    productDID,
    ownerWallet,
    serviceCenterWallet,
    serviceType,
    estimatedCompletionDate
);
```

**Post-Conditions:**

- Token balance: Owner = 0, Service Center = 1
- Transfer type: Temporary (expectation of return)
- Service record: Created off-chain
- Owner identity: Recorded for return verification

### 5.2 Return from Service Center

**Scenario:** Service complete, returning product to owner.

```
Service Center Wallet ──[IGalileoToken.transfer()]──> Owner Wallet
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Service center holds token | `balanceOf(serviceCenter) == 1` |
| Service center has claim | `batchVerify(serviceCenter, [SERVICE_CENTER]) == [true]` |
| Owner identity unchanged | Same identity as pre-service transfer |
| Service complete | Off-chain service record marked complete |

**Event Emissions:**

```solidity
emit Transfer(serviceCenterWallet, ownerWallet, 1);

emit TransferWithReason(
    serviceCenterWallet,
    ownerWallet,
    1,
    keccak256("MRO_RETURN"),
    "Service completed: movement overhaul"
);

emit MROTransferCompleted(
    productDID,
    serviceCenterWallet,
    ownerWallet,
    serviceRecordHash
);

emit ServiceRecordAttached(productDID, serviceRecordURI);
```

**Post-Conditions:**

- Token balance: Service Center = 0, Owner = 1
- Service record: Linked to product DPP
- Provenance: Service event recorded

## 6. Gift Transfer

**Scenario:** Owner gifts product to family member or friend.

```
Giver Wallet ──[IGalileoToken.transferWithReason()]──> Recipient Wallet
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Giver owns token | `balanceOf(giver) == 1` |
| Giver has KYC | `batchVerify(giver, [KYC_BASIC]) == [true]` |
| Recipient registered | `identityRegistry.isVerified(recipient) == true` |
| Recipient has KYC | `batchVerify(recipient, [KYC_BASIC]) == [true]` |
| Recipient country allowed | `jurisdictionModule.isCountryAllowed(recipientCountry)` |
| No CPO requirement for gifts | Brand policy dependent |

**Event Emissions:**

```solidity
emit Transfer(giverWallet, recipientWallet, 1);

emit TransferWithReason(
    giverWallet,
    recipientWallet,
    1,
    keccak256("GIFT"),
    "Gift transfer to family member"
);
```

**Special Considerations:**

- Some jurisdictions require gift tax documentation
- High-value gifts may require enhanced due diligence
- Brand warranty policies may vary for gifted items

## 7. Recovery Transfer (Lost Wallet)

### 7.1 Recovery Initiation

**Scenario:** Owner loses access to wallet, needs to recover token to new address.

```
Agent calls: token.recoveryAddress(lostWallet, newWallet, ownerIdentity)
```

**Recovery Process:**

```
Step 1: Owner contacts brand/issuer
         |
         v
Step 2: Off-chain identity verification
    - Government ID verification
    - Knowledge-based authentication
    - Proof of original purchase
    - Biometric verification (if available)
         |
         v
Step 3: Agent initiates recovery
    - Agent MUST have AgentRole
    - Production: Multi-sig (2-of-3 minimum)
         |
         v
Step 4: Token transferred from lostWallet to newWallet
         |
         v
Step 5: Identity registry updated (if needed)
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Caller has AgentRole | `token.isAgent(caller) == true` |
| Multi-sig for production | 2-of-3 agent signatures minimum |
| Identity proof verified | Off-chain verification complete |
| Owner identity matches | `identity(lostWallet) == ownerIdentity` |
| New wallet not already used | `balanceOf(newWallet) == 0` |

**Event Emissions:**

```solidity
emit RecoveryInitiated(
    lostWallet,
    newWallet,
    ownerIdentity,
    initiatingAgent,
    block.timestamp
);

emit Transfer(lostWallet, newWallet, 1);

emit RecoverySuccess(
    lostWallet,
    newWallet,
    ownerIdentity,
    recoveryDocumentHash
);
```

**Post-Conditions:**

- Token balance: Lost Wallet = 0, New Wallet = 1
- Identity registry: Updated if new wallet registered
- Provenance chain: Recovery event documented
- Lost wallet: Optionally frozen to prevent future use

## 8. Forced Transfer (Compliance/Legal)

**Scenario:** Regulatory or legal authority requires token transfer.

```
Agent calls: token.forcedTransfer(from, to, amount, legalDocumentHash)
```

**Use Cases:**

| Use Case | Authority | Example |
|----------|-----------|---------|
| Court-ordered seizure | Legal system | Bankruptcy proceeding asset transfer |
| Regulatory action | Financial regulator | AML investigation asset freeze |
| Fraud recovery | Brand/consortium | Recovery of fraudulently obtained product |
| Estate settlement | Probate court | Inheritance distribution |

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Caller has AgentRole | `token.isAgent(caller) == true` |
| Forced transfer permission | Agent has `FORCED_TRANSFER` permission |
| Legal documentation | Document hash in transaction data |
| Compliance module allows | Forced transfer module enabled |

**Event Emissions:**

```solidity
// ERC-3643 standard event
emit ForcedTransfer(
    fromWallet,
    toWallet,
    1,
    initiatingAgent
);

emit TransferWithReason(
    fromWallet,
    toWallet,
    1,
    keccak256("FORCED_LEGAL"),
    "Court order #2026-CV-12345"
);
```

**Post-Conditions:**

- Token transferred regardless of normal compliance checks
- Full audit trail preserved
- Legal documentation linked
- Off-chain notification to affected parties

## 9. Inheritance Transfer

**Scenario:** Owner deceased, token transferred to heir.

```
Executor/Agent initiates transfer on behalf of estate
```

**Inheritance Process:**

```
Step 1: Death certificate verified (off-chain)
         |
         v
Step 2: Probate/estate documents verified
    - Will or intestacy determination
    - Heir identification
    - Executor/administrator appointment
         |
         v
Step 3: Heir identity registered (if not already)
         |
         v
Step 4: Agent initiates transfer
    - Using forcedTransfer or recoveryAddress
    - With legal documentation hash
         |
         v
Step 5: Token transferred to heir
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Caller has AgentRole | `token.isAgent(caller) == true` |
| Estate documents verified | Off-chain legal verification |
| Heir registered | `identityRegistry.isVerified(heir) == true` |
| Heir has KYC | `batchVerify(heir, [KYC_BASIC]) == [true]` |

**Event Emissions:**

```solidity
emit TransferWithReason(
    deceasedWallet,
    heirWallet,
    1,
    keccak256("INHERITANCE"),
    "Estate transfer per probate case #2026-PR-789"
);
```

## 10. Cross-Border Transfer

**Scenario:** Transfer between parties in different countries.

```
Sender (Country A) ──[transfer]──> Receiver (Country B)
```

**Additional Verification:**

| Check | Verification |
|-------|--------------|
| Sender country allowed | `jurisdictionModule.isCountryAllowed(senderCountry)` |
| Receiver country allowed | `jurisdictionModule.isCountryAllowed(receiverCountry)` |
| No cross-border restrictions | Brand may restrict specific corridors |
| Export control compliance | May require off-chain documentation |

**Country Corridor Restrictions:**

Some transfers may be blocked even between non-sanctioned countries:

```json
{
  "blockedCorridors": [
    {
      "from": [840],
      "to": [156],
      "reason": "Export control - technology items"
    }
  ]
}
```

**CITES Considerations:**

For products with exotic materials:

- Off-chain CITES permit verification required
- Permit hash may be included in transfer data
- Additional claims may be required (CITES_COMPLIANT)

## 11. Batch Transfer

**Scenario:** High-volume operations (brand distribution, collection sales).

```solidity
// Single transaction for multiple transfers
token.batchTransfer(
    [retailer1, retailer2, retailer3],
    [1, 1, 1]
);
```

**Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Sender has sufficient balance | `balanceOf(sender) >= sum(amounts)` |
| All receivers verified | Each receiver passes identity check |
| All transfers compliant | Each transfer passes compliance check |
| Atomic execution | All succeed or all fail |

**Batch Compliance Check:**

```solidity
// Pre-check all transfers before execution
(bool[] memory results) = compliance.canTransferBatch(
    senders,
    receivers,
    amounts
);

// All must pass for batch to execute
for (uint i = 0; i < results.length; i++) {
    require(results[i], "Batch transfer compliance failure");
}
```

**Gas Considerations:**

- Maximum batch size limited (implementation-defined, suggest 100)
- More efficient than individual transfers
- Pre-flight checks recommended before submission

## 12. CPO Certification Flow

### 12.1 Certification Process

**Scenario:** Product authenticated and certified for secondary market.

```
Owner sends to Authenticator -> Authenticator certifies -> Returns to Owner
```

**Certification Steps:**

```
Step 1: Owner transfers to Authenticator
Owner Wallet ──[transfer]──> Authenticator Wallet

Step 2: Physical inspection
    - Serial number verification
    - Condition assessment
    - Authenticity checks
    - Documentation review

Step 3: Certification issued
Authenticator ──[token.certifyCPO(uri)]──> Token Contract

Step 4: Return to Owner
Authenticator Wallet ──[transfer]──> Owner Wallet
```

**Certification Preconditions:**

| Requirement | Verification |
|-------------|--------------|
| Authenticator holds token | `balanceOf(authenticator) == 1` |
| Authenticator has claim | `batchVerify(authenticator, [AUTHENTICATOR]) == [true]` |
| Token not already certified | `token.isCPOCertified() == false` |
| Certification URI valid | Points to inspection report |

**Certification Event:**

```solidity
emit CPOCertified(
    tokenAddress,
    authenticatorAddress,
    block.timestamp,
    "ipfs://Qm...certification-report"
);
```

### 12.2 CPO Revocation

**Scenario:** CPO certification revoked due to discovered issues.

**Revocation Triggers:**

| Trigger | Authority |
|---------|-----------|
| Damage discovered | Original certifier |
| Authenticity concerns | Brand agent |
| Certifier fraud | TSC enforcement |
| Customer request | With valid reason |

**Revocation Event:**

```solidity
emit CPORevoked(
    tokenAddress,
    revokerAddress,
    block.timestamp,
    "Undisclosed damage found during subsequent inspection"
);
```

## 13. Transfer Reason Codes

### 13.1 Standard Reason Codes

| Code (keccak256) | Hex | Description |
|------------------|-----|-------------|
| `PRIMARY_SALE` | 0x01 | B2B distribution or first consumer sale |
| `SECONDARY_SALE` | 0x02 | Peer-to-peer resale |
| `AUCTION_SALE` | 0x03 | Auction house settlement |
| `MRO_TRANSFER` | 0x04 | Transfer to service center |
| `MRO_RETURN` | 0x05 | Return from service center |
| `GIFT` | 0x06 | Gift transfer |
| `INHERITANCE` | 0x07 | Estate/inheritance transfer |
| `FORCED_LEGAL` | 0x08 | Court-ordered or regulatory transfer |
| `RECOVERY` | 0x09 | Lost wallet recovery |
| `DECOMMISSION` | 0x0A | Transfer to decommission address |
| `AUCTION_CONSIGNMENT` | 0x0B | Consignment to auction house |
| `LOAN` | 0x0C | Temporary loan (museum, exhibition) |

### 13.2 Reason Code Usage

```solidity
// Using extended transfer
token.transferWithReason(
    recipient,
    1,
    keccak256("SECONDARY_SALE"),
    "Private sale via Vestiaire Collective #ORD-12345"
);
```

## 14. Error Handling

### 14.1 Standard Errors

| Error | Condition | Resolution |
|-------|-----------|------------|
| `TokenPaused` | Token globally paused | Wait for unpause or contact issuer |
| `SenderFrozen` | Sender address frozen | Contact issuer for resolution |
| `ReceiverFrozen` | Receiver address frozen | Receiver must resolve freeze |
| `InsufficientUnfrozenBalance` | Partial freeze blocks amount | Wait for unfreeze |
| `ReceiverNotVerified` | Receiver not in Identity Registry | Receiver must register identity |
| `TransferNotCompliant` | Compliance module rejected | Check specific module failure |
| `CPORequired` | CPO certification missing | Obtain CPO certification first |
| `JurisdictionBlocked` | Receiver country restricted | Cannot transfer to this country |
| `SanctionedAddress` | Party on sanctions list | Transfer prohibited |
| `NotAuthorizedCertifier` | Caller cannot certify CPO | Use authorized certifier |

### 14.2 Error Resolution Flow

```
Transfer fails with error
         |
         v
[Parse error type]
         |
         +-- TokenPaused --> Wait or contact issuer
         +-- AddressFrozen --> Contact issuer
         +-- ReceiverNotVerified --> Register receiver identity
         +-- TransferNotCompliant --> Check compliance.canTransferWithReason()
         +-- JurisdictionBlocked --> Cannot proceed (regulatory)
```

### 14.3 Detailed Failure Information

```solidity
// Get detailed failure reason
(bool allowed, string memory reason, address failingModule) =
    compliance.canTransferWithReason(from, to, amount);

if (!allowed) {
    // reason: "Receiver country 643 is in restricted list"
    // failingModule: address of IJurisdictionModule
}
```

## 15. Related Specifications

- `IGalileoToken.sol` - Token interface with CPO and reason code support
- `IGalileoIdentityRegistry.sol` - Identity verification
- `IGalileoCompliance.sol` - Modular compliance with canTransfer
- `IJurisdictionModule.sol` - Country-based restrictions
- `ICPOCertificationModule.sol` - CPO requirement enforcement
- `IServiceCenterModule.sol` - MRO authorization
- `jurisdiction-rules.md` - Detailed jurisdiction configuration

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-31 | Galileo Protocol Contributors | Initial specification |
