export const metadata = {
  title: 'Token | Galileo Documentation',
  description: 'ERC-3643 token architecture for luxury product ownership.',
};

export default function TokenPage() {
  return (
    <>
      <h1>Token Architecture</h1>

      <p>
        Galileo extends ERC-3643 (T-REX) to create compliant security tokens for
        luxury product ownership. Each physical product is represented by exactly
        one token.
      </p>

      <h2>Single-Supply Pattern</h2>
      <p>
        Unlike fungible tokens, Galileo uses a <strong>single-supply pattern</strong>:
      </p>
      <ul>
        <li>Each product = one token contract deployment</li>
        <li>Total supply = 1 (always)</li>
        <li>Token ID = product DID</li>
      </ul>
      <p>
        This ensures perfect 1:1 correspondence between physical items and digital tokens.
      </p>

      <h2>Token Interface</h2>
      <pre><code>{`interface IGalileoToken is IToken {
    // Product Metadata
    function productDID() external view returns (string memory);
    function productCategory() external view returns (string memory);
    function brandDID() external view returns (string memory);
    function productURI() external view returns (string memory);
    function gtin() external view returns (string memory);
    function serialNumber() external view returns (string memory);

    // CPO (Certified Pre-Owned) Status
    function isCPOCertified() external view returns (bool);
    function cpoCertificationDate() external view returns (uint256);
    function cpoCertifier() external view returns (address);
    function cpoCertificationURI() external view returns (string memory);

    // CPO Management (restricted)
    function certifyCPO(string calldata certificationURI) external;
    function revokeCPO(string calldata reason) external;

    // Extended Transfer
    function transferWithReason(
        address to,
        uint256 amount,
        bytes32 reasonCode,
        string calldata reasonDescription
    ) external returns (bool);

    // Lifecycle
    function isDecommissioned() external view returns (bool);
    function decommissionReason() external view returns (string memory);
}`}</code></pre>

      <h2>Compliance Modules</h2>
      <p>
        Galileo includes 5 pluggable compliance modules:
      </p>
      <table>
        <thead>
          <tr><th>Module</th><th>Purpose</th><th>Checks</th></tr>
        </thead>
        <tbody>
          <tr><td>BrandAuthorization</td><td>Authorized retailer verification</td><td>Seller has brand authorization claim</td></tr>
          <tr><td>CPOCertification</td><td>CPO status requirements</td><td>Resale requires valid CPO certification</td></tr>
          <tr><td>ServiceCenter</td><td>MRO authorization</td><td>Transfer to/from authorized service centers</td></tr>
          <tr><td>Sanctions</td><td>Sanctions screening</td><td>Neither party on sanctions lists</td></tr>
          <tr><td>Jurisdiction</td><td>Geographic restrictions</td><td>Transfer allowed in both jurisdictions</td></tr>
        </tbody>
      </table>

      <h2>Transfer Flow</h2>
      <ol>
        <li><strong>Initiate</strong> — Seller calls <code>transfer()</code> or <code>transferWithReason()</code></li>
        <li><strong>Identity Check</strong> — Verify sender/receiver ONCHAINID</li>
        <li><strong>Compliance Check</strong> — All modules must approve (in order)</li>
        <li><strong>Execute</strong> — Ownership transfers on-chain</li>
        <li><strong>Event</strong> — TransferWithReason emitted, off-chain sync triggered</li>
      </ol>

      <h2>Transfer Reason Codes</h2>
      <pre><code>{`// Standard reason codes (keccak256 hashes)
keccak256("SALE")              // Primary or secondary sale
keccak256("GIFT")              // Gift between individuals
keccak256("INHERITANCE")       // Estate/inheritance transfer
keccak256("WARRANTY_CLAIM")    // Return for warranty service
keccak256("SERVICE_TRANSFER")  // Temporary transfer for service
keccak256("AUCTION")           // Auction house transfer
keccak256("LOAN")              // Temporary transfer for display/loan`}</code></pre>

      <h2>Further Reading</h2>
      <ul>
        <li><a href="/docs/token/ownership-transfer">Ownership Transfer Specification</a></li>
        <li><a href="/docs/compliance">Compliance Overview</a></li>
      </ul>
    </>
  );
}
