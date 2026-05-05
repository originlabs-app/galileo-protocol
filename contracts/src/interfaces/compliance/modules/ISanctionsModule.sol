// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import "../IComplianceModule.sol";

/**
 * @title ISanctionsModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module for OFAC/EU sanctions screening via Chainalysis oracle
 * @dev This module integrates with the Chainalysis Sanctions Oracle to block transfers
 *      involving sanctioned addresses. The oracle is deployed at the same address on
 *      most EVM-compatible chains: 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
 *
 *      Key Features:
 *      - Real-time on-chain sanctions screening
 *      - Configurable strict/non-strict mode
 *      - High-value transfer flagging
 *      - Multi-oracle support for redundancy
 *
 *      Important Considerations:
 *
 *      1. **Update Latency**: The Chainalysis oracle may have an update latency of
 *         60+ days behind OFAC announcements. For production deployments, layer this
 *         with off-chain screening APIs (TRM Labs, Elliptic) for high-value transfers.
 *
 *      2. **Strict Mode**: In strict mode (recommended for production), any oracle
 *         call failure will revert the transfer. In non-strict mode, oracle failures
 *         allow the transfer (fail-open), which may not be compliant.
 *
 *      3. **Gas Costs**: Each isSanctioned() call costs approximately 26,000 gas.
 *         For batch operations, consider gas optimization strategies.
 *
 *      4. **Address Coverage**: The oracle only checks addresses, not transaction
 *         patterns. Use off-chain monitoring for behavioral analysis.
 *
 *      Integration Pattern:
 *      ```solidity
 *      // In moduleCheck, verify neither party is sanctioned
 *      function moduleCheck(address _from, address _to, uint256 _value, address _compliance)
 *          external view returns (bool)
 *      {
 *          return !isSanctioned(_from) && !isSanctioned(_to);
 *      }
 *      ```
 *
 * Reference: Chainalysis Oracle Documentation
 * Specification: GSPEC-COMPLIANCE-003
 * @custom:security-contact security@galileoprotocol.io
 */
interface ISanctionsModule is IComplianceModule {
    // ═══════════════════════════════════════════════════════════════════════════
    // CHAINALYSIS ORACLE INTERFACE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the address of the configured sanctions oracle
     * @dev Default is the Chainalysis oracle at 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
     * @return The oracle contract address
     */
    function sanctionsOracle() external view returns (address);

    /**
     * @notice Check if an address is on the sanctions list
     * @dev Queries the configured sanctions oracle. In strict mode, reverts on
     *      oracle failure. In non-strict mode, returns false on oracle failure.
     *
     *      Gas Cost: ~26,000 gas per call
     *
     * @param _address The address to check
     * @return True if the address is sanctioned, false otherwise
     */
    function isSanctioned(address _address) external view returns (bool);

    /**
     * @notice Check if either party in a transfer is sanctioned
     * @dev Efficiently checks both parties in a single call. Useful for
     *      pre-transfer validation with detailed feedback.
     *
     *      Gas Cost: ~52,000 gas (two oracle calls)
     *
     * @param _from Sender address
     * @param _to Receiver address
     * @return fromSanctioned True if sender is on sanctions list
     * @return toSanctioned True if receiver is on sanctions list
     */
    function checkBothParties(address _from, address _to)
        external view returns (bool fromSanctioned, bool toSanctioned);

    /**
     * @notice Batch check multiple addresses for sanctions
     * @dev Gas-efficient for checking multiple addresses at once.
     *      Returns parallel array of results.
     *
     *      Gas Cost: ~26,000 gas per address
     *
     * @param _addresses Array of addresses to check
     * @return results Array of boolean results (true = sanctioned)
     */
    function batchCheckSanctions(address[] calldata _addresses)
        external view returns (bool[] memory results);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the sanctions oracle address
     * @dev For chain-specific deployments where oracle address differs from default.
     *      The Chainalysis oracle is typically at the same address across chains,
     *      but custom oracles may be used for testing or specialized lists.
     *
     *      Requirements:
     *      - Caller must be module admin
     *      - Oracle address must not be zero
     *      - New oracle should implement SanctionsList interface
     *
     * @param _oracle The oracle contract address
     */
    function setSanctionsOracle(address _oracle) external;

    /**
     * @notice Enable or disable strict mode
     * @dev Strict mode determines behavior when the oracle call fails:
     *
     *      - **Strict (true)**: Oracle failure reverts the transfer. This is the
     *        recommended setting for production as it prevents transfers when
     *        sanctions status cannot be verified.
     *
     *      - **Non-strict (false)**: Oracle failure allows the transfer (fail-open).
     *        This may result in non-compliant transfers and should only be used
     *        in exceptional circumstances.
     *
     *      Default: true (strict mode enabled)
     *
     * @param _strict True for fail-closed behavior, false for fail-open
     */
    function setStrictMode(bool _strict) external;

    /**
     * @notice Get strict mode status
     * @return True if strict mode (fail-closed) is enabled
     */
    function isStrictMode() external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // HIGH-VALUE TRANSFER HANDLING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set threshold for high-value transfer flagging
     * @dev Transfers above this threshold emit HighValueTransferFlagged event
     *      to trigger enhanced off-chain screening. This does not block transfers
     *      on-chain but signals that additional verification is recommended.
     *
     *      Typical threshold: 10,000 EUR equivalent (per EU 4AMLD)
     *
     *      For tokens with 18 decimals representing EUR:
     *      - 10,000 EUR = 10000 * 10^18 = 10000e18
     *
     * @param _threshold Amount in token's smallest unit
     */
    function setHighValueThreshold(uint256 _threshold) external;

    /**
     * @notice Get high-value transfer threshold
     * @return The threshold amount in token's smallest unit
     */
    function highValueThreshold() external view returns (uint256);

    /**
     * @notice Check if a transfer amount is considered high-value
     * @dev High-value transfers may require enhanced screening via off-chain APIs
     *
     * @param _amount The transfer amount to check
     * @return True if amount exceeds high-value threshold
     */
    function isHighValueTransfer(uint256 _amount) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // SUPPLEMENTARY BLOCKLIST
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Add an address to the supplementary blocklist
     * @dev The supplementary blocklist is checked in addition to the oracle.
     *      Use this for:
     *      - Addresses sanctioned but not yet in oracle
     *      - Internal compliance blocks
     *      - Court orders
     *
     *      Note: This does NOT remove addresses from the blocklist maintained
     *      by the oracle. Both lists are checked.
     *
     * @param _address The address to block
     * @param _reason Reason for blocking (for audit trail)
     */
    function addToBlocklist(address _address, string calldata _reason) external;

    /**
     * @notice Remove an address from the supplementary blocklist
     * @dev Only removes from supplementary list. If address is sanctioned per
     *      oracle, it will still be blocked.
     *
     * @param _address The address to unblock
     * @param _reason Reason for unblocking (for audit trail)
     */
    function removeFromBlocklist(address _address, string calldata _reason) external;

    /**
     * @notice Check if an address is on the supplementary blocklist
     * @dev Separate from oracle check. Full sanction status requires both checks.
     *
     * @param _address The address to check
     * @return True if address is on supplementary blocklist
     */
    function isOnBlocklist(address _address) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // GRACE PERIOD HANDLING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Enable grace period for newly sanctioned addresses
     * @dev When OFAC adds new designations, there may be a period where
     *      legitimate transactions in progress should complete. The grace
     *      period allows transfers to/from addresses that were added to
     *      the supplementary blocklist within the grace window.
     *
     *      Use with caution: This may allow non-compliant transfers.
     *      Recommended only for operational continuity during mass updates.
     *
     * @param _enabled True to enable grace period
     * @param _duration Duration in seconds (max 24 hours recommended)
     */
    function setGracePeriod(bool _enabled, uint256 _duration) external;

    /**
     * @notice Check if grace period is active for an address
     * @dev Returns true if address was blocked within grace window and
     *      grace period is enabled.
     *
     * @param _address The address to check
     * @return True if grace period applies to this address
     */
    function isInGracePeriod(address _address) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a transfer is blocked due to sanctions
     * @param from Sender address (may or may not be sanctioned)
     * @param to Receiver address (may or may not be sanctioned)
     * @param amount Transfer amount that was blocked
     * @param fromSanctioned True if sender was the sanctioned party
     * @param toSanctioned True if receiver was the sanctioned party
     */
    event SanctionedTransferBlocked(
        address indexed from,
        address indexed to,
        uint256 amount,
        bool fromSanctioned,
        bool toSanctioned
    );

    /**
     * @notice Emitted when sanctions check is performed
     * @dev Provides audit trail for all sanctions screenings
     * @param subject Address that was checked
     * @param isSanctioned Result of the check
     * @param timestamp Block timestamp of the check
     */
    event SanctionsCheckPerformed(
        address indexed subject,
        bool isSanctioned,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a high-value transfer is flagged for enhanced screening
     * @dev This event signals off-chain systems to perform additional checks
     * @param from Sender address
     * @param to Receiver address
     * @param amount Transfer amount exceeding threshold
     */
    event HighValueTransferFlagged(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    /**
     * @notice Emitted when the sanctions oracle address is updated
     * @param oldOracle Previous oracle address
     * @param newOracle New oracle address
     */
    event SanctionsOracleUpdated(
        address indexed oldOracle,
        address indexed newOracle
    );

    /**
     * @notice Emitted when strict mode is changed
     * @param strictMode New strict mode status
     */
    event StrictModeChanged(bool strictMode);

    /**
     * @notice Emitted when high-value threshold is updated
     * @param oldThreshold Previous threshold
     * @param newThreshold New threshold
     */
    event HighValueThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold
    );

    /**
     * @notice Emitted when an address is added to supplementary blocklist
     * @param blockedAddress The address that was blocked
     * @param reason Reason for blocking
     * @param blockedAt Timestamp when blocked
     */
    event AddressBlocked(
        address indexed blockedAddress,
        string reason,
        uint256 blockedAt
    );

    /**
     * @notice Emitted when an address is removed from supplementary blocklist
     * @param unblockedAddress The address that was unblocked
     * @param reason Reason for unblocking
     */
    event AddressUnblocked(
        address indexed unblockedAddress,
        string reason
    );

    /**
     * @notice Emitted when oracle call fails
     * @dev Only emitted in non-strict mode
     * @param targetAddress Address for which oracle failed
     * @param timestamp When the failure occurred
     */
    event OracleCallFailed(
        address indexed targetAddress,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when sender is on sanctions list
     * @param sender The sanctioned sender address
     */
    error SenderSanctioned(address sender);

    /**
     * @notice Thrown when receiver is on sanctions list
     * @param receiver The sanctioned receiver address
     */
    error ReceiverSanctioned(address receiver);

    /**
     * @notice Thrown when oracle call fails in strict mode
     * @dev In strict mode, any oracle failure blocks the transfer
     */
    error OracleCallFailedStrict();

    /**
     * @notice Thrown when attempting to set zero address as oracle
     */
    error InvalidOracleAddress();

    /**
     * @notice Thrown when grace period duration exceeds maximum
     * @param requested The requested duration
     * @param maximum The maximum allowed duration
     */
    error GracePeriodTooLong(uint256 requested, uint256 maximum);

    /**
     * @notice Thrown when address is already on blocklist
     * @param blockedAddress The address already blocked
     */
    error AddressAlreadyBlocked(address blockedAddress);

    /**
     * @notice Thrown when address is not on blocklist
     * @param unblockedAddress The address not found on blocklist
     */
    error AddressNotBlocked(address unblockedAddress);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINALYSIS SANCTIONS ORACLE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title SanctionsList
 * @notice Interface for the Chainalysis sanctions oracle
 * @dev The Chainalysis Sanctions Oracle is deployed at the same address on most
 *      EVM-compatible chains: 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
 *
 *      Supported Chains (same address):
 *      - Ethereum Mainnet
 *      - Polygon
 *      - Arbitrum
 *      - Optimism
 *      - Base
 *      - BNB Chain
 *      - Avalanche C-Chain
 *
 *      The oracle is maintained by Chainalysis and contains addresses from the
 *      OFAC SDN (Specially Designated Nationals) list.
 *
 *      Important: The oracle may have update latency of 60+ days behind OFAC
 *      announcements. For production deployments handling high-value transfers,
 *      layer with off-chain screening APIs (TRM Labs, Elliptic).
 *
 *      Gas Cost: ~26,000 gas per isSanctioned() call
 *
 * @custom:address 0x40C57923924B5c5c5455c48D93317139ADDaC8fb
 */
interface SanctionsList {
    /**
     * @notice Check if an address is on the OFAC sanctions list
     * @dev Returns true if the address has been identified as belonging to
     *      a sanctioned entity. The check is against blockchain addresses
     *      associated with OFAC SDN list designations.
     *
     * @param addr The address to check
     * @return True if the address is sanctioned, false otherwise
     */
    function isSanctioned(address addr) external view returns (bool);
}
