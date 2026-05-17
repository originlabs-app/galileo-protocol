#!/usr/bin/env node
/**
 * Public-safe proof pack check for a shareable Galileo demo.
 *
 * Required env:
 *   DEMO_API_URL or STAGING_API_URL
 *   DEMO_DASHBOARD_URL
 *   DEMO_SCANNER_URL
 *   DEMO_DIGITAL_LINK
 *
 * Optional env:
 *   DEMO_TX_HASH
 *   DEMO_PROOF_PACK_OUT
 *
 * The script only reads public URLs and public chain identifiers. It never
 * reads local env files or wallet credentials.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASESCAN_BASE_URL = "https://sepolia.basescan.org";

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function normalizeRequiredUrl(value, label) {
  if (!value) {
    fail(`${label} is required.`);
    return null;
  }

  try {
    const url = new URL(value);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";
    if (url.protocol !== "https:" && !isLocalhost) {
      fail(`${label} must use HTTPS unless it targets localhost.`);
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    fail(`${label} is not a valid URL.`);
    return null;
  }
}

function getOrigin(url) {
  return new URL(url).origin;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function readPath(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return current[key];
    }
    return undefined;
  }, object);
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

function expectHeaderIncludes(response, headerName, expectedValue, context) {
  const actual = response.headers.get(headerName);
  if (!actual || !actual.toLowerCase().includes(expectedValue.toLowerCase())) {
    fail(`${context}: ${headerName} must include ${expectedValue}.`);
  }
}

function expectCorsOrigin(response, expectedOrigin, context) {
  const actual = response.headers.get("access-control-allow-origin");
  if (actual !== expectedOrigin && actual !== "*") {
    fail(
      `${context}: access-control-allow-origin expected ${expectedOrigin}, got ${String(actual)}.`,
    );
  }
}

function normalizeDigitalLinkPath(digitalLink) {
  try {
    const url = new URL(digitalLink);
    const match = url.pathname.match(/\/01\/\d+\/21\/[^/?#]+/i);
    if (!match) {
      fail("DEMO_DIGITAL_LINK must contain /01/{gtin}/21/{serial}.");
      return null;
    }
    return match[0];
  } catch {
    fail("DEMO_DIGITAL_LINK is not a valid URL.");
    return null;
  }
}

function readGitEvidence() {
  function readGit(args) {
    try {
      return execFileSync("git", args, { encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  }

  const remotesText = readGit(["remote", "-v"]) ?? "";
  const remotes = remotesText
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("(fetch)"))
    .map((line) => {
      const [name, url] = line.replace(/\s+\(fetch\)$/, "").split(/\s+/);
      return { name, url };
    });

  return {
    commit: readGit(["rev-parse", "--short=12", "HEAD"]),
    branch: readGit(["branch", "--show-current"]),
    remotes,
  };
}

console.log("");
console.log("Galileo public demo proof check");
console.log("================================");

const apiUrl = normalizeRequiredUrl(
  process.env.DEMO_API_URL ?? process.env.STAGING_API_URL,
  "DEMO_API_URL or STAGING_API_URL",
);
const dashboardUrl = normalizeRequiredUrl(
  process.env.DEMO_DASHBOARD_URL,
  "DEMO_DASHBOARD_URL",
);
const scannerUrl = normalizeRequiredUrl(
  process.env.DEMO_SCANNER_URL,
  "DEMO_SCANNER_URL",
);
const digitalLink = process.env.DEMO_DIGITAL_LINK;
const digitalLinkPath = digitalLink
  ? normalizeDigitalLinkPath(digitalLink)
  : (fail("DEMO_DIGITAL_LINK is required."), null);

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`ERROR: ${message}`);
  }
  process.exit(1);
}

const dashboardOrigin = getOrigin(dashboardUrl);
const scannerOrigin = getOrigin(scannerUrl);
const evidence = {
  checkedAt: new Date().toISOString(),
  apiUrl,
  dashboardUrl,
  scannerUrl,
  dashboardOrigin,
  scannerOrigin,
  digitalLink,
  scannerDeepLink: `${scannerUrl}/?link=${encodeURIComponent(digitalLink)}`,
  basescanTxUrl: null,
  health: null,
  resolver: null,
  git: readGitEvidence(),
};

try {
  const healthResponse = await fetchWithTimeout(`${apiUrl}/health`, {
    headers: { Accept: "application/json" },
  });
  if (!healthResponse.ok) {
    fail(`API health returned HTTP ${healthResponse.status}.`);
  } else {
    const health = await healthResponse.json();
    evidence.health = {
      status: health.status,
      chainId: readPath(health, "deployment.chainId"),
      writeEnabled: readPath(health, "deployment.writeEnabled"),
      walletAddress: readPath(health, "deployment.wallet.address"),
      walletBalanceStatus: readPath(health, "deployment.wallet.balanceStatus"),
      dependencies: health.dependencies,
    };

    expectEqual(health, "status", "ok");
    expectEqual(health, "dependencies.database", "ok");
    expectEqual(health, "dependencies.chain", "ok");
    expectEqual(health, "dependencies.wallet", "ok");
    expectEqual(health, "deployment.chainId", BASE_SEPOLIA_CHAIN_ID);
    expectEqual(health, "deployment.writeEnabled", true);
    expectEqual(health, "deployment.wallet.balanceStatus", "ok");
    expectPresentString(health, "deployment.wallet.address");
    expectPresentString(health, "deployment.wallet.balanceEth");
  }
} catch (error) {
  fail(`API health check failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const response = await fetchWithTimeout(`${apiUrl}/products`, {
    method: "OPTIONS",
    headers: {
      Origin: dashboardOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,x-galileo-client",
    },
  });
  if (response.status < 200 || response.status >= 300) {
    fail(`Dashboard CORS preflight returned HTTP ${response.status}.`);
  }
  expectCorsOrigin(response, dashboardOrigin, "Dashboard CORS preflight");
  expectHeaderIncludes(
    response,
    "access-control-allow-methods",
    "POST",
    "Dashboard CORS preflight",
  );
  expectHeaderIncludes(
    response,
    "access-control-allow-headers",
    "x-galileo-client",
    "Dashboard CORS preflight",
  );
  expectHeaderIncludes(
    response,
    "access-control-allow-headers",
    "content-type",
    "Dashboard CORS preflight",
  );
  expectHeaderIncludes(
    response,
    "access-control-allow-credentials",
    "true",
    "Dashboard CORS preflight",
  );
} catch (error) {
  fail(`Dashboard CORS check failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const resolverResponse = await fetchWithTimeout(`${apiUrl}${digitalLinkPath}`, {
    headers: {
      Accept: "application/ld+json, application/json",
      Origin: scannerOrigin,
    },
  });
  if (!resolverResponse.ok) {
    fail(`Resolver returned HTTP ${resolverResponse.status}.`);
  }
  expectCorsOrigin(resolverResponse, scannerOrigin, "Scanner resolver CORS");

  const resolverPayload = await resolverResponse.json();
  const txHash =
    resolverPayload?.passport?.txHash ??
    resolverPayload?.blockchain?.txHash ??
    process.env.DEMO_TX_HASH ??
    null;

  evidence.resolver = {
    id: resolverPayload?.["@id"] ?? null,
    name: resolverPayload?.name ?? null,
    status: resolverPayload?.status ?? null,
    chainId: resolverPayload?.passport?.chainId ?? null,
    txHash,
  };

  if (resolverPayload?.status !== "verified") {
    fail(`Resolver status expected verified, got ${String(resolverPayload?.status)}.`);
  }

  if (resolverPayload?.passport?.chainId !== BASE_SEPOLIA_CHAIN_ID) {
    fail(
      `Resolver passport.chainId expected ${BASE_SEPOLIA_CHAIN_ID}, got ${String(
        resolverPayload?.passport?.chainId,
      )}.`,
    );
  }

  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    fail("A valid Base Sepolia transaction hash is required.");
  } else {
    evidence.basescanTxUrl = `${BASESCAN_BASE_URL}/tx/${txHash}`;
  }
} catch (error) {
  fail(`Resolver check failed: ${error instanceof Error ? error.message : String(error)}`);
}

for (const [label, url] of [
  ["Dashboard", dashboardUrl],
  ["Scanner", evidence.scannerDeepLink],
]) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { Accept: "text/html" },
    });
    if (!response.ok) {
      fail(`${label} returned HTTP ${response.status}.`);
    }
  } catch (error) {
    fail(`${label} check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!evidence.git.commit) {
  warn("Git commit evidence could not be read.");
}

if (process.env.DEMO_PROOF_PACK_OUT) {
  mkdirSync(dirname(process.env.DEMO_PROOF_PACK_OUT), { recursive: true });
  writeFileSync(
    process.env.DEMO_PROOF_PACK_OUT,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
}

for (const message of warnings) {
  console.warn(`WARN: ${message}`);
}

if (failures.length > 0) {
  console.error("");
  console.error("Public demo proof check failed:");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`API: ${apiUrl}`);
console.log(`Dashboard CORS origin: ${dashboardOrigin}`);
console.log(`Scanner: ${evidence.scannerDeepLink}`);
console.log(`Resolver: ${digitalLink}`);
console.log(`Base Sepolia tx: ${evidence.basescanTxUrl}`);
console.log(`Git: ${evidence.git.branch ?? "unknown"} @ ${evidence.git.commit ?? "unknown"}`);
if (process.env.DEMO_PROOF_PACK_OUT) {
  console.log(`Proof evidence JSON: ${process.env.DEMO_PROOF_PACK_OUT}`);
}
console.log("");
console.log("Public demo proof check passed.");
