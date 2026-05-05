// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

/**
 * @title IToken - ERC-3643 Token Interface for Galileo Luxury Ecosystem
 * @author Galileo Protocol Contributors
 * @notice Re-export of the standard ERC-3643 (T-REX) IToken interface with Galileo-specific documentation
 * @dev This file imports and re-exports the official ERC-3643 IToken interface from the
 *      @erc3643org/erc-3643 package (v4.1.3). The ERC-3643 standard provides a framework
 *      for permissioned tokens with identity verification and modular compliance.
 *
 *      **Galileo Single-Supply Pattern:**
 *      In the Galileo ecosystem, each luxury product is represented by a SEPARATE token
 *      deployment where totalSupply() is ALWAYS 1. This differs from the original ERC-3643
 *      design for fungible security tokens. The single-supply pattern ensures:
 *      - One token = One physical luxury product
 *      - Clear ownership representation
 *      - Individual compliance rules per product if needed
 *      - Simplified transfer tracking (no partial ownership)
 *
 *      **Key ERC-3643 Functions (from base IToken):**
 *
 *      *Registry Binding:*
 *      - setIdentityRegistry(address _identityRegistry): Binds the Identity Registry contract
 *        that verifies investor identities before transfers. The registry checks that
 *        receivers have valid KYC claims from trusted issuers.
 *
 *      - setCompliance(address _compliance): Binds the Modular Compliance contract that
 *        enforces transfer rules. Compliance modules can check country restrictions,
 *        balance limits, daily volume limits, etc.
 *
 *      - setOnchainID(address _onchainID): Binds the token's own ONCHAINID contract.
 *        The token itself has an identity that can hold claims (e.g., regulatory approvals).
 *
 *      *Pause/Freeze Controls:*
 *      - pause(): Globally pause all transfers. Used for emergency situations,
 *        regulatory holds, or planned maintenance.
 *
 *      - unpause(): Resume transfers after pause.
 *
 *      - setAddressFrozen(address _address, bool _frozen): Freeze a specific address.
 *        Frozen addresses cannot send OR receive tokens. Used for suspicious activity,
 *        legal holds, or account recovery processes.
 *
 *      - freezePartialTokens(address _address, uint256 _amount): Freeze a portion of
 *        an address's balance. The address can still transfer unfrozen tokens.
 *        Used for collateral locks or partial legal holds.
 *
 *      - unfreezePartialTokens(address _address, uint256 _amount): Unfreeze previously
 *        frozen tokens.
 *
 *      - getFrozenTokens(address _address) view returns (uint256): Query frozen balance.
 *
 *      *Recovery Functions:*
 *      - recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID):
 *        Recovers tokens from a lost/compromised wallet to a new wallet. Requires the
 *        caller to be an authorized agent AND the newWallet must be associated with
 *        the same ONCHAINID as the lostWallet. This preserves identity association
 *        during wallet recovery.
 *
 *      *Batch Operations:*
 *      - batchTransfer(address[] _to, uint256[] _amounts): Transfer to multiple addresses
 *        in a single transaction. Gas-efficient for distributions.
 *
 *      - batchMint(address[] _to, uint256[] _amounts): Mint to multiple addresses.
 *
 *      - batchBurn(address[] _from, uint256[] _amounts): Burn from multiple addresses.
 *
 *      - batchFreezePartialTokens(address[] _addresses, uint256[] _amounts): Batch freeze.
 *
 *      - batchSetAddressFrozen(address[] _addresses, bool[] _frozen): Batch address freeze.
 *
 *      *Agent-Controlled Functions:*
 *      - forcedTransfer(address _from, address _to, uint256 _amount, bytes _data):
 *        Allows authorized agents to transfer tokens between addresses. Used for:
 *        - Court-ordered transfers
 *        - Recovery from compromised wallets
 *        - Regulatory enforcement
 *        The _data field can contain reason codes for audit trail.
 *
 *      **ERC-20 Compatibility:**
 *      IToken inherits ERC-20 functions (transfer, transferFrom, approve, balanceOf, etc.)
 *      but with ADDITIONAL REQUIREMENTS:
 *      - Receiver MUST be verified in Identity Registry (isVerified() returns true)
 *      - Transfer MUST pass Compliance checks (compliance.canTransfer() returns true)
 *      - Neither sender nor receiver can be frozen
 *      - Token must not be paused
 *
 *      **Events (inherited from ERC-3643):**
 *      - Transfer(from, to, amount): Standard ERC-20 transfer event
 *      - Paused(account): Token was paused
 *      - Unpaused(account): Token was unpaused
 *      - AddressFrozen(address, isFrozen, agent): Address freeze status changed
 *      - TokensFrozen(address, amount): Tokens were partially frozen
 *      - TokensUnfrozen(address, amount): Tokens were unfrozen
 *      - RecoverySuccess(lostWallet, newWallet, investorOnchainID): Recovery completed
 *      - IdentityRegistryAdded(registry): Identity Registry bound
 *      - ComplianceAdded(compliance): Compliance contract bound
 *
 *      **Security Considerations:**
 *      - Agent roles (freeze, recover, forcedTransfer) MUST use multi-sig in production
 *      - Always verify identityRegistry() returns expected address before operations
 *      - Check paused() status in off-chain systems before preparing transfers
 *      - Monitor RecoverySuccess events for potential unauthorized recovery attempts
 *
 * @custom:package @erc3643org/erc-3643@4.1.3
 * @custom:security-contact security@galileoprotocol.io
 */

import {IToken} from "@erc3643org/erc-3643/contracts/token/IToken.sol";

// Re-export IToken for use in Galileo ecosystem contracts
// Implementations should import from this file to ensure consistent documentation
// and versioning across the codebase.
//
// Example usage:
//   import {IToken} from "./IToken.sol";
//
//   contract GalileoProductToken is IToken {
//       // Implementation...
//   }
