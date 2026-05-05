export const metadata = {
  title: 'ONCHAINID | Galileo Documentation',
  description: 'On-chain identity contracts for participant verification.',
};

export default function OnchainIDPage() {
  return (
    <>
      <h1>ONCHAINID Integration</h1>

      <p>
        ONCHAINID provides on-chain identity contracts that store verifiable claims
        about participants. Galileo uses ONCHAINID for KYC/KYB verification in
        compliant token transfers.
      </p>

      <h2>Claim Topics</h2>
      <p>
        Galileo defines 12 standard claim topics:
      </p>
      <table>
        <thead>
          <tr><th>Topic ID</th><th>Name</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>KYC</td><td>Individual identity verified</td></tr>
          <tr><td>2</td><td>KYB</td><td>Business identity verified</td></tr>
          <tr><td>3</td><td>AML</td><td>Anti-money laundering cleared</td></tr>
          <tr><td>4</td><td>ACCREDITED</td><td>Accredited investor status</td></tr>
          <tr><td>10</td><td>BRAND_ISSUER</td><td>Authorized to create product DIDs</td></tr>
          <tr><td>11</td><td>SERVICE_PROVIDER</td><td>Authorized service provider</td></tr>
          <tr><td>20</td><td>COUNTRY</td><td>Country of residence/registration</td></tr>
          <tr><td>21</td><td>JURISDICTION</td><td>Regulatory jurisdiction</td></tr>
        </tbody>
      </table>

      <h2>Identity Contract</h2>
      <p>
        Each participant deploys an Identity contract using CREATE2 for deterministic addresses:
      </p>
      <pre><code>{`interface IIdentity {
    function addClaim(
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes calldata signature,
        bytes calldata data,
        string calldata uri
    ) external returns (bytes32 claimId);

    function getClaim(bytes32 claimId)
        external view returns (
            uint256 topic,
            uint256 scheme,
            address issuer,
            bytes memory signature,
            bytes memory data,
            string memory uri
        );

    function getClaimIdsByTopic(uint256 topic)
        external view returns (bytes32[] memory);
}`}</code></pre>

      <h2>Trusted Issuers</h2>
      <p>
        Claims are only valid if issued by trusted issuers registered in the
        TrustedIssuersRegistry:
      </p>
      <ul>
        <li>KYC providers (Onfido, Jumio, etc.)</li>
        <li>Accreditation bodies</li>
        <li>Brand verification services</li>
      </ul>

      <h2>Transfer Verification Flow</h2>
      <ol>
        <li>Token transfer initiated</li>
        <li>Compliance module queries receiver&apos;s ONCHAINID</li>
        <li>Required claim topics checked (KYC, COUNTRY, etc.)</li>
        <li>Issuer validity verified against TrustedIssuersRegistry</li>
        <li>Transfer approved or rejected</li>
      </ol>

      <h2>Privacy Considerations</h2>
      <p>
        Claims use minimal disclosure:
      </p>
      <ul>
        <li>Claim data can be hashed (only hash stored on-chain)</li>
        <li>Actual data stored off-chain with controlled access</li>
        <li>Zero-knowledge proofs supported for sensitive claims</li>
      </ul>
    </>
  );
}
