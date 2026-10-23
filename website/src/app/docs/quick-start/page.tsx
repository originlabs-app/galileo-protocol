import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata("/docs/quick-start", {
  title: "Integration Quick Start | Galileo Documentation",
  description: "Map an example item to Galileo identity, passport, token and resolver specifications. Identify the implementation and evidence needed before integration.",
});

export default function QuickStartPage() {
  return (
    <>
      <h1>Integration quick start</h1>

      <p>
        Use this walkthrough to map an item to Galileo&apos;s published specifications.
        It is a planning example, not a runnable SDK tutorial or a guarantee that
        every illustrated endpoint is deployed. Review the{" "}
        <Link href="/docs/architecture">architecture</Link> first to decide where each record belongs.
      </p>

      <p>
        All product details below are fictional. Choose a test item, document its
        issuer and physical identifier, and compare each example with the linked
        specification before implementing it.
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
        (individual item). Check identifier allocation and resolution behavior against the{" "}
        <Link href="/specifications/identity/DID-METHOD">DID method specification</Link>.
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
  "name": "Example bag",
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
      <p>The token specification proposes ownership records on an EVM blockchain using ERC-3643:</p>
      <ul>
        <li>One token = one physical product (1:1 ratio)</li>
        <li>Transfers require identity verification (KYC/KYB)</li>
        <li>Compliance modules enforce jurisdictional rules</li>
      </ul>

      <h2>4. Lifecycle Events</h2>
      <p>Plan which lifecycle events your integration will record:</p>
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
      <p>The resolver specification describes lookup through a GS1 Digital Link. This example URL illustrates the format:</p>
      <pre>
        <code>
          https://id.galileoprotocol.io/01/00614141123452/21/ABC123DEF456
        </code>
      </pre>
      <p>
        Map each participant to permitted fields using the{" "}
        <Link href="/specifications/resolver/access-control">resolver access-control specification</Link>.
        Test allowed and denied access in your integration before exposing product data.
      </p>

      <h2>Check before integrating</h2>
      <p>
        Validate a sample record against the <Link href="/specifications/schemas/dpp/dpp-core.schema">DPP core schema</Link>,
        review the <Link href="/specifications/token/ownership-transfer">ownership-transfer rules</Link>,
        and record which behavior your test environment actually supports.
        For legal scope, use the <Link href="/docs/compliance/espr">luxury DPP guide</Link> separately.
      </p>
      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/concepts">Core Concepts</Link> — Deeper dive into
          terminology
        </li>
        <li>
          <Link href="/docs/architecture">Architecture</Link> — Technical hybrid model
        </li>
        <li>
          <Link href="/docs/identity/did-method">DID Method</Link> — Full identity
          specification
        </li>
      </ul>
    </>
  );
}
