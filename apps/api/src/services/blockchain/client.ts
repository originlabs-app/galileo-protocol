/**
 * Standalone viem client factory for the blockchain service.
 *
 * These helpers create fresh clients independently of the Fastify chain plugin,
 * making the blockchain service unit-testable without a running server.
 *
 * Priority for account resolution:
 *   1. MINTING_MNEMONIC  — BIP-39 mnemonic (recommended; derives key at path m/44'/60'/0'/0/0)
 *   2. MINTING_PRIVATE_KEY / DEPLOYER_PRIVATE_KEY — raw hex private key (legacy fallback)
 */
import {
  type WalletClient,
  createPublicClient,
  createWalletClient,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import {
  baseSepolia,
  getBaseSepoliaRpcUrl,
  getBaseSepoliaTransport,
} from "./chain.js";

/** Create a public (read-only) viem client for Base Sepolia. */
export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: getBaseSepoliaTransport(),
  });
}

/**
 * Create a wallet (write) viem client for Base Sepolia.
 * Returns null and logs a warning if no credential is configured.
 *
 * Resolution order:
 *   1. MINTING_MNEMONIC (BIP-39 — preferred)
 *   2. MINTING_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY (raw hex — legacy)
 */
export function getWalletClient(): WalletClient | null {
  const mnemonic = process.env.MINTING_MNEMONIC;
  if (mnemonic) {
    const account = mnemonicToAccount(mnemonic);
    return createWalletClient({
      account,
      chain: baseSepolia,
      transport: getBaseSepoliaTransport(),
    });
  }

  const privateKey =
    process.env.MINTING_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.warn(
      "[blockchain] No credential configured (MINTING_MNEMONIC / MINTING_PRIVATE_KEY / DEPLOYER_PRIVATE_KEY) — blockchain writes disabled",
    );
    return null;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: getBaseSepoliaTransport(),
  });
}

/**
 * Returns true when both an RPC URL and a signing credential are configured,
 * meaning the service can submit real transactions.
 */
export function isBlockchainWriteConfigured(): boolean {
  return Boolean(
    (process.env.MINTING_MNEMONIC ||
      process.env.MINTING_PRIVATE_KEY ||
      process.env.DEPLOYER_PRIVATE_KEY) &&
      getBaseSepoliaRpcUrl(),
  );
}
