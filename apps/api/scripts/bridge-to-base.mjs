import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const getConfig = (key) => process.env[key] || getEnv(key);

const mnemonic = getConfig('MINTING_MNEMONIC');
const amountArg = process.argv.find((arg) => arg.startsWith('--amount='));
const amountEth = amountArg ? amountArg.slice('--amount='.length) : '0.04';
const privateKey = getConfig('MINTING_PRIVATE_KEY') || getConfig('DEPLOYER_PRIVATE_KEY');
if (!mnemonic && !privateKey) {
  console.error('MINTING_MNEMONIC or DEPLOYER_PRIVATE_KEY not found in apps/api/.env.local');
  process.exit(1);
}

const rpcUrl = getConfig('SEPOLIA_RPC_URL') || 'https://ethereum-sepolia-rpc.publicnode.com';
const account = mnemonic ? mnemonicToAccount(mnemonic) : privateKeyToAccount(privateKey);

console.log(`Wallet: ${account.address}`);
console.log(`RPC: ${rpcUrl}`);

const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ chain: sepolia, transport, account });

// Check balance
const balance = await publicClient.getBalance({ address: account.address });
console.log(`Sepolia balance: ${Number(balance) / 1e18} ETH`);

if (balance < parseEther('0.01')) {
  console.error('Insufficient balance (need > 0.01 ETH)');
  process.exit(1);
}

// Bridge via Base L1 Standard Bridge
const BRIDGE_ADDRESS = '0xfd0Bf71F60660E2f608ed56e1659C450eB113120';
const bridgeAbi = [
  {
    inputs: [
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' }
    ],
    name: 'depositETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
];

const amount = parseEther(amountEth);
console.log(`\nBridging ${amountEth} ETH to Base Sepolia...`);

try {
  const hash = await walletClient.writeContract({
    address: BRIDGE_ADDRESS,
    abi: bridgeAbi,
    functionName: 'depositETH',
    args: [100000, '0x'],
    value: amount,
  });

  console.log(`TX sent: ${hash}`);
  console.log(`Etherscan: https://sepolia.etherscan.io/tx/${hash}`);

  console.log('Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  console.log(`\nETH should arrive on Base Sepolia in ~5-10 minutes.`);
  console.log(`Track: https://sepolia.basescan.org/address/${account.address}`);
} catch (err) {
  console.error('Bridge failed:', err.message || err);
  process.exit(1);
}
