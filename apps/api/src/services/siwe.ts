/**
 * SIWE (Sign-In With Ethereum, EIP-4361) service.
 *
 * Provides nonce generation/consumption and message verification
 * for wallet-based authentication.
 *
 * MVP: in-memory nonce store. Production: use Redis or DB.
 */

import { randomUUID } from "node:crypto";

// In-memory nonce store (Map<nonce, { expiresAt }>)
const siweNonceStore = new Map<string, { expiresAt: number }>();

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Create a SIWE nonce (not bound to a user — used before authentication).
 */
export function createSiweNonce(): string {
  // Lazy cleanup of expired nonces
  const now = Date.now();
  for (const [key, val] of siweNonceStore) {
    if (val.expiresAt < now) siweNonceStore.delete(key);
  }

  const nonce = randomUUID().replace(/-/g, ""); // alphanumeric nonce
  siweNonceStore.set(nonce, { expiresAt: now + NONCE_TTL_MS });
  return nonce;
}

/**
 * Consume a SIWE nonce (one-time use). Returns true if valid and not expired.
 */
export function consumeSiweNonce(nonce: string): boolean {
  const entry = siweNonceStore.get(nonce);
  if (!entry) return false;
  siweNonceStore.delete(nonce); // One-time use — delete immediately
  if (entry.expiresAt < Date.now()) return false;
  return true;
}

// Exported for testing
export function _clearSiweNonceStore(): void {
  siweNonceStore.clear();
}

// Exported for testing — allows injecting fake nonces
export function _setSiweNonce(nonce: string, expiresAt: number): void {
  siweNonceStore.set(nonce, { expiresAt });
}
