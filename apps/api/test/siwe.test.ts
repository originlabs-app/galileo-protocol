import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";

// Mock viem (R06) — publicClient.verifyMessage for ERC-1271 support
const mockVerifyMessage = vi.fn();
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    verifyMessage: (...args: unknown[]) => mockVerifyMessage(...args),
  })),
  createWalletClient: vi.fn(),
  http: vi.fn(),
  getAddress: vi.fn((a: string) => a),
  parseEther: vi.fn((v: string) => BigInt(Math.floor(parseFloat(v) * 1e18))),
  formatEther: vi.fn((v: bigint) => (Number(v) / 1e18).toString()),
  isAddress: vi.fn(() => true),
}));
vi.mock("viem/accounts", () => ({ privateKeyToAccount: vi.fn() }));
vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

import { parseCookies, cleanDb } from "./helpers.js";

const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const CSRF_HEADERS = { "x-galileo-client": "1" };
const VALID_SIGNATURE = "0xdeadbeef";
const INVALID_SIGNATURE = "0xfeedface";

function buildSiweMessage(
  address: string,
  nonce: string,
  overrides: {
    domain?: string;
    uri?: string;
    chainId?: number;
    issuedAt?: string;
  } = {},
): string {
  const domain = overrides.domain ?? "localhost:3000";
  const uri = overrides.uri ?? "http://localhost:3000";
  const chainId = overrides.chainId ?? 84532;
  const issuedAt = overrides.issuedAt ?? new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Galileo Protocol",
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

describe("SIWE Auth (/auth/siwe/*)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import("../src/server.js");
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDb(app.prisma);
    mockVerifyMessage.mockReset();
    // Clear SIWE nonce store
    const { _clearSiweNonceStore } = await import("../src/services/siwe.js");
    _clearSiweNonceStore();
  });

  describe("GET /auth/siwe/nonce", () => {
    it("should return 200 with a nonce string", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/auth/siwe/nonce",
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(typeof data.data.nonce).toBe("string");
      expect(data.data.nonce.length).toBeGreaterThan(0);
    });
  });

  describe("POST /auth/siwe/verify", () => {
    async function createUserWithWallet(): Promise<string> {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "siwe@test.com",
          password: "Password123!",
          brandName: "SIWE Brand",
        },
      });
      const user = await app.prisma.user.findUnique({
        where: { email: "siwe@test.com" },
      });
      await app.prisma.user.update({
        where: { id: user!.id },
        data: { walletAddress: WALLET_ADDRESS },
      });
      return user!.id;
    }

    async function getNonce(): Promise<string> {
      const res = await app.inject({
        method: "GET",
        url: "/auth/siwe/nonce",
      });
      return res.json().data.nonce;
    }

    it("should issue session cookie with valid signature (200)", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      mockVerifyMessage.mockResolvedValue(true);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe("siwe@test.com");
      const cookies = parseCookies(res);
      expect(cookies.galileo_at).toBeTruthy();
    });

    it("should require CSRF header on SIWE verify", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        payload: { message, signature: VALID_SIGNATURE },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("CSRF_REQUIRED");
    });

    it("should reject SIWE messages from untrusted origins", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce, {
        domain: "evil.example",
        uri: "https://evil.example",
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_DOMAIN");
      expect(mockVerifyMessage).not.toHaveBeenCalled();
    });

    it("should reject SIWE messages for the wrong chain", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce, {
        chainId: 1,
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_CHAIN_ID");
      expect(mockVerifyMessage).not.toHaveBeenCalled();
    });

    it("should reject stale SIWE messages even when nonce exists", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce, {
        issuedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_MESSAGE");
      expect(mockVerifyMessage).not.toHaveBeenCalled();
    });

    it("should reject invalid signature (401)", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      mockVerifyMessage.mockResolvedValue(false);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: INVALID_SIGNATURE },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject expired/invalid nonce (401)", async () => {
      await createUserWithWallet();
      const message = buildSiweMessage(WALLET_ADDRESS, "expired-nonce");
      mockVerifyMessage.mockResolvedValue(true);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INVALID_NONCE");
    });

    it("should reject replayed nonce (401)", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      mockVerifyMessage.mockResolvedValue(true);

      // First use — success
      const res1 = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });
      expect(res1.statusCode).toBe(200);

      // Second use — nonce consumed
      const res2 = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });
      expect(res2.statusCode).toBe(401);
    });

    it("should return 404 when wallet is not linked to any user", async () => {
      const nonce = await getNonce();
      const unlinkedAddress = "0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333";
      const message = buildSiweMessage(unlinkedAddress, nonce);
      mockVerifyMessage.mockResolvedValue(true);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("WALLET_NOT_LINKED");
    });

    it("should reject missing message or signature (400)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message: "" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("should allow user to access protected routes after SIWE login", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      mockVerifyMessage.mockResolvedValue(true);

      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });
      const cookie = `galileo_at=${parseCookies(loginRes).galileo_at}`;

      // Access protected route
      const meRes = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie },
      });
      expect(meRes.statusCode).toBe(200);
    });

    it("should set nonce with TTL and reject after expiry", async () => {
      await createUserWithWallet();

      // Inject an already-expired nonce
      const { _setSiweNonce } = await import("../src/services/siwe.js");
      const expiredNonce = "expired-test-nonce";
      _setSiweNonce(expiredNonce, Date.now() - 1000);

      const message = buildSiweMessage(WALLET_ADDRESS, expiredNonce);
      mockVerifyMessage.mockResolvedValue(true);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });
      expect(res.statusCode).toBe(401);
    });

    it("should verify Smart Wallet (ERC-1271) signature via publicClient.verifyMessage", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      // publicClient.verifyMessage handles ERC-1271 automatically
      mockVerifyMessage.mockResolvedValue(true);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: "0x1234abcd" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.user.email).toBe("siwe@test.com");
      // Verify publicClient.verifyMessage was called with correct params
      expect(mockVerifyMessage).toHaveBeenCalledWith({
        address: WALLET_ADDRESS,
        message,
        signature: "0x1234abcd",
      });
    });

    it("should reject invalid Smart Wallet signature (ERC-1271 returns false)", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      mockVerifyMessage.mockResolvedValue(false);

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: "0xabcdef12" },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INVALID_SIGNATURE");
    });

    it("should handle RPC error during ERC-1271 check gracefully (401)", async () => {
      await createUserWithWallet();
      const nonce = await getNonce();
      const message = buildSiweMessage(WALLET_ADDRESS, nonce);
      mockVerifyMessage.mockRejectedValue(new Error("RPC connection failed"));

      const res = await app.inject({
        method: "POST",
        url: "/auth/siwe/verify",
        headers: CSRF_HEADERS,
        payload: { message, signature: VALID_SIGNATURE },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INVALID_SIGNATURE");
    });
  });
});
