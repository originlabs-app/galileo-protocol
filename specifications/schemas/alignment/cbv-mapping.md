# CBV 2.0 Vocabulary Mapping for Galileo Luxury Protocol

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-01-30
**EPCIS Version:** 2.0.0
**CBV Version:** 2.0.0

## Overview

This document provides the authoritative mapping between Galileo luxury product lifecycle stages and GS1 Core Business Vocabulary (CBV) 2.0 values. All Galileo EPCIS events MUST use CBV 2.0 vocabulary for bizStep and disposition values to ensure interoperability with global supply chain systems.

**References:**
- [GS1 CBV 2.0 Specification](https://ref.gs1.org/cbv/)
- [EPCIS 2.0 Standard](https://ref.gs1.org/standards/epcis/)
- Galileo Event Base Schema: `event-base.schema.json`

---

## bizStep Mapping for Luxury Lifecycle

The bizStep indicates the business process step during which an EPCIS event occurred.

### Primary Lifecycle Stages

| Galileo Stage | EPCIS Event Type | CBV bizStep | CBV URI | Notes |
|---------------|------------------|-------------|---------|-------|
| Creation | ObjectEvent | commissioning | `cbv:BizStep-commissioning` | Product manufacturing complete, unique instance created |
| Commission | ObjectEvent | commissioning | `cbv:BizStep-commissioning` | Unique ID assigned, NFC/QR chip linked to DID |
| Quality Inspection | ObjectEvent | inspecting | `cbv:BizStep-inspecting` | Final QC before release from atelier |
| First Sale | TransactionEvent | retail_selling | `cbv:BizStep-retail_selling` | Initial B2C ownership transfer at boutique |
| Repair/MRO | TransformationEvent | repairing | `cbv:BizStep-repairing` | Service, reconditioning, component replacement |
| Resale | TransactionEvent | retail_selling | `cbv:BizStep-retail_selling` | Secondary market transfer (CPO, auction, peer) |
| Decommission | ObjectEvent | decommissioning | `cbv:BizStep-decommissioning` | End of life, recycling, destruction |

### Logistics and Movement Stages

| Galileo Stage | EPCIS Event Type | CBV bizStep | CBV URI | Notes |
|---------------|------------------|-------------|---------|-------|
| Ship to Boutique | ObjectEvent | shipping | `cbv:BizStep-shipping` | Departure from warehouse/atelier |
| Receive at Boutique | ObjectEvent | receiving | `cbv:BizStep-receiving` | Arrival and scan at destination |
| Warehouse Storage | ObjectEvent | storing | `cbv:BizStep-storing` | Entering warehouse/vault storage |
| Consignment Out | TransactionEvent | shipping | `cbv:BizStep-shipping` | Product sent to consignment partner |
| Consignment Return | TransactionEvent | receiving | `cbv:BizStep-receiving` | Product returned from consignment |
| Transit Inspection | ObjectEvent | inspecting | `cbv:BizStep-inspecting` | Customs or security checkpoint scan |

### Authentication and Verification Stages

| Galileo Stage | EPCIS Event Type | CBV bizStep | CBV URI | Notes |
|---------------|------------------|-------------|---------|-------|
| Authentication Check | ObjectEvent | inspecting | `cbv:BizStep-inspecting` | Third-party authenticity verification |
| CPO Certification | ObjectEvent | inspecting | `cbv:BizStep-inspecting` | Certified Pre-Owned assessment |
| Condition Grading | ObjectEvent | inspecting | `cbv:BizStep-inspecting` | Secondary market condition evaluation |
| Provenance Audit | ObjectEvent | inspecting | `cbv:BizStep-inspecting` | Full chain-of-custody review |

---

## disposition Mapping for Product States

The disposition indicates the business state of an object at the conclusion of an EPCIS event.

### Standard CBV Dispositions

| Galileo State | CBV disposition | CBV URI | When Used |
|---------------|-----------------|---------|-----------|
| Active | active | `cbv:Disp-active` | Product in active circulation, owned |
| Sold | retail_sold | `cbv:Disp-retail_sold` | After B2C ownership transfer complete |
| In Transit | in_transit | `cbv:Disp-in_transit` | During shipping between locations |
| In Progress | in_progress | `cbv:Disp-in_progress` | During repair/service/inspection |
| Destroyed | destroyed | `cbv:Disp-destroyed` | Physical destruction confirmed |
| Recalled | recalled | `cbv:Disp-recalled` | Brand recall action initiated |
| Stolen | stolen | `cbv:Disp-stolen` | Theft reported, flagged in system |
| Damaged | damaged | `cbv:Disp-damaged` | Significant damage, may need repair |
| Expired | expired | `cbv:Disp-expired` | Warranty/service period ended |
| Non-sellable Return | non_sellable_other | `cbv:Disp-non_sellable_other` | Return cannot be resold as-is |

### Custom Galileo Extensions

Where CBV 2.0 lacks appropriate vocabulary for luxury-specific states, Galileo defines custom dispositions. These MUST be used within the Galileo namespace.

| Galileo State | Custom disposition | Galileo URI | Definition |
|---------------|-------------------|-------------|------------|
| CPO Certified | cpo_certified | `galileo:Disp-cpo_certified` | Passed Certified Pre-Owned inspection by authorized party |
| Vault Storage | vault_storage | `galileo:Disp-vault_storage` | High-security storage for high-value items |
| Authentication Pending | authentication_pending | `galileo:Disp-authentication_pending` | Awaiting third-party verification |
| Consignment | consignment | `galileo:Disp-consignment` | Held by third party for potential sale |
| Service Hold | service_hold | `galileo:Disp-service_hold` | At service center, awaiting parts/approval |
| Estate Hold | estate_hold | `galileo:Disp-estate_hold` | Part of estate, ownership transfer pending |
| Museum Loan | museum_loan | `galileo:Disp-museum_loan` | On loan to cultural institution |
| Investment Grade | investment_grade | `galileo:Disp-investment_grade` | Assessed for investment/collectible value |

### Disposition State Transitions

```
                                    [inspecting]
                                         |
                                         v
[commissioning] --> active --> retail_sold --> active
                      |              |            |
                      v              v            v
                 in_transit    consignment    in_progress
                      |              |            |
                      v              v            v
                   active        active    cpo_certified
                      |                          |
                      v                          v
                 vault_storage              retail_sold
                      |
                      |-- destroyed
                      |-- recalled
                      |-- stolen
                      v
               decommissioning
```

---

## Source/Destination Types

For TransactionEvent, the sourceList and destinationList use CBV Source/Destination Types.

### Ownership Transfers (Sale, Resale, Gift)

| Transfer Type | Source Type | Destination Type |
|---------------|-------------|------------------|
| B2C Sale | `cbv:SDT-owning_party` | `cbv:SDT-owning_party` |
| Peer-to-Peer Resale | `cbv:SDT-owning_party` | `cbv:SDT-owning_party` |
| CPO Platform Sale | `cbv:SDT-owning_party` | `cbv:SDT-owning_party` |
| Auction Transfer | `cbv:SDT-owning_party` | `cbv:SDT-owning_party` |
| Estate Transfer | `cbv:SDT-owning_party` | `cbv:SDT-owning_party` |
| Gift Transfer | `cbv:SDT-owning_party` | `cbv:SDT-owning_party` |

### Custody Transfers (Service, Consignment, Storage)

| Transfer Type | Source Type | Destination Type |
|---------------|-------------|------------------|
| Send for Repair | `cbv:SDT-possessing_party` | `cbv:SDT-possessing_party` |
| Return from Repair | `cbv:SDT-possessing_party` | `cbv:SDT-possessing_party` |
| Consignment Out | `cbv:SDT-possessing_party` | `cbv:SDT-possessing_party` |
| Consignment Return | `cbv:SDT-possessing_party` | `cbv:SDT-possessing_party` |
| Vault Deposit | `cbv:SDT-possessing_party` | `cbv:SDT-location` |
| Vault Withdrawal | `cbv:SDT-location` | `cbv:SDT-possessing_party` |
| Museum Loan | `cbv:SDT-possessing_party` | `cbv:SDT-location` |

### Location Transfers (Logistics)

| Transfer Type | Source Type | Destination Type |
|---------------|-------------|------------------|
| Warehouse to Boutique | `cbv:SDT-location` | `cbv:SDT-location` |
| Boutique to Boutique | `cbv:SDT-location` | `cbv:SDT-location` |
| Cross-border Shipment | `cbv:SDT-location` | `cbv:SDT-location` |

---

## Business Transaction Types

For TransactionEvent.bizTransactionList, use CBV Business Transaction Types.

| Transaction Type | CBV Type | CBV URI | Luxury Usage |
|------------------|----------|---------|--------------|
| Purchase Order | po | `cbv:BTT-po` | B2B orders (brand to retailer) |
| Invoice | inv | `cbv:BTT-inv` | Sales documentation |
| Dispatch Advice | desadv | `cbv:BTT-desadv` | Shipment notification |
| Return Authorization | rma | `cbv:BTT-rma` | Return/exchange authorization |
| Production Order | prodorder | `cbv:BTT-prodorder` | Manufacturing work order |
| Bill of Lading | bol | `cbv:BTT-bol` | Shipping documentation |
| Pedigree | pedigree | `cbv:BTT-pedigree` | Chain of custody documentation |

### Custom Galileo Transaction Types

| Transaction Type | Galileo Type | Galileo URI | Definition |
|------------------|--------------|-------------|------------|
| Authentication Certificate | auth_cert | `galileo:BTT-auth_cert` | Third-party authentication document |
| CPO Certificate | cpo_cert | `galileo:BTT-cpo_cert` | Certified Pre-Owned certificate |
| Service Record | service_record | `galileo:BTT-service_record` | Repair/service documentation |
| Provenance Report | provenance_report | `galileo:BTT-provenance_report` | Full provenance audit report |
| Condition Report | condition_report | `galileo:BTT-condition_report` | Secondary market condition assessment |
| Transfer Agreement | transfer_agreement | `galileo:BTT-transfer_agreement` | Ownership transfer legal document |

---

## Error Reason Codes

For errorDeclaration.reason, use CBV Error Reason codes.

| Error Type | CBV Reason | CBV URI | When Used |
|------------|------------|---------|-----------|
| Incorrect Data | incorrect_data | `cbv:ER-incorrect_data` | Event contained wrong information |
| Did Not Occur | did_not_occur | `cbv:ER-did_not_occur` | Event was recorded but never happened |

### Galileo Extended Error Reasons

| Error Type | Galileo Reason | Galileo URI | Definition |
|------------|----------------|-------------|------------|
| Authentication Failed | auth_failed | `galileo:ER-auth_failed` | Product later determined to be counterfeit |
| Ownership Dispute | ownership_dispute | `galileo:ER-ownership_dispute` | Legal dispute over ownership transfer |
| Service Fraud | service_fraud | `galileo:ER-service_fraud` | Unauthorized service recorded |

---

## Integration with Galileo Event Schemas

### Event Schema References

| Galileo Schema | Primary bizStep | Primary disposition |
|----------------|-----------------|---------------------|
| `creation.schema.json` | `cbv:BizStep-commissioning` | `cbv:Disp-active` |
| `commission.schema.json` | `cbv:BizStep-commissioning` | `cbv:Disp-active` |
| `sale.schema.json` | `cbv:BizStep-retail_selling` | `cbv:Disp-retail_sold` |
| `resale.schema.json` | `cbv:BizStep-retail_selling` | `cbv:Disp-retail_sold` / `galileo:Disp-cpo_certified` |
| `repair.schema.json` | `cbv:BizStep-repairing` | `cbv:Disp-in_progress` -> `cbv:Disp-active` |
| `decommission.schema.json` | `cbv:BizStep-decommissioning` | `cbv:Disp-destroyed` / `cbv:Disp-recalled` / etc. |

### Example: Commission Event with CBV Mapping

```json
{
  "@context": [
    "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
    "https://vocab.galileoprotocol.io/context/galileo.jsonld"
  ],
  "type": "ObjectEvent",
  "eventID": "ni:///sha-256;a1b2c3d4e5f6...",
  "eventTime": "2024-03-15T10:30:00.000Z",
  "eventTimeZoneOffset": "+01:00",
  "action": "ADD",
  "bizStep": "cbv:BizStep-commissioning",
  "disposition": "cbv:Disp-active",
  "readPoint": {
    "id": "urn:epc:id:sgln:0614141.12345.0"
  },
  "epcList": [
    "https://id.gs1.org/01/09506000134352/21/HK2024A001"
  ],
  "galileo:productDID": "did:galileo:01:09506000134352:21:HK2024A001"
}
```

### Example: Resale Event with CPO Certification

```json
{
  "@context": [
    "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
    "https://vocab.galileoprotocol.io/context/galileo.jsonld"
  ],
  "type": "TransactionEvent",
  "eventID": "ni:///sha-256;b2c3d4e5f6a7...",
  "eventTime": "2025-06-20T14:00:00.000Z",
  "eventTimeZoneOffset": "-05:00",
  "action": "ADD",
  "bizStep": "cbv:BizStep-retail_selling",
  "disposition": "galileo:Disp-cpo_certified",
  "readPoint": {
    "id": "urn:epc:id:sgln:0614141.67890.0"
  },
  "epcList": [
    "https://id.gs1.org/01/09506000134352/21/HK2024A001"
  ],
  "bizTransactionList": [
    {
      "type": "cbv:BTT-inv",
      "bizTransaction": "urn:galileo:invoice:CPO-2025-12345"
    },
    {
      "type": "galileo:BTT-cpo_cert",
      "bizTransaction": "urn:galileo:cert:CPO-AUTH-2025-67890"
    }
  ],
  "sourceList": [
    {
      "type": "cbv:SDT-owning_party",
      "source": "did:galileo:customer:anon-abc123"
    }
  ],
  "destinationList": [
    {
      "type": "cbv:SDT-owning_party",
      "destination": "did:galileo:customer:anon-def456"
    }
  ]
}
```

---

## Vocabulary Registration

### GS1 Namespace (Standard)

All standard CBV terms are registered under the GS1 namespace:
- **Base URI:** `https://ref.gs1.org/cbv/`
- **JSON-LD Context:** `https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld`

### Galileo Namespace (Extensions)

Custom Galileo vocabulary extensions are registered under:
- **Base URI:** `https://vocab.galileoprotocol.io/`
- **JSON-LD Context:** `https://vocab.galileoprotocol.io/context/galileo.jsonld`

### Extension Policy

1. **Prefer CBV:** Always use standard CBV terms where available
2. **Document Extensions:** All Galileo extensions must be documented in this mapping
3. **Namespace Prefix:** Galileo extensions use `galileo:` prefix
4. **Submission:** Novel extensions may be proposed to GS1 for CBV inclusion

---

## Compliance Requirements

### Mandatory Elements

All Galileo EPCIS events MUST include:
- `bizStep` with valid CBV or Galileo value
- `disposition` with valid CBV or Galileo value
- Proper `@context` array including EPCIS and Galileo contexts

### Validation Rules

1. **bizStep format:** Must match pattern `^cbv:BizStep-.+$` or `^galileo:BizStep-.+$`
2. **disposition format:** Must match pattern `^cbv:Disp-.+$` or `^galileo:Disp-.+$`
3. **Transaction types:** Must use valid CBV or Galileo BTT values
4. **Source/Destination types:** Must use valid CBV SDT values

### Interoperability Testing

Systems implementing Galileo MUST pass:
- GS1 EPCIS 2.0 conformance tests
- Galileo extension vocabulary validation
- Cross-system event exchange verification

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial CBV 2.0 mapping for luxury lifecycle |

---

*This document is part of the Galileo Luxury Protocol specification.*
*Requirement coverage: EVENT-07*
