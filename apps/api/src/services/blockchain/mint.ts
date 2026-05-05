/**
 * Minting service: deploys a per-product GalileoCompliance then GalileoToken
 * on Base Sepolia using a 3-step flow that matches the working test-mint.mjs pattern.
 *
 * Each product is issued as its own GalileoToken (per-product-token model).
 * The GalileoToken constructor mints the single token to initialOwner and calls
 * compliance.bindToken(address(this)) — which requires compliance.owner() to be
 * the predicted token address at deploy time.
 *
 * Steps:
 *   1. Deploy GalileoCompliance at nonce N
 *   2. Call compliance.transferOwnership(predictedTokenAddr) at nonce N+1
 *   3. Deploy GalileoToken at nonce N+2 with the actual compliance address
 *
 * Bytecodes are loaded from Foundry compilation artifacts.
 * Run `forge build` in contracts/ if artifacts are missing.
 *
 * For unit tests, pass `bytecodeOverrides` to inject compiled bytecode
 * directly instead of loading from the filesystem.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getContractAddress } from "viem";
import { GALILEO_TOKEN_ABI, GALILEO_COMPLIANCE_ABI } from "./abi.js";
import {
  GALILEO_COMPLIANCE_BYTECODE,
  GALILEO_TOKEN_BYTECODE,
} from "./bytecode.js";
import { BASE_SEPOLIA_CHAIN_ID } from "./chain.js";
import type { MintParams, MintResult } from "./types.js";

/**
 * Attempts to load compiled bytecode from a Foundry artifact.
 * Returns null if the artifact file is not found or malformed.
 */
function loadBytecode(contractPath: string): `0x${string}` | null {
  try {
    const artifactUrl = new URL(
      `../../../../../../contracts/out/${contractPath}`,
      import.meta.url,
    );
    const content = readFileSync(fileURLToPath(artifactUrl), "utf8");
    const artifact = JSON.parse(content) as {
      bytecode?: { object?: string };
    };
    const hex = artifact?.bytecode?.object;
    if (!hex || hex === "0x") return null;
    return hex as `0x${string}`;
  } catch {
    return null;
  }
}

function getEmbeddedBytecode(contractPath: string): `0x${string}` | null {
  if (contractPath === "GalileoCompliance.sol/GalileoCompliance.json") {
    return GALILEO_COMPLIANCE_BYTECODE;
  }
  if (contractPath === "GalileoToken.sol/GalileoToken.json") {
    return GALILEO_TOKEN_BYTECODE;
  }
  return null;
}

/**
 * Deploy a GalileoCompliance + GalileoToken for one product on Base Sepolia.
 *
 * The 3-step flow ensures compliance.bindToken(address(this)) succeeds in the
 * token constructor by pre-transferring compliance ownership to the predicted
 * token address before deploying the token.
 *
 * @param walletClient       Viem wallet client (with account) for signing txs
 * @param publicClient       Viem public client for reading receipts and nonce
 * @param params             Product metadata and infrastructure addresses
 * @param bytecodeOverrides  Optional bytecodes for testing (omit in production)
 * @returns MintResult with txHash (token deploy), tokenAddress, complianceAddress, chainId
 */
export async function mintProduct(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
  params: MintParams,
  bytecodeOverrides?: { token?: `0x${string}`; compliance?: `0x${string}` },
): Promise<MintResult> {
  const complianceBytecode =
    bytecodeOverrides?.compliance ??
    getEmbeddedBytecode("GalileoCompliance.sol/GalileoCompliance.json") ??
    loadBytecode("GalileoCompliance.sol/GalileoCompliance.json");

  if (!complianceBytecode) {
    throw new Error(
      "GalileoCompliance bytecode not found. Run `forge build` in the contracts/ directory to compile.",
    );
  }

  const tokenBytecode =
    bytecodeOverrides?.token ??
    getEmbeddedBytecode("GalileoToken.sol/GalileoToken.json") ??
    loadBytecode("GalileoToken.sol/GalileoToken.json");

  if (!tokenBytecode) {
    throw new Error(
      "GalileoToken bytecode not found. Run `forge build` in the contracts/ directory to compile.",
    );
  }

  const deployerAddress = walletClient.account.address as `0x${string}`;

  // Get current nonce so we can predict the token CREATE address.
  // We use explicit nonces on each tx to remain correct even when RPC state
  // lags slightly behind local state.
  const currentNonce: number = await publicClient.getTransactionCount({
    address: deployerAddress,
  });

  // Predict addresses using CREATE determinism:
  //   nonce N   → GalileoCompliance  (CREATE)
  //   nonce N+1 → transferOwnership  (CALL — does not advance CREATE nonce)
  //   nonce N+2 → GalileoToken       (CREATE)
  const predictedTokenAddr = getContractAddress({
    from: deployerAddress,
    nonce: BigInt(currentNonce + 2),
  });

  // ── Step 1: Deploy GalileoCompliance ───────────────────────────────────────
  const complianceDeployHash: `0x${string}` = await walletClient.deployContract(
    {
      abi: GALILEO_COMPLIANCE_ABI,
      bytecode: complianceBytecode,
      args: [deployerAddress, params.identityRegistry],
      nonce: currentNonce,
    },
  );

  const complianceReceipt = await publicClient.waitForTransactionReceipt({
    hash: complianceDeployHash,
  });

  if (!complianceReceipt.contractAddress) {
    throw new Error(
      `GalileoCompliance deployment receipt for tx ${complianceDeployHash} is missing contractAddress`,
    );
  }

  const complianceAddress =
    complianceReceipt.contractAddress as `0x${string}`;

  // ── Step 2: Transfer compliance ownership to predicted token address ────────
  // The GalileoToken constructor calls compliance.bindToken(address(this)).
  // bindToken requires compliance.owner() == address(this) == predictedTokenAddr.
  const transferHash: `0x${string}` = await walletClient.writeContract({
    address: complianceAddress,
    abi: GALILEO_COMPLIANCE_ABI,
    functionName: "transferOwnership",
    args: [predictedTokenAddr],
    nonce: currentNonce + 1,
  });

  await publicClient.waitForTransactionReceipt({ hash: transferHash });

  // ── Step 3: Deploy GalileoToken ────────────────────────────────────────────
  const config = {
    tokenName: params.gtin,
    tokenSymbol: "GLXO",
    productDID: params.productDID,
    productCategory: params.productCategory,
    brandDID: params.brandDID,
    productURI: params.productURI,
    gtin: params.gtin,
    serialNumber: params.serialNumber,
  };

  const tokenDeployHash: `0x${string}` = await walletClient.deployContract({
    abi: GALILEO_TOKEN_ABI,
    bytecode: tokenBytecode,
    args: [
      params.admin,
      params.identityRegistry,
      complianceAddress,
      config,
      params.initialOwner,
    ],
    nonce: currentNonce + 2,
  });

  const tokenReceipt = await publicClient.waitForTransactionReceipt({
    hash: tokenDeployHash,
  });

  if (!tokenReceipt.contractAddress) {
    throw new Error(
      `GalileoToken deployment receipt for tx ${tokenDeployHash} is missing contractAddress`,
    );
  }

  return {
    txHash: tokenDeployHash,
    tokenAddress: tokenReceipt.contractAddress as `0x${string}`,
    complianceAddress,
    chainId: BASE_SEPOLIA_CHAIN_ID,
  };
}
