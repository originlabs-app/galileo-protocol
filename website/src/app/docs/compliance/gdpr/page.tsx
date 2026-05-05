export const metadata = {
  title: 'GDPR Guide | Galileo Documentation',
  description: 'Implementing GDPR compliance with Galileo.',
};

export default function GDPRGuidePage() {
  return (
    <>
      <h1>GDPR Compliance Guide</h1>

      <p>
        This guide explains how Galileo enables GDPR-compliant implementations
        while maintaining blockchain immutability benefits.
      </p>

      <h2>The Challenge</h2>
      <p>
        GDPR Article 17 grants data subjects the &quot;right to erasure&quot; (right to be forgotten).
        This conflicts with blockchain&apos;s immutability. Galileo solves this through
        architectural separation.
      </p>

      <h2>CRAB Model</h2>
      <p>
        Galileo&apos;s CRAB (Claim-Raw-Access-Blinded) model provides GDPR compliance:
      </p>

      <h3>C — Claim Hash On-Chain</h3>
      <p>
        Only cryptographic hashes are stored on-chain, not personal data:
      </p>
      <pre><code>{`// On-chain: just a hash
bytes32 dppHash = keccak256(abi.encode(dppContent));
token.setDPPHash(dppHash);`}</code></pre>

      <h3>R — Raw Data Off-Chain</h3>
      <p>
        Actual personal data lives in off-chain storage that can be deleted:
      </p>
      <pre><code>{`// Off-chain DPP with personal data
{
  "ownerName": "Jean Dupont",  // Deletable
  "email": "jean@example.com"   // Deletable
}`}</code></pre>

      <h3>A — Access Controlled</h3>
      <p>
        Role-based access control limits who can see personal data:
      </p>
      <ul>
        <li>Owner: Full access to own data</li>
        <li>Brand: Product data, anonymized owner</li>
        <li>Public: Product attributes only</li>
      </ul>

      <h3>B — Blinded Deletion</h3>
      <p>
        When data is deleted, the hash remains valid but data is gone:
      </p>
      <pre><code>{`// After deletion
{
  "ownerName": "[REDACTED]",
  "email": "[REDACTED]",
  "_deletedAt": "2024-01-15T00:00:00Z",
  "_deletionReason": "GDPR_REQUEST"
}`}</code></pre>

      <h2>Implementation Checklist</h2>
      <ul>
        <li>Personal data stored off-chain only</li>
        <li>On-chain contains hashes, not raw data</li>
        <li>Deletion API implemented</li>
        <li>Access control enforced</li>
        <li>Audit trail maintained</li>
        <li>Data retention policy defined</li>
      </ul>

      <h2>Data Subject Rights</h2>
      <table>
        <thead>
          <tr><th>Right</th><th>Implementation</th></tr>
        </thead>
        <tbody>
          <tr><td>Access</td><td>API endpoint for data export</td></tr>
          <tr><td>Rectification</td><td>Update off-chain data, new hash on-chain</td></tr>
          <tr><td>Erasure</td><td>Delete off-chain, hash remains</td></tr>
          <tr><td>Portability</td><td>JSON-LD export</td></tr>
        </tbody>
      </table>
    </>
  );
}
