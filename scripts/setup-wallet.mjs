#!/usr/bin/env node
/**
 * setup-wallet.mjs — Generate or display the Galileo minting wallet.
 *
 * Usage:
 *   node scripts/setup-wallet.mjs
 *   node scripts/setup-wallet.mjs --write-env
 *   node scripts/setup-wallet.mjs --show-secret
 *   node scripts/setup-wallet.mjs --rotate --write-env
 *
 * Defaults are intentionally conservative: secrets are not printed. Use
 * --write-env to store a generated mnemonic in apps/api/.env.local, which is
 * gitignored, and print only the public address to fund. Use --rotate when the
 * existing local testnet wallet has been exposed and must be replaced.
 */

import { existsSync, readFileSync, chmodSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const defaultEnvPath = resolve(rootDir, "apps/api/.env.local");
const apiRequire = createRequire(resolve(rootDir, "apps/api/package.json"));

const { createPublicClient, formatEther, http } = await import(
  apiRequire.resolve("viem")
);
const { english, generateMnemonic, mnemonicToAccount } = await import(
  apiRequire.resolve("viem/accounts")
);
const { baseSepolia } = await import(apiRequire.resolve("viem/chains"));

const args = new Set(process.argv.slice(2));
const writeEnv = args.has("--write-env");
const showSecret = args.has("--show-secret");
const rotate = args.has("--rotate");
const envArg = process.argv.find((arg) => arg.startsWith("--env-file="));
const envPath = envArg ? resolve(rootDir, envArg.slice("--env-file=".length)) : defaultEnvPath;

function readEnvFile(path) {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function getEnvValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : undefined;
}

function upsertEnv(content, key, value) {
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  return `${content}${prefix}${line}\n`;
}

const fileEnv = readEnvFile(envPath);
const existingMnemonic =
  rotate ? undefined : process.env.MINTING_MNEMONIC ?? getEnvValue(fileEnv, "MINTING_MNEMONIC");
const mnemonic = existingMnemonic ?? generateMnemonic(english);
const isNew = !existingMnemonic;

const account = mnemonicToAccount(mnemonic);
const address = account.address;

const hdKey = account.getHdKey();
const privateKey = `0x${Buffer.from(hdKey.privateKey).toString("hex")}`;

if (writeEnv) {
  let nextEnv = fileEnv;
  nextEnv = upsertEnv(nextEnv, "MINTING_MNEMONIC", mnemonic);
  nextEnv = upsertEnv(nextEnv, "MINTING_WALLET_ADDRESS", address);
  nextEnv = upsertEnv(nextEnv, "DEPLOYER_PRIVATE_KEY", privateKey);
  writeFileSync(envPath, nextEnv, { mode: 0o600 });
  chmodSync(envPath, 0o600);
}

console.log("");
console.log("─".repeat(60));
console.log(
  rotate
    ? "  ROTATED MINTING WALLET GENERATED"
    : isNew
      ? "  NEW MINTING WALLET GENERATED"
      : "  EXISTING MINTING WALLET",
);
console.log("─".repeat(60));
console.log("");
console.log(`  MINTING_WALLET_ADDRESS=${address}`);

if (writeEnv) {
  console.log(`  Secrets written to ${envPath}`);
} else {
  console.log("  Secrets were not written. Run with --write-env to store them locally.");
}

if (showSecret) {
  console.log("");
  console.log(`  MINTING_MNEMONIC=${mnemonic}`);
  console.log(`  DEPLOYER_PRIVATE_KEY=${privateKey}`);
}

console.log("");
console.log("  Fund this address with Base Sepolia ETH before live minting.");
console.log("  Faucet: https://faucet.quicknode.com/base/sepolia");
console.log("─".repeat(60));
console.log("");

const rpcUrl =
  process.env.BASE_SEPOLIA_RPC_URL ??
  process.env.BASE_SEPOLIA_RPC ??
  getEnvValue(fileEnv, "BASE_SEPOLIA_RPC_URL") ??
  getEnvValue(fileEnv, "BASE_SEPOLIA_RPC");

if (rpcUrl) {
  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    const balance = await client.getBalance({ address });
    console.log(`  Balance on Base Sepolia: ${formatEther(balance)} ETH`);
    console.log("");
  } catch {
    // Non-fatal. The address is still valid; the RPC can be configured later.
  }
}
