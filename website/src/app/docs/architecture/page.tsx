export const metadata = {
  title: 'Architecture | Galileo Documentation',
  description: 'Understand the hybrid on-chain/off-chain architecture of Galileo.',
};

export default function ArchitecturePage() {
  return (
    <>
      <h1>Hybrid Architecture</h1>

      <p>
        Galileo uses a hybrid on-chain/off-chain architecture that balances transparency
        with privacy. This design enables GDPR compliance while maintaining immutable
        ownership records.
      </p>

      <h2>Three-Layer Model</h2>

      <pre className="text-sm"><code>{`
+---------------------------------------------------------+
|                    OFF-CHAIN LAYER                       |
|  +--------------+  +--------------+  +--------------+  |
|  | DPP Storage  |  | EPCIS Events |  |  Personal    |  |
|  | (JSON-LD)    |  |  (History)   |  |    Data      |  |
|  +--------------+  +--------------+  +--------------+  |
|                         ^                               |
|                         | CRAB Model                    |
|                         | (hash anchoring)              |
+---------------------------------------------------------+
|                    RESOLVER LAYER                        |
|  +--------------------------------------------------+   |
|  |              GS1 Digital Link Resolver           |   |
|  |         (Context-Aware Role-Based Access)        |   |
|  +--------------------------------------------------+   |
|                         |                               |
+---------------------------------------------------------+
|                    ON-CHAIN LAYER                        |
|  +--------------+  +--------------+  +--------------+  |
|  |  ERC-3643    |  |  ONCHAINID   |  |  Compliance  |  |
|  |   Tokens     |  |  Registry    |  |   Modules    |  |
|  +--------------+  +--------------+  +--------------+  |
+---------------------------------------------------------+
`}</code></pre>

      <h2>On-Chain Layer</h2>
      <p>
        The on-chain layer stores ownership proofs and compliance state on an EVM blockchain:
      </p>
      <ul>
        <li><strong>ERC-3643 Tokens</strong> — Ownership records with built-in compliance</li>
        <li><strong>ONCHAINID Registry</strong> — Identity verification claims</li>
        <li><strong>Compliance Modules</strong> — Pluggable transfer rules</li>
      </ul>
      <p>
        On-chain data is public and immutable. It contains NO personal data to ensure
        GDPR compliance.
      </p>

      <h2>Off-Chain Layer</h2>
      <p>
        The off-chain layer stores detailed product and personal data:
      </p>
      <ul>
        <li><strong>DPP Storage</strong> — Digital Product Passport attributes</li>
        <li><strong>EPCIS Events</strong> — Full lifecycle event history</li>
        <li><strong>Personal Data</strong> — Customer information (encrypted, access-controlled)</li>
      </ul>
      <p>
        Off-chain data is deletable, satisfying GDPR right to erasure while maintaining
        on-chain integrity via content hashes.
      </p>

      <h2>Resolver Layer</h2>
      <p>
        The GS1 Digital Link resolver bridges physical products to digital records:
      </p>
      <ul>
        <li><strong>URI Resolution</strong> — Scan QR code to get product data</li>
        <li><strong>Context-Aware Routing</strong> — Different views for different roles</li>
        <li><strong>Linkset Navigation</strong> — Discover related resources</li>
      </ul>

      <h2>CRAB Model (GDPR Compliance)</h2>
      <p>
        Galileo uses the CRAB pattern for GDPR compliance:
      </p>
      <ul>
        <li><strong>C</strong>laim hash on-chain — Cryptographic anchor only</li>
        <li><strong>R</strong>aw data off-chain — Actual content in compliant storage</li>
        <li><strong>A</strong>ccess controlled — Role-based permissions</li>
        <li><strong>B</strong>linded deletion — Remove data while preserving hash proofs</li>
      </ul>

      <h2>Data Flow Example</h2>
      <p>
        When a product is sold:
      </p>
      <ol>
        <li>Buyer&apos;s identity is verified via ONCHAINID claims</li>
        <li>Compliance modules check transfer rules</li>
        <li>Token ownership transfers on-chain</li>
        <li>Sale event recorded off-chain (EPCIS)</li>
        <li>DPP updated with new owner reference</li>
      </ol>

      <h2>Further Reading</h2>
      <ul>
        <li><a href="/docs/identity">Identity System</a></li>
        <li><a href="/docs/token">Token Architecture</a></li>
        <li><a href="/docs/compliance/gdpr">GDPR Implementation Guide</a></li>
      </ul>
    </>
  );
}
