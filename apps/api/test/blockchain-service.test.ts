/**
 * Unit tests for the blockchain service layer.
 *
 * All viem calls are mocked — no real RPC connections are made.
 * The suite covers:
 *   1. mintProduct — success flow (3 steps: compliance deploy, transfer, token deploy)
 *   2. mintProduct — correct constructor args for both deployContract calls
 *   3. mintProduct — throws when bytecode is missing (no forge build)
 *   4. mintProduct — propagates walletClient.deployContract error (step 1)
 *   5. mintProduct — throws when compliance receipt has no contractAddress
 *   6. mintProduct — throws when token receipt has no contractAddress
 *   7. verifyOnChain — success: returns on-chain data
 *   8. verifyOnChain — returns {found:false} when readContract throws
 *   9. getWalletClient — returns null when no private key is configured
 *  10. isBlockchainWriteConfigured — false when env vars are absent
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Constants used across mocks and tests ─────────────────────────────────────

const FAKE_COMPLIANCE_ADDRESS =
  "0xComplianceComplianceComplianceComplia00" as `0x${string}`;
const FAKE_TOKEN_ADDRESS =
  "0xTokenTokenTokenTokenTokenTokenTokenToken00" as `0x${string}`;
const FAKE_PREDICTED_TOKEN =
  "0xPredictedPredictedPredictedPredictedPr00" as `0x${string}`;
const FAKE_TX_HASH =
  "0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899" as `0x${string}`;

// ── Mock viem before any service imports ──────────────────────────────────────
vi.mock("viem", () => ({
  createPublicClient: vi.fn(),
  createWalletClient: vi.fn(),
  http: vi.fn(() => "mock-transport"),
  getContractAddress: vi.fn(() => FAKE_PREDICTED_TOKEN),
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: "0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef",
  })),
  mnemonicToAccount: vi.fn(() => ({
    address: "0xMnemonicMnemonicMnemonicMnemonicMnemonic00",
  })),
}));

vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

// Import services AFTER mocks are registered
import { mintProduct } from "../src/services/blockchain/mint.js";
import { verifyOnChain } from "../src/services/blockchain/verify.js";
import {
  getWalletClient,
  isBlockchainWriteConfigured,
} from "../src/services/blockchain/client.js";
import { getBaseSepoliaRpcUrl } from "../src/services/blockchain/chain.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_COMPLIANCE_BYTECODE = "0x60806040" as `0x${string}`;
const FAKE_TOKEN_BYTECODE = "0x608060" as `0x${string}`;

const MINT_PARAMS = {
  admin: "0xAdminAdminAdminAdminAdminAdminAdminAdmin00" as `0x${string}`,
  identityRegistry: "0xRegRegRegRegRegRegRegRegRegRegRegRegReg00" as `0x${string}`,
  productDID: "did:galileo:01:40063813339310:21:SN-001",
  productCategory: "Watches",
  brandDID: "did:galileo:brand:test-brand",
  productURI: "https://galileo.test/01/4006381333931/21/SN-001",
  gtin: "40063813339310",
  serialNumber: "SN-001",
  initialOwner: "0xOwnerOwnerOwnerOwnerOwnerOwnerOwnerOwner00" as `0x${string}`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a mock walletClient with deployContract (used for both compliance
 * and token deploys) and writeContract (used for transferOwnership).
 */
function makeMockWalletClient(
  deployError?: Error,
) {
  return {
    account: {
      address: "0xDeployerDeployerDeployerDeployerDeployerD0" as `0x${string}`,
    },
    deployContract: vi.fn(async () => {
      if (deployError) throw deployError;
      return FAKE_TX_HASH;
    }),
    writeContract: vi.fn(async () => FAKE_TX_HASH),
  };
}

/**
 * Creates a mock publicClient that sequences 3 receipts through
 * waitForTransactionReceipt:
 *   1st call → compliance deploy receipt
 *   2nd call → transferOwnership receipt (no contractAddress, just success)
 *   3rd call → token deploy receipt
 */
function makeMockPublicClient(options?: {
  complianceAddress?: `0x${string}` | null;
  tokenAddress?: `0x${string}` | null;
  readContractImpl?: (args: { functionName: string }) => unknown;
}) {
  const complianceAddr =
    options?.complianceAddress === undefined
      ? FAKE_COMPLIANCE_ADDRESS
      : options.complianceAddress;
  const tokenAddr =
    options?.tokenAddress === undefined
      ? FAKE_TOKEN_ADDRESS
      : options.tokenAddress;

  return {
    getTransactionCount: vi.fn().mockResolvedValue(5),
    waitForTransactionReceipt: vi
      .fn()
      .mockResolvedValueOnce({ contractAddress: complianceAddr }) // compliance deploy
      .mockResolvedValueOnce({ status: "success" })               // transferOwnership
      .mockResolvedValueOnce({ contractAddress: tokenAddr }),      // token deploy
    readContract: vi.fn(async (args: { functionName: string }) => {
      if (options?.readContractImpl) return options.readContractImpl(args);
      const defaults: Record<string, unknown> = {
        productDID: "did:galileo:01:40063813339310:21:SN-001",
        gtin: "40063813339310",
        serialNumber: "SN-001",
        productCategory: "Watches",
        isDecommissioned: false,
      };
      return defaults[args.functionName] ?? null;
    }),
  };
}

// ── Tests: mintProduct ────────────────────────────────────────────────────────

describe("mintProduct", () => {
  it("deploys GalileoCompliance + GalileoToken and returns txHash, tokenAddress, complianceAddress, chainId", async () => {
    const walletClient = makeMockWalletClient();
    const publicClient = makeMockPublicClient();

    const result = await mintProduct(
      walletClient,
      publicClient,
      MINT_PARAMS,
      { token: FAKE_TOKEN_BYTECODE, compliance: FAKE_COMPLIANCE_BYTECODE },
    );

    expect(result.txHash).toBe(FAKE_TX_HASH);
    expect(result.tokenAddress).toBe(FAKE_TOKEN_ADDRESS);
    expect(result.complianceAddress).toBe(FAKE_COMPLIANCE_ADDRESS);
    expect(result.chainId).toBe(84532);
  });

  it("calls deployContract twice (compliance then token) with correct args", async () => {
    const walletClient = makeMockWalletClient();
    const publicClient = makeMockPublicClient();

    await mintProduct(
      walletClient,
      publicClient,
      MINT_PARAMS,
      { token: FAKE_TOKEN_BYTECODE, compliance: FAKE_COMPLIANCE_BYTECODE },
    );

    expect(walletClient.deployContract).toHaveBeenCalledTimes(2);

    // ── 1st call: GalileoCompliance ──────────────────────────────────────────
    const complianceCall = walletClient.deployContract.mock.calls[0]![0] as {
      bytecode: string;
      args: unknown[];
      nonce: number;
    };
    expect(complianceCall.bytecode).toBe(FAKE_COMPLIANCE_BYTECODE);
    // args: [admin (deployer), identityRegistry]
    const [complianceAdmin, complianceRegistry] = complianceCall.args as [
      string,
      string,
    ];
    expect(complianceAdmin).toBe(walletClient.account.address);
    expect(complianceRegistry).toBe(MINT_PARAMS.identityRegistry);
    expect(complianceCall.nonce).toBe(5); // currentNonce

    // ── 2nd call: GalileoToken ───────────────────────────────────────────────
    const tokenCall = walletClient.deployContract.mock.calls[1]![0] as {
      bytecode: string;
      args: unknown[];
      nonce: number;
    };
    expect(tokenCall.bytecode).toBe(FAKE_TOKEN_BYTECODE);
    // args: [admin, identityRegistry, complianceAddress (from receipt), config, initialOwner]
    const [admin, identityRegistry, complianceAddr, config, initialOwner] =
      tokenCall.args as [string, string, string, Record<string, string>, string];
    expect(admin).toBe(MINT_PARAMS.admin);
    expect(identityRegistry).toBe(MINT_PARAMS.identityRegistry);
    expect(complianceAddr).toBe(FAKE_COMPLIANCE_ADDRESS); // actual addr from receipt
    expect(config.productDID).toBe(MINT_PARAMS.productDID);
    expect(config.gtin).toBe(MINT_PARAMS.gtin);
    expect(config.serialNumber).toBe(MINT_PARAMS.serialNumber);
    expect(initialOwner).toBe(MINT_PARAMS.initialOwner);
    expect(tokenCall.nonce).toBe(7); // currentNonce + 2
  });

  it("calls writeContract for transferOwnership with predicted token address", async () => {
    const walletClient = makeMockWalletClient();
    const publicClient = makeMockPublicClient();

    await mintProduct(
      walletClient,
      publicClient,
      MINT_PARAMS,
      { token: FAKE_TOKEN_BYTECODE, compliance: FAKE_COMPLIANCE_BYTECODE },
    );

    expect(walletClient.writeContract).toHaveBeenCalledOnce();
    const call = walletClient.writeContract.mock.calls[0]![0] as {
      address: string;
      functionName: string;
      args: unknown[];
      nonce: number;
    };
    expect(call.address).toBe(FAKE_COMPLIANCE_ADDRESS); // from compliance deploy receipt
    expect(call.functionName).toBe("transferOwnership");
    expect(call.args[0]).toBe(FAKE_PREDICTED_TOKEN); // from getContractAddress mock
    expect(call.nonce).toBe(6); // currentNonce + 1
  });

  it("uses embedded bytecode when no test bytecode overrides are provided", async () => {
    const walletClient = makeMockWalletClient();
    const publicClient = makeMockPublicClient();

    await mintProduct(walletClient, publicClient, MINT_PARAMS);

    expect(walletClient.deployContract).toHaveBeenCalledTimes(2);
    const complianceCall = walletClient.deployContract.mock.calls[0]![0] as {
      bytecode: string;
    };
    const tokenCall = walletClient.deployContract.mock.calls[1]![0] as {
      bytecode: string;
    };
    expect(complianceCall.bytecode).toMatch(/^0x[0-9a-f]+$/i);
    expect(tokenCall.bytecode).toMatch(/^0x[0-9a-f]+$/i);
  });

  it("propagates errors thrown by walletClient.deployContract on compliance step", async () => {
    const walletClient = makeMockWalletClient(
      new Error("insufficient funds for gas"),
    );
    const publicClient = makeMockPublicClient();

    await expect(
      mintProduct(walletClient, publicClient, MINT_PARAMS, {
        token: FAKE_TOKEN_BYTECODE,
        compliance: FAKE_COMPLIANCE_BYTECODE,
      }),
    ).rejects.toThrow("insufficient funds for gas");
  });

  it("throws when the compliance deployment receipt has no contractAddress", async () => {
    const walletClient = makeMockWalletClient();
    const publicClient = makeMockPublicClient({ complianceAddress: null });

    await expect(
      mintProduct(walletClient, publicClient, MINT_PARAMS, {
        token: FAKE_TOKEN_BYTECODE,
        compliance: FAKE_COMPLIANCE_BYTECODE,
      }),
    ).rejects.toThrow(/GalileoCompliance.*missing contractAddress/i);
  });

  it("throws when the token deployment receipt has no contractAddress", async () => {
    const walletClient = makeMockWalletClient();
    const publicClient = makeMockPublicClient({ tokenAddress: null });

    await expect(
      mintProduct(walletClient, publicClient, MINT_PARAMS, {
        token: FAKE_TOKEN_BYTECODE,
        compliance: FAKE_COMPLIANCE_BYTECODE,
      }),
    ).rejects.toThrow(/GalileoToken.*missing contractAddress/i);
  });
});

// ── Tests: verifyOnChain ──────────────────────────────────────────────────────

describe("verifyOnChain", () => {
  it("returns on-chain product data when contract is readable", async () => {
    const publicClient = makeMockPublicClient({
      readContractImpl: (args) => {
        const values: Record<string, unknown> = {
          productDID: "did:galileo:01:40063813339310:21:SN-001",
          gtin: "40063813339310",
          serialNumber: "SN-001",
          productCategory: "Watches",
          isDecommissioned: false,
        };
        return values[args.functionName];
      },
    });

    const result = await verifyOnChain(publicClient, FAKE_TOKEN_ADDRESS);

    expect(result.found).toBe(true);
    expect(result.tokenAddress).toBe(FAKE_TOKEN_ADDRESS);
    expect(result.productDID).toBe("did:galileo:01:40063813339310:21:SN-001");
    expect(result.gtin).toBe("40063813339310");
    expect(result.serialNumber).toBe("SN-001");
    expect(result.productCategory).toBe("Watches");
    expect(result.isDecommissioned).toBe(false);
  });

  it("returns {found:false} when readContract throws (contract not deployed)", async () => {
    const publicClient = {
      readContract: vi.fn().mockRejectedValue(new Error("call revert exception")),
    };

    const result = await verifyOnChain(
      publicClient,
      "0xDeadDeadDeadDeadDeadDeadDeadDeadDeadDead00" as `0x${string}`,
    );

    expect(result.found).toBe(false);
    expect(result.tokenAddress).toBeUndefined();
  });

  it("calls readContract for all five product fields", async () => {
    const publicClient = makeMockPublicClient();

    await verifyOnChain(publicClient, FAKE_TOKEN_ADDRESS);

    const calledFunctions = (
      publicClient.readContract.mock.calls as Array<
        [{ functionName: string }]
      >
    ).map(([args]) => args.functionName);

    expect(calledFunctions).toContain("productDID");
    expect(calledFunctions).toContain("gtin");
    expect(calledFunctions).toContain("serialNumber");
    expect(calledFunctions).toContain("productCategory");
    expect(calledFunctions).toContain("isDecommissioned");
  });
});

// ── Tests: getWalletClient (graceful fallback) ────────────────────────────────

describe("getWalletClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MINTING_MNEMONIC;
    delete process.env.MINTING_PRIVATE_KEY;
    delete process.env.DEPLOYER_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when no credential is set", () => {
    const client = getWalletClient();
    expect(client).toBeNull();
  });
});

// ── Tests: isBlockchainWriteConfigured ────────────────────────────────────────

describe("isBlockchainWriteConfigured", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MINTING_MNEMONIC;
    delete process.env.MINTING_PRIVATE_KEY;
    delete process.env.DEPLOYER_PRIVATE_KEY;
    delete process.env.BASE_SEPOLIA_RPC_URL;
    delete process.env.BASE_SEPOLIA_RPC;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when no env vars are set", () => {
    expect(isBlockchainWriteConfigured()).toBe(false);
  });

  it("returns false when only RPC URL is set (no credential)", () => {
    process.env.BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
    expect(isBlockchainWriteConfigured()).toBe(false);
  });

  it("returns false when only private key is set (no RPC URL)", () => {
    process.env.MINTING_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    expect(isBlockchainWriteConfigured()).toBe(false);
  });

  it("returns true when both MINTING_PRIVATE_KEY and BASE_SEPOLIA_RPC_URL are set", () => {
    process.env.MINTING_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    process.env.BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
    expect(isBlockchainWriteConfigured()).toBe(true);
  });

  it("returns true when both MINTING_MNEMONIC and BASE_SEPOLIA_RPC_URL are set", () => {
    process.env.MINTING_MNEMONIC =
      "test test test test test test test test test test test junk";
    process.env.BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
    expect(isBlockchainWriteConfigured()).toBe(true);
  });

  it("accepts BASE_SEPOLIA_RPC as a backwards-compatible RPC alias", () => {
    process.env.MINTING_PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    process.env.BASE_SEPOLIA_RPC = "https://sepolia.base.org";
    expect(getBaseSepoliaRpcUrl()).toBe("https://sepolia.base.org");
    expect(isBlockchainWriteConfigured()).toBe(true);
  });
});
