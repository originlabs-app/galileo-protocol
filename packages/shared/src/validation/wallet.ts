/**
 * Shared wallet validation utilities.
 *
 * @module validation/wallet
 */

/** Matches a valid Ethereum address: 0x followed by 40 hex characters. */
export const ETHEREUM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Prefix used in the EIP-191 message for wallet linking. */
export const LINK_WALLET_MESSAGE_PREFIX = "Link wallet to Galileo:";

/**
 * Build the full message that must be signed to link a wallet.
 * v2: includes nonce + timestamp for replay protection.
 */
export function buildLinkWalletMessage(
  email: string,
  nonce?: string,
  timestamp?: number,
): string {
  if (nonce && timestamp) {
    return `${LINK_WALLET_MESSAGE_PREFIX} ${email}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  }
  // Legacy fallback (for backward compatibility during migration)
  return `${LINK_WALLET_MESSAGE_PREFIX} ${email}`;
}

/** Parse nonce and timestamp from a signed message. Returns null if not present. */
export function parseLinkWalletMessage(
  message: string,
): { email: string; nonce: string; timestamp: number } | null {
  const lines = message.split("\n");
  if (lines.length < 3) return null;
  const emailMatch = lines[0]!.match(/^Link wallet to Galileo:\s+(.+)$/);
  const nonceMatch = lines[1]?.match(/^Nonce:\s+(.+)$/);
  const timestampMatch = lines[2]?.match(/^Timestamp:\s+(\d+)$/);
  if (!emailMatch || !nonceMatch || !timestampMatch) return null;
  return {
    email: emailMatch[1]!,
    nonce: nonceMatch[1]!,
    timestamp: Number(timestampMatch[1]),
  };
}
