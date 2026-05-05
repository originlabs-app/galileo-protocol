export const metadata = {
  title: 'Compliance | Galileo Documentation',
  description: 'Regulatory compliance guides for GDPR, MiCA, and ESPR.',
};

export default function CompliancePage() {
  return (
    <>
      <h1>Compliance Overview</h1>

      <p>
        Galileo is designed for regulatory compliance from the ground up.
        This section provides implementation guides for the three key regulations
        affecting luxury product tokenization.
      </p>

      <h2>Regulatory Landscape</h2>
      <table>
        <thead>
          <tr><th>Regulation</th><th>Scope</th><th>Deadline</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>GDPR</td>
            <td>Personal data protection</td>
            <td>In effect</td>
            <td className="text-green-500">Compliant</td>
          </tr>
          <tr>
            <td>MiCA</td>
            <td>Crypto asset regulation</td>
            <td>June 2026</td>
            <td className="text-yellow-500">Preparing</td>
          </tr>
          <tr>
            <td>ESPR</td>
            <td>Digital Product Passports</td>
            <td>2027</td>
            <td className="text-[var(--precision-blue)]">Ready</td>
          </tr>
        </tbody>
      </table>

      <h2>GDPR Compliance</h2>
      <p>
        The General Data Protection Regulation requires personal data minimization
        and the right to erasure. Galileo addresses this through:
      </p>
      <ul>
        <li><strong>CRAB Model</strong> — Hash on-chain, data off-chain</li>
        <li><strong>Blinded Deletion</strong> — Remove data, preserve proofs</li>
        <li><strong>Access Control</strong> — Role-based data access</li>
      </ul>
      <p><a href="/docs/compliance/gdpr">Read the full GDPR guide</a></p>

      <h2>MiCA Compliance</h2>
      <p>
        Markets in Crypto-Assets affects tokenized products as utility tokens.
        Galileo provides:
      </p>
      <ul>
        <li><strong>Whitepaper Requirements</strong> — DPP serves as compliant whitepaper</li>
        <li><strong>CASP Integration</strong> — Hooks for licensed service providers</li>
        <li><strong>Travel Rule</strong> — Transfer data exchange support</li>
      </ul>
      <p><a href="/docs/compliance/mica">Read the full MiCA guide</a></p>

      <h2>ESPR Compliance</h2>
      <p>
        The Ecodesign for Sustainable Products Regulation mandates Digital Product
        Passports. Galileo&apos;s DPP schema is designed for ESPR:
      </p>
      <ul>
        <li><strong>Mandatory Fields</strong> — All ESPR-required attributes included</li>
        <li><strong>Data Carriers</strong> — QR code and NFC tag support</li>
        <li><strong>Accessibility</strong> — Public access to required information</li>
      </ul>
      <p><a href="/docs/compliance/espr">Read the full ESPR guide</a></p>
    </>
  );
}
