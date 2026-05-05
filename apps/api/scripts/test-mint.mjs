#!/usr/bin/env node
/**
 * test-mint.mjs — Deploy a GalileoToken for a test product and verify it on-chain.
 *
 * Usage (from apps/api/ or project root):
 *   node apps/api/scripts/test-mint.mjs
 *   # or from apps/api/:
 *   node scripts/test-mint.mjs
 *
 * What this does:
 *   1. Reads MINTING_MNEMONIC or DEPLOYER_PRIVATE_KEY from apps/api/.env.local
 *   2. Deploys a fresh GalileoCompliance contract (each token needs its own)
 *   3. Predicts the token contract address using CREATE determinism (nonce-based)
 *   4. Transfers compliance ownership to the predicted token address
 *      (required: GalileoToken constructor calls compliance.bindToken(address(this)))
 *   5. Deploys GalileoToken — minting one product token to the deployer in the
 *      constructor (bypasses isVerified; no separate mint() call needed)
 *   6. Reads back: balanceOf, productDID, gtin, serialNumber, totalSupply
 *
 * The GalileoToken bytecode is loaded from contracts/out/GalileoToken.sol/GalileoToken.json.
 * Run `forge build` in contracts/ if the artifact is missing.
 *
 * Infrastructure addresses used:
 *   - identityRegistry from contracts/deployments/base-sepolia.json
 * A fresh GalileoCompliance is deployed per-token (the shared infra compliance at
 * 0x4Ae2336E70fc9765Ea0438Ae9563E204B0dF8D18 is already bound to the example token).
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  getContractAddress,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load env ──────────────────────────────────────────────────────────────────

const envPath = resolve(__dirname, '..', '.env.local');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error(`ERROR: Cannot read ${envPath}`);
  process.exit(1);
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const mnemonic = getEnv('MINTING_MNEMONIC');
const privateKey =
  getEnv('MINTING_PRIVATE_KEY') || getEnv('DEPLOYER_PRIVATE_KEY');
const rpcUrl =
  getEnv('BASE_SEPOLIA_RPC_URL') ||
  getEnv('BASE_SEPOLIA_RPC') ||
  'https://sepolia.base.org';

if (!mnemonic && !privateKey) {
  console.error('ERROR: MINTING_MNEMONIC or DEPLOYER_PRIVATE_KEY not found in apps/api/.env.local');
  process.exit(1);
}

// ── Load compiled bytecode from Foundry artifacts ─────────────────────────────

function loadBytecode(contractPath) {
  const artifactPath = resolve(__dirname, '..', '..', '..', 'contracts', 'out', contractPath);
  try {
    const content = readFileSync(artifactPath, 'utf-8');
    const artifact = JSON.parse(content);
    const hex = artifact?.bytecode?.object;
    if (!hex || hex === '0x') throw new Error('empty bytecode');
    return hex;
  } catch (err) {
    console.error(`ERROR: Cannot load bytecode from ${artifactPath}`);
    console.error('Run `forge build` in contracts/ to compile contracts.');
    console.error(err.message);
    process.exit(1);
  }
}

const galileoTokenBytecode = loadBytecode('GalileoToken.sol/GalileoToken.json');
const galileoComplianceBytecode = loadBytecode('GalileoCompliance.sol/GalileoCompliance.json');

// ── Infrastructure addresses ──────────────────────────────────────────────────

const manifestPath = resolve(__dirname, '..', '..', '..', 'contracts', 'deployments', 'base-sepolia.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const IDENTITY_REGISTRY = manifest.infrastructure.identityRegistry;

if (!/^0x[a-fA-F0-9]{40}$/.test(IDENTITY_REGISTRY ?? '')) {
  console.error(`ERROR: identityRegistry is missing or invalid in ${manifestPath}`);
  process.exit(1);
}

// ── Minimal ABIs ──────────────────────────────────────────────────────────────

const COMPLIANCE_ABI = parseAbi([
  'constructor(address admin_, address identityRegistry_)',
  'function transferOwnership(address newOwner)',
  'function getTokenBound() view returns (address)',
  'function owner() view returns (address)',
]);

const TOKEN_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'admin', type: 'address' },
      { name: 'identityRegistry_', type: 'address' },
      { name: 'compliance_', type: 'address' },
      {
        name: 'config',
        type: 'tuple',
        components: [
          { name: 'tokenName', type: 'string' },
          { name: 'tokenSymbol', type: 'string' },
          { name: 'productDID', type: 'string' },
          { name: 'productCategory', type: 'string' },
          { name: 'brandDID', type: 'string' },
          { name: 'productURI', type: 'string' },
          { name: 'gtin', type: 'string' },
          { name: 'serialNumber', type: 'string' },
        ],
      },
      { name: 'initialOwner_', type: 'address' },
    ],
  },
  ...parseAbi([
    'function balanceOf(address _userAddress) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function productDID() view returns (string)',
    'function gtin() view returns (string)',
    'function serialNumber() view returns (string)',
    'function productCategory() view returns (string)',
    'function brandDID() view returns (string)',
    'function paused() view returns (bool)',
    'function isDecommissioned() view returns (bool)',
    'function compliance() view returns (address)',
    'function identityRegistry() view returns (address)',
  ]),
];

// ── Set up clients ────────────────────────────────────────────────────────────

const account = mnemonic
  ? mnemonicToAccount(mnemonic)
  : privateKeyToAccount(privateKey);
const deployer = account.address;

const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain: baseSepolia, transport });
const walletClient = createWalletClient({ chain: baseSepolia, transport, account });

// ── Test product data ─────────────────────────────────────────────────────────

const TEST_GTIN = '09780306406157';          // valid 14-digit GTIN (check digit: 7)
const TEST_SERIAL = 'TEST-MINT-001';
const TEST_DID = `did:galileo:01:${TEST_GTIN}:21:${TEST_SERIAL}`;
const BRAND_DID = 'did:galileo:brand:test-brand';

const productConfig = {
  tokenName:       TEST_GTIN,
  tokenSymbol:     'GLXO',
  productDID:      TEST_DID,
  productCategory: 'TEST',
  brandDID:        BRAND_DID,
  productURI:      `https://id.galileoprotocol.io/01/${TEST_GTIN}/21/${TEST_SERIAL}`,
  gtin:            TEST_GTIN,
  serialNumber:    TEST_SERIAL,
};

// ── Retry helper ─────────────────────────────────────────────────────────────
// RPC nodes may take a few seconds to propagate state after a mined transaction.

async function retry(fn, retries = 5, delayMs = 2500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('  Galileo Protocol — Test Mint');
console.log('═'.repeat(60));
console.log(`  Deployer:     ${deployer}`);
console.log(`  Product DID:  ${TEST_DID}`);
console.log(`  GTIN:         ${TEST_GTIN}`);
console.log(`  Serial:       ${TEST_SERIAL}`);
console.log('═'.repeat(60) + '\n');

// ── Verify balance ────────────────────────────────────────────────────────────

const ethBalance = await publicClient.getBalance({ address: deployer });
console.log(`  Wallet balance: ${Number(ethBalance) / 1e18} ETH`);
if (ethBalance === 0n) {
  console.warn('  WARNING: wallet has 0 ETH — transactions will fail');
  console.warn('  Faucet: https://faucet.quicknode.com/base/sepolia');
}

// ── Get current nonce and predict addresses ───────────────────────────────────

const nonceN = await publicClient.getTransactionCount({ address: deployer });
console.log(`  Current nonce: ${nonceN}`);

// CREATE address = keccak256(rlp([sender, nonce]))[:20]
// Nonce N   → GalileoCompliance
// Nonce N+1 → transferOwnership (a CALL, not a CREATE — does not consume a CREATE nonce slot)
// Nonce N+2 → GalileoToken (N+2 because transferOwnership is a separate tx consuming nonce N+1)
const predictedComplianceAddr = getContractAddress({ from: deployer, nonce: BigInt(nonceN) });
const predictedTokenAddr = getContractAddress({ from: deployer, nonce: BigInt(nonceN + 2) });

console.log(`  Predicted compliance: ${predictedComplianceAddr}`);
console.log(`  Predicted token:      ${predictedTokenAddr}`);

// ── Step 1: Deploy GalileoCompliance ─────────────────────────────────────────

console.log('\n── Step 1: Deploy GalileoCompliance ────────────────────────');
process.stdout.write('  Deploying compliance contract ... ');

// Pass explicit nonces so predictions are accurate even if RPC lags.
const complianceDeployHash = await walletClient.deployContract({
  abi: COMPLIANCE_ABI,
  bytecode: galileoComplianceBytecode,
  args: [deployer, IDENTITY_REGISTRY],
  account,
  nonce: nonceN,
});

const complianceReceipt = await publicClient.waitForTransactionReceipt({
  hash: complianceDeployHash,
});

if (!complianceReceipt.contractAddress) {
  console.log('FAILED — no contractAddress in receipt');
  process.exit(1);
}

const actualComplianceAddr = complianceReceipt.contractAddress;
console.log(`OK\n  Deployed at: ${actualComplianceAddr}`);

if (actualComplianceAddr.toLowerCase() !== predictedComplianceAddr.toLowerCase()) {
  console.warn(`  WARNING: actual address differs from prediction.`);
  console.warn(`  Predicted: ${predictedComplianceAddr}`);
  console.warn(`  Actual:    ${actualComplianceAddr}`);
  console.warn('  This may cause the bindToken call to fail. Continuing anyway...');
}

// ── Step 2: Transfer compliance ownership to predicted token address ──────────

console.log('\n── Step 2: Transfer compliance ownership ───────────────────');
console.log(`  Transferring to predicted token: ${predictedTokenAddr}`);
process.stdout.write('  Sending transferOwnership ... ');

const transferHash = await walletClient.writeContract({
  address: actualComplianceAddr,
  abi: COMPLIANCE_ABI,
  functionName: 'transferOwnership',
  args: [predictedTokenAddr],
  account,
  nonce: nonceN + 1,
});

const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
if (transferReceipt.status === 'reverted') {
  console.log(`REVERTED (tx: ${transferHash})`);
  process.exit(1);
}
console.log(`OK (${transferHash.slice(0, 12)}...)`);

const complianceOwner = await retry(() => publicClient.readContract({
  address: actualComplianceAddr,
  abi: COMPLIANCE_ABI,
  functionName: 'owner',
}));
console.log(`  Compliance owner: ${complianceOwner}`);

// ── Step 3: Deploy GalileoToken ───────────────────────────────────────────────

console.log('\n── Step 3: Deploy GalileoToken ─────────────────────────────');
console.log('  Token constructor will call compliance.bindToken(address(this))');
console.log('  This succeeds because compliance.owner() == predictedTokenAddr');
process.stdout.write('  Deploying token ... ');

const tokenDeployHash = await walletClient.deployContract({
  abi: TOKEN_ABI,
  bytecode: galileoTokenBytecode,
  args: [
    deployer,           // admin
    IDENTITY_REGISTRY,  // identityRegistry_
    actualComplianceAddr, // compliance_
    productConfig,      // config (ProductConfig struct)
    deployer,           // initialOwner_ — receives the single minted token
  ],
  account,
  nonce: nonceN + 2,
});

const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenDeployHash });

if (!tokenReceipt.contractAddress) {
  console.log('FAILED — no contractAddress in receipt');
  console.log(`  Tx hash: ${tokenDeployHash}`);
  process.exit(1);
}

const tokenAddress = tokenReceipt.contractAddress;
console.log(`OK\n  Deployed at: ${tokenAddress}`);
console.log(`  Tx hash:     ${tokenDeployHash}`);

if (tokenAddress.toLowerCase() !== predictedTokenAddr.toLowerCase()) {
  console.warn(`  WARNING: actual address differs from prediction.`);
}

// ── Step 4: Verify on-chain ───────────────────────────────────────────────────

console.log('\n── Step 4: On-chain verification ───────────────────────────');

async function readTokenProp(functionName) {
  return retry(() => publicClient.readContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName,
    args: functionName === 'balanceOf' ? [deployer] : [],
  }));
}

const [balance, supply, productDid, gtin, serial, category, brandDid, isPaused, isDecomm, boundCompliance, boundRegistry] = await Promise.all([
  readTokenProp('balanceOf'),
  readTokenProp('totalSupply'),
  readTokenProp('productDID'),
  readTokenProp('gtin'),
  readTokenProp('serialNumber'),
  readTokenProp('productCategory'),
  readTokenProp('brandDID'),
  readTokenProp('paused'),
  readTokenProp('isDecommissioned'),
  readTokenProp('compliance'),
  readTokenProp('identityRegistry'),
]);

const tokenBound = await retry(() => publicClient.readContract({
  address: actualComplianceAddr,
  abi: parseAbi(['function getTokenBound() view returns (address)']),
  functionName: 'getTokenBound',
}));

console.log('\n  Token contract:');
console.log(`    Address:          ${tokenAddress}`);
console.log(`    balanceOf(deployer): ${balance}`);
console.log(`    totalSupply:      ${supply}`);
console.log(`    productDID:       ${productDid}`);
console.log(`    gtin:             ${gtin}`);
console.log(`    serialNumber:     ${serial}`);
console.log(`    productCategory:  ${category}`);
console.log(`    brandDID:         ${brandDid}`);
console.log(`    paused:           ${isPaused}`);
console.log(`    isDecommissioned: ${isDecomm}`);
console.log(`    compliance:       ${boundCompliance}`);
console.log(`    identityRegistry: ${boundRegistry}`);
console.log(`  Compliance.tokenBound: ${tokenBound}`);

const mintSuccess = balance === 1n && supply === 1n;
const complianceBound = tokenBound.toLowerCase() === tokenAddress.toLowerCase();

console.log('\n' + '═'.repeat(60));
console.log('  Result');
console.log('═'.repeat(60));
console.log(`  Mint successful:       ${mintSuccess ? 'YES ✓' : 'NO ✗'}`);
console.log(`  Compliance bound:      ${complianceBound ? 'YES ✓' : 'NO ✗'}`);
console.log(`  Token paused (normal): ${isPaused ? 'YES (expected — unpause with token.unpause() after setup)' : 'NO'}`);
console.log(`\n  Explorer: https://sepolia.basescan.org/address/${tokenAddress}`);
console.log('═'.repeat(60) + '\n');

if (!mintSuccess) {
  console.error('ERROR: Mint verification failed — deployer balance is not 1');
  process.exit(1);
}

console.log('  Success! GalileoToken deployed and verified on Base Sepolia.');
