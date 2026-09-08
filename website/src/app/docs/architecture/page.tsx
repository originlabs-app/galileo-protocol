import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata("/docs/architecture", {
  title: 'Architecture | Galileo Documentation',
  description: 'Plan where Galileo stores product data, ownership proofs and access rules. Review the proposed hybrid architecture before mapping an integration.',
});

export default function ArchitecturePage() {
  return (
    <>
      <h1>Hybrid Architecture</h1>

      <p>
        Use this guide to decide which data belongs on-chain, which stays off-chain,
        and how a resolver connects the two. It summarizes the published design;
        each integration must verify which components and controls are implemented.
      </p>

      <p>
        Start with the <Link href="/docs">protocol principles</Link>, then review the{" "}
        <Link href="/specifications/architecture/hybrid-architecture">hybrid architecture specification</Link>.
        ERC-3643 describes the token transfer layer here, not a universal DPP registry.
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
        The design keeps personal data off-chain. Implementers must still assess
        whether identifiers and hashes can be linked to a person.
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
        Off-chain storage allows deletion workflows. Their effectiveness depends on
        storage, backups, access controls and key management; the architecture alone
        does not establish GDPR compliance.
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

      <h2>CRAB: Create, Read, Append, Burn</h2>
      <p>The architecture specification defines these operations:</p>
      <ul>
        <li><strong>Create:</strong> store personal data off-chain with a hash reference on-chain.</li>
        <li><strong>Read:</strong> retrieve data through the reference and access controls.</li>
        <li><strong>Append:</strong> add new event references without rewriting the chain.</li>
        <li><strong>Burn:</strong> delete off-chain content and destroy its encryption key.</li>
      </ul>

      <h2>Data Flow Example</h2>
      <p>
        The proposed transfer flow is:
      </p>
      <ol>
        <li>Buyer&apos;s identity is verified via ONCHAINID claims</li>
        <li>Compliance modules check transfer rules</li>
        <li>Token ownership transfers on-chain</li>
        <li>Sale event recorded off-chain (EPCIS)</li>
        <li>DPP updated with new owner reference</li>
      </ol>

      <p>Next, use the <Link href="/docs/quick-start">integration quick start</Link> to map an example item to these layers.</p>
      <h2>Further Reading</h2>
      <ul>
        <li><Link href="/docs/identity">Identity System</Link></li>
        <li><Link href="/docs/token">Token Architecture</Link></li>
        <li><Link href="/docs/compliance/gdpr">GDPR Implementation Guide</Link></li>
      </ul>
    </>
  );
}
