import { getTotalSpecCount } from "@/lib/specs-navigation";

export const metadata = {
  title: "Introduction to Galileo Documentation",
  description:
    "Learn about the Galileo open standard for luxury product authenticity. Discover core principles, specifications, and how blockchain protects brand heritage.",
  alternates: {
    canonical: "/docs",
  },
};

export default async function DocsIntroduction() {
  const totalSpecs = await getTotalSpecCount().catch(() => 65);
  return (
    <>
      <h1>Introduction to Galileo</h1>

      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        Galileo is an open standard that enables luxury brands to protect
        heritage and craftsmanship through interoperable, blockchain-based
        product authentication.
      </p>

      <h2>Why Galileo?</h2>
      <p>
        The luxury industry faces unprecedented challenges: counterfeiting costs
        brands billions annually, new regulations like ESPR mandate Digital
        Product Passports, and consumers demand transparency. Existing solutions
        are proprietary silos that don&apos;t interoperate.
      </p>
      <p>
        Galileo solves this by providing a neutral, open standard that any brand
        can adopt. Like HTTP for the web, Galileo creates a common language for
        luxury product data.
      </p>

      <h2>Core Principles</h2>
      <ul>
        <li>
          <strong>Open & Neutral</strong> — Apache 2.0 licensed, governed by a
          Technical Steering Committee with anti-dominance rules preventing any
          single organization from control.
        </li>
        <li>
          <strong>Privacy-First</strong> — GDPR-compliant hybrid architecture
          keeps personal data off-chain while anchoring ownership proofs
          on-chain.
        </li>
        <li>
          <strong>Regulation-Ready</strong> — Designed from the ground up for
          ESPR (Digital Product Passports), MiCA (crypto asset regulation), and
          GDPR compliance.
        </li>
        <li>
          <strong>Interoperable</strong> — Built on W3C standards (DIDs,
          Verifiable Credentials), GS1 Digital Link, and ERC-3643 for maximum
          compatibility.
        </li>
      </ul>

      <h2>What&apos;s in the Standard?</h2>
      <p>Galileo v1.0.0 includes {totalSpecs} specifications covering:</p>
      <ul>
        <li>
          <strong>Identity</strong> — DID method, ONCHAINID integration,
          Verifiable Credentials
        </li>
        <li>
          <strong>Token</strong> — ERC-3643 extension for luxury products,
          compliance modules
        </li>
        <li>
          <strong>Data</strong> — ESPR-ready DPP schema, EPCIS 2.0 lifecycle
          events
        </li>
        <li>
          <strong>Infrastructure</strong> — GS1 resolver, access control, audit
          trails
        </li>
        <li>
          <strong>Compliance</strong> — GDPR, MiCA, and ESPR implementation
          guides
        </li>
      </ul>

      <h2>Who is Galileo For?</h2>
      <ul>
        <li>
          <strong>Luxury Brands</strong> — Implement authentic product
          certificates
        </li>
        <li>
          <strong>Technology Providers</strong> — Build compliant solutions on
          open standards
        </li>
        <li>
          <strong>Regulators</strong> — Understand how the standard meets
          requirements
        </li>
        <li>
          <strong>Researchers</strong> — Study blockchain applications in luxury
        </li>
      </ul>

      <h2>Next Steps</h2>
      <p>
        Ready to dive in? Start with the{" "}
        <a href="/docs/quick-start">Quick Start Guide</a> to understand the
        basic concepts, or explore the{" "}
        <a href="/docs/architecture">Architecture Overview</a> for a technical
        deep-dive.
      </p>
    </>
  );
}
