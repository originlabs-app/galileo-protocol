#!/usr/bin/env node
/**
 * Public-safe API demo health check.
 *
 * Required env:
 *   DEMO_API_URL or STAGING_API_URL
 *
 * This script is intentionally narrow: it reads only the public-safe /health
 * payload and exits non-zero when a live demo should not start.
 */

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function readPath(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return current[key];
    }
    return undefined;
  }, object);
}

function normalizeApiUrl(value) {
  if (!value) {
    fail("DEMO_API_URL or STAGING_API_URL is required.");
    return null;
  }

  try {
    const url = new URL(value);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";
    if (url.protocol !== "https:" && !isLocalhost) {
      fail("Demo API URL must use HTTPS unless it targets localhost.");
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    fail("Demo API URL is not a valid URL.");
    return null;
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function expectEqual(payload, path, expected) {
  const actual = readPath(payload, path);
  if (actual !== expected) {
    fail(`health.${path} expected ${expected}, got ${String(actual)}.`);
  }
}

function expectPresentString(payload, path) {
  const actual = readPath(payload, path);
  if (typeof actual !== "string" || actual.length === 0) {
    fail(`health.${path} is missing.`);
  }
}

console.log("");
console.log("Galileo demo health check");
console.log("==========================");

const apiUrl = normalizeApiUrl(process.env.DEMO_API_URL ?? process.env.STAGING_API_URL);

if (process.exitCode) {
  process.exit(process.exitCode);
}

const response = await fetchWithTimeout(`${apiUrl}/health`);
if (!response.ok) {
  fail(`API health returned HTTP ${response.status}.`);
} else {
  const payload = await response.json();

  expectEqual(payload, "status", "ok");
  expectEqual(payload, "dependencies.database", "ok");
  expectEqual(payload, "dependencies.chain", "ok");
  expectEqual(payload, "dependencies.wallet", "ok");
  expectEqual(payload, "deployment.chainId", 84532);
  expectEqual(payload, "deployment.writeEnabled", true);
  expectEqual(payload, "deployment.wallet.balanceStatus", "ok");
  expectPresentString(payload, "deployment.wallet.address");
  expectPresentString(payload, "deployment.wallet.balanceEth");
  expectPresentString(payload, "deployment.wallet.minimumBalanceEth");

  console.log(`API health: HTTP ${response.status}`);
  console.log(`Chain ID: ${readPath(payload, "deployment.chainId")}`);
  console.log(`Wallet: ${readPath(payload, "deployment.wallet.address")}`);
  console.log(`Wallet balance: ${readPath(payload, "deployment.wallet.balanceEth")} ETH`);
  console.log(`Minimum balance: ${readPath(payload, "deployment.wallet.minimumBalanceEth")} ETH`);
}

console.log("");
if (process.exitCode) {
  console.log("Demo health check failed. Do not run a live public demo.");
} else {
  console.log("Demo health check passed.");
}
