export const metadata = {
  title: "ESPR Guide | Galileo Documentation",
  description: "Digital Product Passport readiness for ESPR 2027.",
};

export default function ESPRGuidePage() {
  return (
    <>
      <h1>ESPR Readiness Guide</h1>

      <p>
        The Ecodesign for Sustainable Products Regulation (ESPR) mandates
        Digital Product Passports for certain product categories starting 2027.
        Galileo&apos;s DPP schema is designed for full ESPR compliance.
      </p>

      <h2>ESPR Requirements</h2>
      <p>Digital Product Passports must include:</p>
      <ul>
        <li>Product identification (GTIN, serial number)</li>
        <li>Manufacturer information</li>
        <li>Material composition</li>
        <li>Carbon footprint data</li>
        <li>Repair and recycling information</li>
        <li>Compliance declarations</li>
      </ul>

      <h2>Galileo DPP Schema</h2>
      <pre>
        <code>{`{
  "@context": "https://vocab.galileoprotocol.io/contexts/galileo.jsonld",
  "@type": "DigitalProductPassport",

  // Identification
  "gtin": "00614141123452",
  "serialNumber": "ABC123",
  "batchNumber": "LOT456",

  // Manufacturer
  "manufacturer": {
    "name": "Atelier Prestige",
    "did": "did:galileo:brand:atelier-prestige",
    "address": "Paris, France"
  },

  // Materials
  "materials": [{
    "type": "Leather",
    "percentage": 85,
    "origin": "France",
    "certified": true,
    "certificationBody": "Leather Working Group"
  }],

  // Sustainability
  "carbonFootprint": {
    "value": 12.5,
    "unit": "kgCO2e",
    "scope": ["Scope1", "Scope2", "Scope3"]
  },

  // Repair
  "repairInformation": {
    "repairability": 8.5,
    "spareParts": true,
    "repairManualUrl": "https://..."
  },

  // Compliance
  "complianceDeclarations": [{
    "regulation": "ESPR",
    "status": "COMPLIANT",
    "declarationDate": "2024-01-15"
  }]
}`}</code>
      </pre>

      <h2>Data Carrier Requirements</h2>
      <p>ESPR requires a data carrier linking physical product to DPP:</p>
      <ul>
        <li>
          <strong>QR Code</strong> — GS1 Digital Link URL
        </li>
        <li>
          <strong>NFC Tag</strong> — Optional for luxury items
        </li>
        <li>
          <strong>RFID</strong> — For supply chain tracking
        </li>
      </ul>

      <h2>Implementation Checklist</h2>
      <ul>
        <li>All mandatory fields populated</li>
        <li>Data carrier linked to product</li>
        <li>Public access endpoint configured</li>
        <li>Update mechanism for lifecycle changes</li>
        <li>Audit trail for modifications</li>
      </ul>

      <h2>Timeline</h2>
      <ul>
        <li>
          <strong>2024</strong> — ESPR adopted
        </li>
        <li>
          <strong>2025</strong> — Delegated acts define product categories
        </li>
        <li>
          <strong>2027</strong> — First DPP requirements in force
        </li>
        <li>
          <strong>2030</strong> — Full rollout across categories
        </li>
      </ul>
    </>
  );
}
