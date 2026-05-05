export const metadata = {
  title: 'DID Method | Galileo Documentation',
  description: 'The did:galileo method specification for product and entity identifiers.',
};

export default function DIDMethodPage() {
  return (
    <>
      <h1>DID Method: did:galileo</h1>

      <p>
        The <code>did:galileo</code> method defines how Decentralized Identifiers are
        created and resolved for luxury products and participants in the Galileo ecosystem.
      </p>

      <h2>Method Syntax</h2>
      <pre><code>{`did:galileo:<type>:<identifier>[:<sub-identifier>]

Examples:
did:galileo:01:00614141123452:21:ABC123     (product)
did:galileo:brand:louisvuitton              (brand)
did:galileo:customer:0x1234abcd             (customer)`}</code></pre>

      <h2>Product DIDs</h2>
      <p>
        Product DIDs encode GS1 identifiers using Application Identifiers:
      </p>
      <ul>
        <li><code>01</code> — GTIN (Global Trade Item Number)</li>
        <li><code>21</code> — Serial Number</li>
        <li><code>10</code> — Batch/Lot Number (optional)</li>
      </ul>

      <h3>GTIN Format</h3>
      <p>
        GTINs must be 14 digits (GTIN-14). Shorter formats are zero-padded:
      </p>
      <pre><code>{`GTIN-8:  12345678     -> 00000012345678
GTIN-12: 012345678901 -> 00012345678901
GTIN-13: 0123456789012 -> 00123456789012
GTIN-14: 01234567890123 (no padding)`}</code></pre>

      <h2>Resolution</h2>
      <p>
        DIDs resolve to DID Documents via the Galileo resolver:
      </p>
      <pre><code>GET https://resolver.galileoprotocol.io/1.0/identifiers/did:galileo:01:00614141123452:21:ABC123</code></pre>

      <h2>DID Document Structure</h2>
      <pre><code>{`{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://vocab.galileoprotocol.io/v1"
  ],
  "id": "did:galileo:01:00614141123452:21:ABC123",
  "controller": "did:galileo:brand:hermes",
  "verificationMethod": [{
    "id": "did:galileo:01:00614141123452:21:ABC123#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:galileo:brand:hermes",
    "publicKeyJwk": { "kty": "EC", "crv": "P-256", ... }
  }],
  "service": [{
    "id": "did:galileo:01:00614141123452:21:ABC123#dpp",
    "type": "DigitalProductPassport",
    "serviceEndpoint": "https://dpp.hermes.com/ABC123"
  }]
}`}</code></pre>

      <h2>Operations</h2>

      <h3>Create</h3>
      <p>
        DIDs are created by authorized issuers (brands with issuer claims).
        Creation triggers on-chain token minting.
      </p>

      <h3>Read (Resolve)</h3>
      <p>
        Anyone can resolve a DID to its document. The resolver returns different
        views based on the requester&apos;s role.
      </p>

      <h3>Update</h3>
      <p>
        Only the DID controller can update the document. Updates require
        signature verification.
      </p>

      <h3>Deactivate</h3>
      <p>
        Deactivation is permanent. Used when products are destroyed or reach
        end-of-life. Token is burned.
      </p>

      <h2>Security Considerations</h2>
      <ul>
        <li>DIDs are deterministic from GS1 identifiers — no collision risk</li>
        <li>Controller change requires multi-sig approval</li>
        <li>Key rotation supported via versioned verification methods</li>
        <li>Post-quantum ready via crypto-agile signature suite</li>
      </ul>
    </>
  );
}
