import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = pageMetadata("/docs", {
  title: "Galileo Protocol: Principles and Documentation",
  description: "Understand Galileo's product identity and provenance principles, review the protocol specifications, and choose a path from architecture to integration.",
});

export default function DocsIntroduction() {
  return (
    <>
      <h1>Introduction to Galileo</h1>
      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        Galileo documents an open protocol for linking luxury products to identity,
        provenance and ownership records. Start here to understand its principles
        before choosing an architecture or planning an integration.
      </p>
      <h2>What a product record can tell you</h2>
      <p>
        A record lets a verifier inspect who issued information about an item and
        which lifecycle events were recorded. Its usefulness depends on the issuer,
        the evidence supplied and the link between the record and the physical item.
        A digital record alone does not establish physical authenticity.
      </p>
      <h2>Core principles</h2>
      <ul>
        <li><strong>Open specifications:</strong> review the published requirements and schemas before adopting them.</li>
        <li><strong>Separate data and proofs:</strong> the proposed hybrid design keeps detailed records off-chain and anchors references on-chain.</li>
        <li><strong>Explicit access:</strong> design which information each participant can read and update.</li>
        <li><strong>Defined responsibilities:</strong> decide who issues records, verifies evidence and handles corrections.</li>
      </ul>
      <h2>Specifications and demonstrated work</h2>
      <p>
        The <Link href="/specifications">specification library</Link> describes identity,
        token transfers, product data, resolution and compliance patterns. A documented
        requirement is not proof that every deployment implements it. The existing{" "}
        <Link href="/blog/2026-03-22-production-deployment">deployment report</Link> describes
        the dashboard and scanner release; assess the actual integration separately.
      </p>
      <p>
        ERC-3643 is used in the token design for identity-based transfer rules. It is
        not a universal product-passport registry or a guarantee of ESPR compliance.
        For that separate question, read the{" "}
        <Link href="/docs/compliance/espr">digital product passport guide for luxury</Link>.
      </p>
      <h2>From principles to implementation</h2>
      <ol>
        <li>Review the <Link href="/docs/concepts">core concepts</Link> and agree on the evidence your users need.</li>
        <li>Use the <Link href="/docs/architecture">architecture guide</Link> to place data, proofs and access controls.</li>
        <li>Follow the <Link href="/docs/quick-start">integration quick start</Link> to map an example item to the specifications.</li>
      </ol>
    </>
  );
}
