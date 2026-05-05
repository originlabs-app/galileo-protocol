export const metadata = {
  title: 'MiCA Guide | Galileo Documentation',
  description: 'Preparing for MiCA compliance with Galileo.',
};

export default function MiCAGuidePage() {
  return (
    <>
      <h1>MiCA Compliance Guide</h1>

      <p>
        Markets in Crypto-Assets (MiCA) becomes fully effective in June 2026.
        This guide covers how Galileo tokens relate to MiCA requirements.
      </p>

      <h2>Token Classification</h2>
      <p>
        Galileo tokens are classified as <strong>utility tokens</strong> under MiCA:
      </p>
      <ul>
        <li>Represent ownership rights to physical goods</li>
        <li>Not designed for investment returns</li>
        <li>Utility is access to product authenticity data</li>
      </ul>

      <h2>Whitepaper Requirements</h2>
      <p>
        MiCA requires a whitepaper for crypto-asset offerings. Galileo&apos;s DPP
        satisfies this requirement:
      </p>
      <ul>
        <li>Issuer identification (brand DID)</li>
        <li>Rights and obligations (ownership transfer rules)</li>
        <li>Technology description (ERC-3643, identity system)</li>
        <li>Risk disclosure (compliance module descriptions)</li>
      </ul>

      <h2>CASP Requirements</h2>
      <p>
        Crypto-Asset Service Providers must be licensed. Galileo provides:
      </p>
      <ul>
        <li>Service provider claim type (ONCHAINID topic 11)</li>
        <li>License verification hooks</li>
        <li>Geographic restriction modules</li>
      </ul>

      <h2>Travel Rule</h2>
      <p>
        MiCA implements the Travel Rule for transfers greater than 1,000 EUR:
      </p>
      <pre><code>{`struct TravelRuleData {
    string originatorName;
    string originatorAddress;
    string beneficiaryName;
    bytes32 originatorIdHash;  // Privacy-preserving
    bytes32 beneficiaryIdHash;
}`}</code></pre>

      <h2>Implementation Checklist</h2>
      <ul>
        <li>DPP includes MiCA whitepaper fields</li>
        <li>CASP verification implemented</li>
        <li>Travel Rule data exchange configured</li>
        <li>Geographic restrictions active</li>
        <li>Complaint handling process documented</li>
      </ul>

      <h2>Timeline</h2>
      <ul>
        <li><strong>June 2024</strong> — MiCA enters force (stablecoins)</li>
        <li><strong>December 2024</strong> — Full application</li>
        <li><strong>June 2026</strong> — Transition period ends</li>
      </ul>
    </>
  );
}
