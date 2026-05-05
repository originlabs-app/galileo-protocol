export const metadata = {
  title: 'Ownership Transfer | Galileo Documentation',
  description: 'How ownership transfers work in Galileo tokens.',
};

export default function OwnershipTransferPage() {
  return (
    <>
      <h1>Ownership Transfer</h1>

      <p>
        Transferring a Galileo token represents a real-world ownership change.
        The process ensures regulatory compliance while maintaining an immutable
        audit trail.
      </p>

      <h2>8-Step Validation</h2>
      <p>Every transfer passes through this validation sequence:</p>
      <ol>
        <li><strong>Token Pause Check</strong> — <code>token.paused() == false</code></li>
        <li><strong>Sender Freeze Check</strong> — <code>token.isFrozen(from) == false</code></li>
        <li><strong>Receiver Freeze Check</strong> — <code>token.isFrozen(to) == false</code></li>
        <li><strong>Sender Balance Check</strong> — Unfrozen balance sufficient</li>
        <li><strong>Identity Registry</strong> — <code>identityRegistry.isVerified(to) == true</code></li>
        <li><strong>Compliance Modules</strong> — All modules approve via <code>compliance.canTransfer()</code></li>
        <li><strong>Execute Transfer</strong> — Balances updated, <code>Transfer</code> emitted</li>
        <li><strong>Post-Transfer</strong> — <code>compliance.transferred()</code> notifies modules</li>
      </ol>

      <h2>Transfer Types</h2>

      <h3>Standard Transfer</h3>
      <p>
        Normal ownership change between verified participants:
      </p>
      <pre><code>{`function transfer(address to, uint256 amount) external returns (bool);`}</code></pre>

      <h3>Transfer with Reason</h3>
      <p>
        Transfer with reason code for audit trail:
      </p>
      <pre><code>{`function transferWithReason(
    address to,
    uint256 amount,
    bytes32 reasonCode,
    string calldata reasonDescription
) external returns (bool);

// Example usage
token.transferWithReason(
    buyerAddress,
    1,
    keccak256("SECONDARY_SALE"),
    "Private sale via Vestiaire Collective #ORD-12345"
);`}</code></pre>

      <h3>Forced Transfer</h3>
      <p>
        Admin transfer for legal enforcement (requires Agent role):
      </p>
      <pre><code>{`function forcedTransfer(
    address from,
    address to,
    uint256 amount,
    bytes data
) external;`}</code></pre>

      <h3>Recovery Transfer</h3>
      <p>
        Recover token to new wallet (requires Agent role + multi-sig):
      </p>
      <pre><code>{`function recoveryAddress(
    address lostWallet,
    address newWallet,
    address investorOnchainID
) external;`}</code></pre>

      <h2>Events</h2>
      <pre><code>{`// Standard ERC-20 transfer
event Transfer(
    address indexed from,
    address indexed to,
    uint256 amount
);

// Extended transfer with reason
event TransferWithReason(
    address indexed from,
    address indexed to,
    uint256 amount,
    bytes32 reasonCode,
    string reasonDescription
);

// Forced transfer by agent
event ForcedTransfer(
    address indexed from,
    address indexed to,
    uint256 amount,
    address indexed initiatingAgent
);

// Recovery transfer
event RecoveryCompleted(
    address indexed lostWallet,
    address indexed newWallet,
    address indexed investorOnchainID
);`}</code></pre>

      <h2>Off-Chain Sync</h2>
      <p>
        After on-chain transfer completes:
      </p>
      <ol>
        <li>Transfer event indexed by event listener</li>
        <li>EPCIS TransactionEvent created</li>
        <li>DPP owner reference updated</li>
        <li>Previous owner&apos;s access revoked (configurable)</li>
      </ol>

      <h2>Error Codes</h2>
      <table>
        <thead>
          <tr><th>Error</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td>TokenPaused</td><td>Token globally paused</td></tr>
          <tr><td>SenderFrozen</td><td>Sender address is frozen</td></tr>
          <tr><td>ReceiverFrozen</td><td>Receiver address is frozen</td></tr>
          <tr><td>InsufficientUnfrozenBalance</td><td>Partial freeze blocks amount</td></tr>
          <tr><td>ReceiverNotVerified</td><td>Receiver not in Identity Registry</td></tr>
          <tr><td>TransferNotCompliant</td><td>Compliance module rejected</td></tr>
          <tr><td>CPORequired</td><td>CPO certification missing for resale</td></tr>
          <tr><td>JurisdictionBlocked</td><td>Receiver country restricted</td></tr>
          <tr><td>SanctionedAddress</td><td>Party on sanctions list</td></tr>
        </tbody>
      </table>
    </>
  );
}
