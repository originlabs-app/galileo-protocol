export const metadata = {
  title: 'Verifiable Credentials | Galileo Documentation',
  description: 'W3C Verifiable Credentials for product and entity claims.',
};

export default function VerifiableCredentialsPage() {
  return (
    <>
      <h1>Verifiable Credentials</h1>

      <p>
        Galileo uses W3C Verifiable Credentials (VCs) for off-chain claims about
        products and entities. VCs provide cryptographically verifiable
        statements without requiring real-time issuer contact.
      </p>

      <h2>Credential Types</h2>

      <h3>Digital Product Passport</h3>
      <pre><code>{`{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/v1"
  ],
  "type": ["VerifiableCredential", "DigitalProductPassport"],
  "issuer": "did:galileo:brand:hermes",
  "validFrom": "2024-01-15T00:00:00Z",
  "credentialSubject": {
    "id": "did:galileo:01:00614141123452:21:ABC123",
    "gtin": "00614141123452",
    "productName": "Birkin 25",
    "materials": [
      {"type": "Leather", "origin": "France", "certified": true}
    ],
    "carbonFootprint": {"value": 12.5, "unit": "kgCO2e"}
  }
}`}</code></pre>

      <h3>Authenticity Certificate</h3>
      <pre><code>{`{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/v1"
  ],
  "type": ["VerifiableCredential", "AuthenticityCredential"],
  "issuer": "did:galileo:brand:hermes",
  "credentialSubject": {
    "id": "did:galileo:01:00614141123452:21:ABC123",
    "authenticityStatus": "VERIFIED",
    "verificationMethod": "MOLECULAR_SIGNATURE",
    "verificationDate": "2024-01-15"
  }
}`}</code></pre>

      <h3>KYC Credential</h3>
      <pre><code>{`{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://vocab.galileoprotocol.io/v1"
  ],
  "type": ["VerifiableCredential", "KYCCredential"],
  "issuer": "did:galileo:issuer:onfido",
  "credentialSubject": {
    "id": "did:galileo:customer:0x1234abcd",
    "verificationLevel": "FULL",
    "jurisdiction": "EU"
  }
}`}</code></pre>

      <h2>Credential Lifecycle</h2>

      <h3>Issuance</h3>
      <p>
        Credentials are issued by authorized issuers (brands, KYC providers).
        The issuer signs the credential with their private key.
      </p>

      <h3>Verification</h3>
      <ol>
        <li>Parse credential JSON-LD</li>
        <li>Resolve issuer DID to get public key</li>
        <li>Verify cryptographic signature</li>
        <li>Check credential status (not revoked)</li>
        <li>Validate against schema</li>
      </ol>

      <h3>Revocation</h3>
      <p>
        Credentials can be revoked using a StatusList2021 registry. Revocation
        is checked during verification.
      </p>

      <h2>Proof Formats</h2>
      <p>
        Galileo supports multiple proof formats for crypto-agility:
      </p>
      <ul>
        <li><strong>JsonWebSignature2020</strong> — Current default (ECDSA)</li>
        <li><strong>DataIntegrityProof</strong> — W3C Data Integrity</li>
        <li><strong>ML-DSA-65</strong> — Post-quantum ready (future)</li>
      </ul>

      <h2>Storage</h2>
      <p>
        Credentials are stored off-chain with on-chain hash anchoring:
      </p>
      <ul>
        <li>Full credential in encrypted off-chain storage</li>
        <li>Content hash registered on-chain for integrity</li>
        <li>Access controlled via resolver permissions</li>
      </ul>
    </>
  );
}
