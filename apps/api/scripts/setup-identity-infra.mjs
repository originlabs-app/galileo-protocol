#!/usr/bin/env node
/**
 * setup-identity-infra.mjs — Wire the on-chain ERC-3643 identity infrastructure.
 *
 * Usage (from apps/api/ or project root via pnpm):
 *   node apps/api/scripts/setup-identity-infra.mjs
 *   # or from apps/api/:
 *   node scripts/setup-identity-infra.mjs
 *
 * What this does (idempotent — skips already-done steps):
 *   1. Adds claim topics to GalileoClaimTopicsRegistry
 *      (KYC_BASIC, AUTHENTICATOR, AUTHORIZED_RETAILER)
 *   2. Registers the deployer wallet as a trusted claim issuer in
 *      GalileoTrustedIssuersRegistry for all three topics
 *   3. Verifies GalileoIdentityRegistry is bound to IdentityRegistryStorage
 *   4. Grants AGENT_ROLE to deployer on IdentityRegistry (if not already set)
 *   5. Registers the deployer wallet identity in GalileoIdentityRegistry
 *      (uses deployer address as the IIdentity placeholder — sufficient for
 *       zero-topic isVerified checks and constructor-path minting)
 *   6. Reads back every registration and prints a verification summary
 *
 * Prerequisites:
 *   - apps/api/.env.local with MINTING_MNEMONIC or DEPLOYER_PRIVATE_KEY
 *   - BASE_SEPOLIA_RPC_URL or BASE_SEPOLIA_RPC configured for authenticated RPC
 *   - Contracts deployed (addresses from contracts/deployments/base-sepolia.json)
 *   - Deployer wallet funded with Base Sepolia ETH (use faucet.quicknode.com/base/sepolia)
 */

import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toBytes } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..', '..', '..');

// ── Load env ──────────────────────────────────────────────────────────────────

const envPath = resolve(__dirname, '..', '.env.local');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error(`ERROR: Cannot read ${envPath}`);
  console.error('Copy apps/api/.env.example → apps/api/.env.local and fill in values.');
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

// ── Contract addresses (from contracts/deployments/base-sepolia.json) ─────────

const manifestPath = resolve(rootDir, 'contracts/deployments/base-sepolia.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const ADDRESSES = {
  claimTopicsRegistry: manifest.infrastructure.claimTopicsRegistry,
  trustedIssuersRegistry: manifest.infrastructure.trustedIssuersRegistry,
  identityRegistryStorage: manifest.infrastructure.identityRegistryStorage,
  identityRegistry: manifest.infrastructure.identityRegistry,
};

for (const [name, address] of Object.entries(ADDRESSES)) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address ?? '')) {
    console.error(`ERROR: ${name} is missing or invalid in ${manifestPath}`);
    process.exit(1);
  }
}

// ── Claim topic IDs (keccak256 of namespace strings, from GalileoClaimTopics) ─

const CLAIM_TOPICS = {
  KYC_BASIC:           BigInt('0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0'),
  AUTHENTICATOR:       BigInt('0xda684ab89dbe929e1da9afb6a82d42762bb88db87f85e2041b5a2867ec6a6767'),
  AUTHORIZED_RETAILER: BigInt('0xfc1ed2540d1f8160d9b67d6e66b3e918d6029031f419be09f5e5865c2a74c75a'),
};

// ── Role constants ────────────────────────────────────────────────────────────

const AGENT_ROLE = keccak256(toBytes('AGENT_ROLE'));
const REGISTRY_ADMIN_ROLE = keccak256(toBytes('REGISTRY_ADMIN_ROLE'));

// ── Minimal ABIs ──────────────────────────────────────────────────────────────

const CTR_ABI = parseAbi([
  'function getClaimTopics() view returns (uint256[])',
  'function addClaimTopic(uint256 _claimTopic)',
]);

const TIR_ABI = parseAbi([
  'function isTrustedIssuer(address _issuer) view returns (bool)',
  'function getTrustedIssuers() view returns (address[])',
  'function getTrustedIssuerClaimTopics(address _trustedIssuer) view returns (uint256[])',
  'function addTrustedIssuer(address _trustedIssuer, uint256[] calldata _claimTopics)',
]);

const IRS_ABI = parseAbi([
  'function isRegistryBound(address _identityRegistry) view returns (bool)',
  'function linkedIdentityRegistries() view returns (address[])',
]);

const IR_ABI = parseAbi([
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
  'function contains(address _userAddress) view returns (bool)',
  'function registerIdentity(address _userAddress, address _identity, uint16 _country)',
  'function identity(address _userAddress) view returns (address)',
  'function isVerified(address _userAddress) view returns (bool)',
]);

// ── Set up clients ────────────────────────────────────────────────────────────

const account = mnemonic
  ? mnemonicToAccount(mnemonic)
  : privateKeyToAccount(privateKey);
const deployer = account.address;

const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain: baseSepolia, transport });
const walletClient = createWalletClient({ chain: baseSepolia, transport, account });

console.log('\n' + '═'.repeat(60));
console.log('  Galileo Protocol — Identity Infrastructure Setup');
console.log('═'.repeat(60));
console.log(`  Deployer:  ${deployer}`);
console.log(`  RPC:       ${rpcUrl}`);
console.log(`  Chain ID:  84532 (Base Sepolia)`);
console.log('═'.repeat(60) + '\n');

// ── Helper: send tx and wait for receipt ──────────────────────────────────────

async function sendTx(description, contractAddress, abi, functionName, args) {
  process.stdout.write(`  [TX] ${description} ... `);
  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi,
      functionName,
      args,
      account,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'reverted') {
      console.log(`REVERTED (tx: ${hash})`);
      return false;
    }
    console.log(`OK (${hash.slice(0, 12)}...)`);
    return true;
  } catch (err) {
    console.log(`ERROR: ${err.shortMessage ?? err.message}`);
    return false;
  }
}

// ── Step 1: Claim Topics Registry ─────────────────────────────────────────────

console.log('── Step 1: GalileoClaimTopicsRegistry ──────────────────────');
const existingTopics = await publicClient.readContract({
  address: ADDRESSES.claimTopicsRegistry,
  abi: CTR_ABI,
  functionName: 'getClaimTopics',
});
console.log(`  Current topics: [${existingTopics.map(t => '0x' + t.toString(16).slice(0, 8) + '...').join(', ')}]`);

for (const [name, topicId] of Object.entries(CLAIM_TOPICS)) {
  const alreadyRegistered = existingTopics.some(t => t === topicId);
  if (alreadyRegistered) {
    console.log(`  [SKIP] ${name} already registered`);
  } else {
    await sendTx(`Add topic ${name}`, ADDRESSES.claimTopicsRegistry, CTR_ABI, 'addClaimTopic', [topicId]);
  }
}

// ── Step 2: Trusted Issuers Registry ─────────────────────────────────────────

console.log('\n── Step 2: GalileoTrustedIssuersRegistry ───────────────────');
const isRegistered = await publicClient.readContract({
  address: ADDRESSES.trustedIssuersRegistry,
  abi: TIR_ABI,
  functionName: 'isTrustedIssuer',
  args: [deployer],
});

if (isRegistered) {
  const currentTopics = await publicClient.readContract({
    address: ADDRESSES.trustedIssuersRegistry,
    abi: TIR_ABI,
    functionName: 'getTrustedIssuerClaimTopics',
    args: [deployer],
  });
  console.log(`  [SKIP] Deployer already registered as trusted issuer`);
  console.log(`  Topics: [${currentTopics.map(t => '0x' + t.toString(16).slice(0, 8) + '...').join(', ')}]`);
} else {
  const claimTopicValues = Object.values(CLAIM_TOPICS);
  await sendTx(
    'Register deployer as trusted issuer (KYC_BASIC, AUTHENTICATOR, AUTHORIZED_RETAILER)',
    ADDRESSES.trustedIssuersRegistry,
    TIR_ABI,
    'addTrustedIssuer',
    [deployer, claimTopicValues],
  );
}

// ── Step 3: Verify IdentityRegistry ↔ IdentityRegistryStorage binding ────────

console.log('\n── Step 3: IdentityRegistryStorage binding ─────────────────');
const isBound = await publicClient.readContract({
  address: ADDRESSES.identityRegistryStorage,
  abi: IRS_ABI,
  functionName: 'isRegistryBound',
  args: [ADDRESSES.identityRegistry],
});
if (isBound) {
  console.log('  [OK]   IdentityRegistry is bound to IdentityRegistryStorage');
} else {
  console.log('  [WARN] IdentityRegistry is NOT bound — this should have been done at deploy time');
  console.log('         If you have REGISTRY_ADMIN_ROLE on IdentityRegistryStorage, run bindIdentityRegistry manually.');
}

// ── Step 4: Grant AGENT_ROLE on IdentityRegistry to deployer ─────────────────

console.log('\n── Step 4: AGENT_ROLE on GalileoIdentityRegistry ───────────');
const hasAgentRole = await publicClient.readContract({
  address: ADDRESSES.identityRegistry,
  abi: IR_ABI,
  functionName: 'hasRole',
  args: [AGENT_ROLE, deployer],
});

if (hasAgentRole) {
  console.log(`  [SKIP] Deployer already has AGENT_ROLE on IdentityRegistry`);
} else {
  await sendTx(
    'Grant AGENT_ROLE to deployer on IdentityRegistry',
    ADDRESSES.identityRegistry,
    IR_ABI,
    'grantRole',
    [AGENT_ROLE, deployer],
  );
}

// ── Step 5: Register deployer identity ───────────────────────────────────────

console.log('\n── Step 5: Register deployer identity ──────────────────────');
const isContained = await publicClient.readContract({
  address: ADDRESSES.identityRegistry,
  abi: IR_ABI,
  functionName: 'contains',
  args: [deployer],
});

if (isContained) {
  const storedIdentity = await publicClient.readContract({
    address: ADDRESSES.identityRegistry,
    abi: IR_ABI,
    functionName: 'identity',
    args: [deployer],
  });
  console.log(`  [SKIP] Deployer already registered. Identity contract: ${storedIdentity}`);
} else {
  // Register deployer address as both the wallet and the identity placeholder.
  // NOTE: This is an EOA-as-IIdentity workaround for testing.
  // In production, deploy a real OnchainID identity contract and use that address.
  // Country code 840 = United States (ISO 3166-1 numeric)
  await sendTx(
    'Register deployer identity (EOA placeholder, country=840/US)',
    ADDRESSES.identityRegistry,
    IR_ABI,
    'registerIdentity',
    [deployer, deployer, 840],
  );
}

// ── Step 6: Verification summary ─────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('  Verification Summary');
console.log('═'.repeat(60));

const finalTopics = await publicClient.readContract({
  address: ADDRESSES.claimTopicsRegistry,
  abi: CTR_ABI,
  functionName: 'getClaimTopics',
});
console.log(`\n  CTR topics registered: ${finalTopics.length}`);
for (const topicId of finalTopics) {
  const name = Object.entries(CLAIM_TOPICS).find(([, v]) => v === topicId)?.[0] ?? 'unknown';
  console.log(`    ${name}: 0x${topicId.toString(16).slice(0, 16)}...`);
}

const finalIsTrusted = await publicClient.readContract({
  address: ADDRESSES.trustedIssuersRegistry,
  abi: TIR_ABI,
  functionName: 'isTrustedIssuer',
  args: [deployer],
});
console.log(`\n  TIR: deployer is trusted issuer: ${finalIsTrusted ? 'YES ✓' : 'NO ✗'}`);

const finalIsBound = await publicClient.readContract({
  address: ADDRESSES.identityRegistryStorage,
  abi: IRS_ABI,
  functionName: 'isRegistryBound',
  args: [ADDRESSES.identityRegistry],
});
console.log(`  IRS: IdentityRegistry bound:     ${finalIsBound ? 'YES ✓' : 'NO ✗'}`);

// Retry contains with a short delay to tolerate RPC propagation lag
async function readWithRetry(fn, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

const finalContains = await readWithRetry(() => publicClient.readContract({
  address: ADDRESSES.identityRegistry,
  abi: IR_ABI,
  functionName: 'contains',
  args: [deployer],
}));
console.log(`  IR:  deployer identity registered: ${finalContains ? 'YES ✓' : 'NO ✗ (may be RPC propagation lag — rerun to verify)'}`);

// isVerified reverts when the identity is an EOA and CTR has required topics,
// because the contract calls userIdentity.getClaim(...) which fails on an EOA.
let finalIsVerified = false;
try {
  finalIsVerified = await publicClient.readContract({
    address: ADDRESSES.identityRegistry,
    abi: IR_ABI,
    functionName: 'isVerified',
    args: [deployer],
  });
  console.log(`  IR:  deployer isVerified:          ${finalIsVerified ? 'YES ✓' : 'NO ✗'}`);
} catch {
  console.log(`  IR:  deployer isVerified:          REVERTS (expected — EOA identity cannot satisfy ERC-735 claim checks)`);
}

console.log('\n' + '═'.repeat(60));
console.log('  Infrastructure setup complete.');
console.log('  NOTE: isVerified reverts/false when using an EOA as identity.');
console.log('  For full transfer functionality, deploy a real OnchainID contract');
console.log('  (see https://docs.onchainid.com) and register it in the IR.');
console.log('  Constructor-path minting (test-mint.mjs) works without isVerified.');
console.log('═'.repeat(60) + '\n');
