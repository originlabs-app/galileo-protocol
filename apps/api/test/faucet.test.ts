import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("../src/services/blockchain/client.js", () => ({
  getPublicClient: vi.fn(),
  getWalletClient: vi.fn(),
}));

import { buildApp } from "../src/server.js";
import {
  getPublicClient,
  getWalletClient,
} from "../src/services/blockchain/client.js";

const FAUCET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const SECOND_ADDRESS = "0x2234567890abcdef1234567890abcdef12345678";
const TX_HASH =
  "0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

type MockWalletClient = {
  account: { address: `0x${string}` };
  sendTransaction: ReturnType<typeof vi.fn>;
};

type MockPublicClient = {
  getBalance: ReturnType<typeof vi.fn>;
};

function mockWalletClient(): MockWalletClient {
  return {
    account: {
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    sendTransaction: vi.fn(async () => TX_HASH),
  };
}

function mockPublicClient(balance: bigint = 1_000_000_000_000_000_000n): MockPublicClient {
  return {
    getBalance: vi.fn(async () => balance),
  };
}

describe("Faucet routes", () => {
  let app: FastifyInstance | null = null;
  const originalFaucetEnabled = process.env.FAUCET_ENABLED;

  beforeEach(() => {
    vi.mocked(getWalletClient).mockReset();
    vi.mocked(getPublicClient).mockReset();
    delete process.env.FAUCET_ENABLED;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }

    if (originalFaucetEnabled === undefined) {
      delete process.env.FAUCET_ENABLED;
    } else {
      process.env.FAUCET_ENABLED = originalFaucetEnabled;
    }
  });

  async function startApp() {
    app = await buildApp();
    await app.ready();
    return app;
  }

  it("returns faucet status when wallet and balance are configured", async () => {
    vi.mocked(getWalletClient).mockReturnValue(mockWalletClient() as never);
    vi.mocked(getPublicClient).mockReturnValue(mockPublicClient() as never);
    const server = await startApp();

    const response = await server.inject({
      method: "GET",
      url: "/faucet/status",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        active: true,
        balance: "1",
        dripAmount: "0.001",
        message: "Faucet is active",
      },
    });
  });

  it("sends a drip transaction for a valid address", async () => {
    const walletClient = mockWalletClient();
    vi.mocked(getWalletClient).mockReturnValue(walletClient as never);
    vi.mocked(getPublicClient).mockReturnValue(mockPublicClient() as never);
    const server = await startApp();

    const response = await server.inject({
      method: "POST",
      url: "/faucet/drip",
      payload: { address: FAUCET_ADDRESS },
    });

    expect(response.statusCode).toBe(200);
    expect(walletClient.sendTransaction).toHaveBeenCalledOnce();
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        txHash: TX_HASH,
        amount: "0.001",
      },
    });
  });

  it("rate-limits repeated drips for the same address", async () => {
    const walletClient = mockWalletClient();
    vi.mocked(getWalletClient).mockReturnValue(walletClient as never);
    vi.mocked(getPublicClient).mockReturnValue(mockPublicClient() as never);
    const server = await startApp();

    const first = await server.inject({
      method: "POST",
      url: "/faucet/drip",
      payload: { address: SECOND_ADDRESS },
    });
    expect(first.statusCode).toBe(200);

    const second = await server.inject({
      method: "POST",
      url: "/faucet/drip",
      payload: { address: SECOND_ADDRESS },
    });

    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({
      success: false,
      error: { code: "RATE_LIMITED" },
    });
  });

  it("returns 503 when the faucet wallet is not configured", async () => {
    vi.mocked(getWalletClient).mockReturnValue(null);
    const server = await startApp();

    const response = await server.inject({
      method: "POST",
      url: "/faucet/drip",
      payload: { address: "0x3234567890abcdef1234567890abcdef12345678" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "FAUCET_NOT_CONFIGURED" },
    });
  });

  it("returns 503 when faucet is disabled", async () => {
    process.env.FAUCET_ENABLED = "false";
    const server = await startApp();

    const response = await server.inject({
      method: "POST",
      url: "/faucet/drip",
      payload: { address: "0x4234567890abcdef1234567890abcdef12345678" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "FAUCET_DISABLED" },
    });
  });

  it("returns 400 for an invalid address", async () => {
    const server = await startApp();

    const response = await server.inject({
      method: "POST",
      url: "/faucet/drip",
      payload: { address: "not-an-address" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "INVALID_ADDRESS" },
    });
  });
});
