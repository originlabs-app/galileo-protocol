/**
 * Base Sepolia chain configuration for the Galileo Protocol.
 * Re-exports viem's built-in baseSepolia chain and provides a configured transport.
 */
import { http } from "viem";

export { baseSepolia } from "viem/chains";

/** Canonical Base Sepolia chain ID */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Public RPC fallback when no authenticated Base Sepolia RPC is configured */
export const BASE_SEPOLIA_PUBLIC_RPC = "https://sepolia.base.org";

/** Resolve the configured Base Sepolia RPC URL.
 *
 * `BASE_SEPOLIA_RPC_URL` is the canonical API variable. `BASE_SEPOLIA_RPC`
 * remains supported because the contracts docs and older testnet env examples
 * used that shorter name.
 */
export function getBaseSepoliaRpcUrl(): string | undefined {
  return process.env.BASE_SEPOLIA_RPC_URL ?? process.env.BASE_SEPOLIA_RPC;
}

/**
 * Returns an HTTP transport for Base Sepolia.
 * Prefers configured authenticated RPC env vars; falls back to the public RPC.
 */
export function getBaseSepoliaTransport() {
  return http(getBaseSepoliaRpcUrl() ?? BASE_SEPOLIA_PUBLIC_RPC);
}
