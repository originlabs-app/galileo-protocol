#!/usr/bin/env node
/**
 * check-base-sepolia-readiness.mjs — Verify local live minting prerequisites.
 *
 * This script never prints the mnemonic or private key. It checks that the
 * local wallet can be derived, the configured RPC is Base Sepolia, and the
 * wallet has enough Base Sepolia ETH to pay for deployment/minting gas.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const envPath = resolve(rootDir, "apps/api/.env.local");
const apiRequire = createRequire(resolve(rootDir, "apps/api/package.json"));

const { createPublicClient, formatEther, http, isAddress, parseEther } = await import(
  apiRequire.resolve("viem")
);
const { mnemonicToAccount, privateKeyToAccount } = await import(
  apiRequire.resolve("viem/accounts")
);
const { baseSepolia } = await import(apiRequire.resolve("viem/chains"));

function readEnvFile(path) {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function getEnvValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : undefined;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

const fileEnv = readEnvFile(envPath);
const getConfig = (key) => process.env[key] ?? getEnvValue(fileEnv, key);

const mnemonic = getConfig("MINTING_MNEMONIC");
const privateKey = getConfig("MINTING_PRIVATE_KEY") ?? getConfig("DEPLOYER_PRIVATE_KEY");
const configuredAddress = getConfig("MINTING_WALLET_ADDRESS");
const rpcUrl = getConfig("BASE_SEPOLIA_RPC_URL") ?? getConfig("BASE_SEPOLIA_RPC");
const minimumBalanceEth = getConfig("MIN_BASE_SEPOLIA_BALANCE_ETH") ?? "0.01";

console.log("");
console.log("Base Sepolia live minting readiness");
console.log("=".repeat(38));
console.log(`Env file: ${envPath}`);

if (!fileEnv && !process.env.MINTING_MNEMONIC && !process.env.DEPLOYER_PRIVATE_KEY) {
  fail("apps/api/.env.local not found and no wallet credential is set in process env.");
}

let account;
try {
  if (mnemonic) {
    account = mnemonicToAccount(mnemonic);
  } else if (privateKey) {
    account = privateKeyToAccount(privateKey);
  } else {
    fail("MINTING_MNEMONIC or DEPLOYER_PRIVATE_KEY is required.");
  }
} catch (error) {
  fail(`wallet credential is invalid: ${error instanceof Error ? error.message : String(error)}`);
}

if (account) {
  console.log(`Wallet: ${account.address}`);
}

if (configuredAddress) {
  if (!isAddress(configuredAddress)) {
    fail("MINTING_WALLET_ADDRESS is not a valid Ethereum address.");
  } else if (account && configuredAddress.toLowerCase() !== account.address.toLowerCase()) {
    fail("MINTING_WALLET_ADDRESS does not match the configured wallet credential.");
  }
} else {
  fail("MINTING_WALLET_ADDRESS is missing.");
}

if (!rpcUrl) {
  fail("BASE_SEPOLIA_RPC_URL or BASE_SEPOLIA_RPC is required.");
} else {
  console.log("RPC: configured");
}

if (!account || !rpcUrl) {
  console.log("");
  process.exit(process.exitCode ?? 1);
}

const minimumBalanceNumber = Number(minimumBalanceEth);
if (!Number.isFinite(minimumBalanceNumber) || minimumBalanceNumber <= 0) {
  fail("MIN_BASE_SEPOLIA_BALANCE_ETH must be a positive number.");
}
const minimumBalance = parseEther(minimumBalanceEth);

try {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const chainId = await client.getChainId();
  if (chainId !== baseSepolia.id) {
    fail(`RPC returned chainId ${chainId}; expected Base Sepolia ${baseSepolia.id}.`);
  } else {
    console.log(`Chain: Base Sepolia (${chainId})`);
  }

  const balance = await client.getBalance({ address: account.address });
  console.log(`Balance: ${formatEther(balance)} ETH`);

  if (balance < minimumBalance) {
    fail(`wallet needs at least ${minimumBalanceEth} Base Sepolia ETH.`);
  }
} catch (error) {
  fail(`RPC readiness check failed: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("");
if (process.exitCode) {
  console.log("Not ready for live deploy/mint yet.");
} else {
  console.log("Ready for live deploy/mint.");
}
