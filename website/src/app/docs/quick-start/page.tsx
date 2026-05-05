export const metadata = {
  title: "Quick Start | Galileo Documentation",
  description: "Get started with Galileo in 5 minutes.",
};

export default function QuickStartPage() {
  return (
    <>
      <h1>Quick Start</h1>

      <p>
        This guide walks you through the key concepts of Galileo in 5 minutes.
        By the end, you&apos;ll understand how products are identified, tracked,
        and transferred using the standard.
      </p>

      <h2>1. Product Identity</h2>
      <p>
        Every luxury product in Galileo has a unique Decentralized Identifier
        (DID):
      </p>
      <pre>
        <code>did:galileo:01:00614141123452:21:ABC123DEF456</code>
      </pre>
      <p>
        This DID encodes the GS1 GTIN (product type) and serial number
        (individual item). It&apos;s globally unique, resolvable, and not
        controlled by any single party.
      </p>

      <h2>2. Digital Product Passport</h2>
      <p>
        Each product has an associated DPP containing its attributes,
        provenance, and compliance data:
      </p>
      <pre>
        <code>{`{
  "@context": "https://vocab.galileoprotocol.io/contexts/galileo.jsonld",
  "@type": "IndividualProduct",
  "@id": "did:galileo:01:00614141123452:21:ABC123",
  "gtin": "00614141123452",
  "serialNumber": "ABC123",
  "name": "Capucines MM",
  "brand": {
    "@type": "Brand",
    "name": "Maison Heritage",
    "@id": "did:galileo:brand:maison-heritage"
  },
  "materials": [
    { "type": "Leather", "origin": "France", "certified": true }
  ],
  "carbonFootprint": {
    "value": 12.5,
    "unitCode": "KGM"
  }
}`}</code>
      </pre>

      <h2>3. On-Chain Ownership</h2>
      <p>Ownership is recorded on an EVM blockchain using ERC-3643 tokens:</p>
      <ul>
        <li>One token = one physical product (1:1 ratio)</li>
        <li>Transfers require identity verification (KYC/KYB)</li>
        <li>Compliance modules enforce jurisdictional rules</li>
      </ul>

      <h2>4. Lifecycle Events</h2>
      <p>Every significant event in a product&apos;s life is recorded:</p>
      <ul>
        <li>
          <strong>Creation</strong> — Product manufactured
        </li>
        <li>
          <strong>Commission</strong> — Serial number assigned
        </li>
        <li>
          <strong>First Sale</strong> — Initial retail purchase
        </li>
        <li>
          <strong>Repair/MRO</strong> — Maintenance events
        </li>
        <li>
          <strong>Resale</strong> — Secondary market transfers
        </li>
        <li>
          <strong>Decommission</strong> — Product retired
        </li>
      </ul>

      <h2>5. Resolution</h2>
      <p>Anyone can look up a product using its GS1 Digital Link:</p>
      <pre>
        <code>
          https://id.galileoprotocol.io/01/00614141123452/21/ABC123DEF456
        </code>
      </pre>
      <p>
        The resolver returns different views based on who&apos;s asking:
        consumers see authenticity info, brands see full history, regulators see
        compliance data.
      </p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <a href="/docs/concepts">Core Concepts</a> — Deeper dive into
          terminology
        </li>
        <li>
          <a href="/docs/architecture">Architecture</a> — Technical hybrid model
        </li>
        <li>
          <a href="/docs/identity/did-method">DID Method</a> — Full identity
          specification
        </li>
      </ul>
    </>
  );
}
