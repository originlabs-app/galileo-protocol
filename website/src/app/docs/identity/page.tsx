export const metadata = {
  title: 'Identity | Galileo Documentation',
  description: 'Learn about the Galileo identity system based on W3C DIDs.',
};

export default function IdentityPage() {
  return (
    <>
      <h1>Identity System</h1>

      <p>
        Galileo&apos;s identity layer enables decentralized, verifiable identification
        of both products and participants. It&apos;s built on W3C standards and
        integrates with ERC-3643 for compliant token transfers.
      </p>

      <h2>Components</h2>

      <h3>Product Identity</h3>
      <p>
        Every product has a DID that follows the <code>did:galileo</code> method:
      </p>
      <pre><code>did:galileo:01:00614141123452:21:SERIAL123</code></pre>
      <p>
        This DID resolves to a DID Document containing product metadata endpoints
        and verification keys.
      </p>

      <h3>Participant Identity</h3>
      <p>
        Brands, consumers, and service providers have ONCHAINID identities:
      </p>
      <ul>
        <li>Brands hold issuer claims (can create product DIDs)</li>
        <li>Consumers hold KYC claims (can receive tokens)</li>
        <li>Regulators hold access claims (can query compliance data)</li>
      </ul>

      <h3>Verifiable Credentials</h3>
      <p>
        Claims about products and participants are issued as W3C Verifiable Credentials.
        These are cryptographically signed statements that can be verified without
        contacting the issuer.
      </p>

      <h2>Identity Flow</h2>
      <ol>
        <li><strong>Brand Registration</strong> — Brand deploys ONCHAINID, receives issuer claim</li>
        <li><strong>Product Creation</strong> — Brand creates product DID and DPP</li>
        <li><strong>Customer Onboarding</strong> — Customer creates ONCHAINID, receives KYC claim</li>
        <li><strong>Transfer</strong> — Token transfer verified against identity claims</li>
      </ol>

      <h2>Specification Documents</h2>
      <ul>
        <li><a href="/docs/identity/did-method">DID Method Specification</a></li>
        <li><a href="/docs/identity/onchainid">ONCHAINID Integration</a></li>
        <li><a href="/docs/identity/verifiable-credentials">Verifiable Credentials</a></li>
      </ul>
    </>
  );
}
