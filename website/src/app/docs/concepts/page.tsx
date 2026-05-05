export const metadata = {
  title: 'Core Concepts | Galileo Documentation',
  description: 'Understand the key terminology and concepts in Galileo.',
};

export default function ConceptsPage() {
  return (
    <>
      <h1>Core Concepts</h1>

      <p>
        This page defines the key terminology used throughout the Galileo standard.
        Understanding these concepts is essential for implementing the specification.
      </p>

      <h2>Identity Concepts</h2>

      <h3>DID (Decentralized Identifier)</h3>
      <p>
        A globally unique identifier that doesn&apos;t require a central registry.
        Galileo uses the <code>did:galileo</code> method based on W3C DID Core.
      </p>

      <h3>DID Document</h3>
      <p>
        A JSON-LD document describing the subject of a DID, including public keys,
        service endpoints, and verification methods.
      </p>

      <h3>ONCHAINID</h3>
      <p>
        An on-chain identity contract (ERC-734/735) that stores claims about a
        participant. Used for KYC/KYB verification in token transfers.
      </p>

      <h3>Verifiable Credential</h3>
      <p>
        A tamper-evident claim about a subject, signed by an issuer. Galileo uses
        VCs for product attributes, certifications, and compliance attestations.
      </p>

      <h2>Token Concepts</h2>

      <h3>ERC-3643</h3>
      <p>
        The token standard Galileo extends. ERC-3643 is a permissioned token standard
        that integrates identity verification into transfer logic.
      </p>

      <h3>Single-Supply Pattern</h3>
      <p>
        Galileo&apos;s approach where each physical product is represented by exactly one
        token deployment with a supply of 1. This ensures 1:1 correspondence.
      </p>

      <h3>Compliance Module</h3>
      <p>
        A pluggable contract that enforces specific rules during transfers.
        Examples: country restrictions, holding periods, transfer limits.
      </p>

      <h2>Data Concepts</h2>

      <h3>Digital Product Passport (DPP)</h3>
      <p>
        A comprehensive data record containing a product&apos;s attributes, provenance,
        sustainability data, and compliance declarations. Required by ESPR 2027.
      </p>

      <h3>GTIN (Global Trade Item Number)</h3>
      <p>
        A 14-digit GS1 identifier for product types. Combined with a serial number,
        it uniquely identifies individual items.
      </p>

      <h3>EPCIS Event</h3>
      <p>
        A standardized record of &quot;what, where, when, why&quot; for supply chain events.
        Galileo uses EPCIS 2.0 for lifecycle tracking.
      </p>

      <h2>Infrastructure Concepts</h2>

      <h3>GS1 Digital Link</h3>
      <p>
        A URI syntax that encodes product identifiers in web-friendly URLs.
        Enables QR codes to resolve to Galileo data.
      </p>

      <h3>Context-Aware Resolution</h3>
      <p>
        The resolver returns different data views based on the requester&apos;s role
        and permissions. Consumers see public data; brands see full history.
      </p>

      <h3>CRAB Model</h3>
      <p>
        <strong>C</strong>laim hash on-chain, <strong>R</strong>aw data off-chain,
        <strong>A</strong>ccess controlled, <strong>B</strong>linded deletion.
        Galileo&apos;s approach to GDPR compliance.
      </p>

      <h2>Regulatory Terms</h2>

      <h3>ESPR</h3>
      <p>
        Ecodesign for Sustainable Products Regulation. EU law mandating Digital
        Product Passports for certain product categories starting 2027.
      </p>

      <h3>MiCA</h3>
      <p>
        Markets in Crypto-Assets Regulation. EU framework for crypto assets
        effective June 2026, affecting tokenized products.
      </p>

      <h3>GDPR</h3>
      <p>
        General Data Protection Regulation. Requires personal data minimization
        and right to erasure, addressed by Galileo&apos;s CRAB model.
      </p>
    </>
  );
}
