import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb, nextFixtureId } from "./helpers.js";
import { buildLinkWalletMessage } from "@galileo/shared";
import {
  _clearNonceStore,
  _setNonce,
  createNonce,
  consumeNonce,
} from "../src/routes/auth/nonce.js";

/**
 * Generate a deterministic wallet and sign a message.
 */
function createTestWallet() {
  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
  const account = privateKeyToAccount(privateKey);
  return { account, address: account.address };
}

/**
 * A second wallet for conflict tests.
 */
function createTestWallet2() {
  const privateKey =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
  const account = privateKeyToAccount(privateKey);
  return { account, address: account.address };
}

describe("POST /auth/link-wallet", () => {
  let app: FastifyInstance;
  const wallet1 = createTestWallet();
  const wallet2 = createTestWallet2();
  let fixtureId: string;

  const scenarioEmail = (localPart: string) => `${localPart}.${fixtureId}@test.com`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    fixtureId = nextFixtureId("link-wallet");
    _clearNonceStore();
    await cleanDb(app.prisma);
  });

  afterEach(() => {
    _clearNonceStore();
    vi.restoreAllMocks();
  });

  /**
   * Helper: register a user, return auth cookies and user ID.
   */
  async function registerAndGetCookies(email: string) {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "password123",
      },
    });
    expect(res.statusCode).toBe(201);
    const cookies = parseCookies(res);
    const userId = res.json().data.user.id;
    return { cookies, userId };
  }

  /**
   * Helper: build a signed message with nonce + timestamp.
   */
  async function buildSignedMessage(
    email: string,
    userId: string,
    walletAccount: (typeof wallet1)["account"],
  ) {
    const nonce = createNonce(userId);
    const timestamp = Date.now();
    const message = buildLinkWalletMessage(email, nonce, timestamp);
    const signature = await walletAccount.signMessage({ message });
    return { message, signature, nonce, timestamp };
  }

  // ─── Happy Path ───────────────────────────────────────────────

  it("links wallet with valid nonce + timestamp and returns 200", async () => {
    const email = scenarioEmail("wallet-link");
    const { cookies, userId } = await registerAndGetCookies(email);
    const { message, signature } = await buildSignedMessage(email, userId, wallet1.account);

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.walletAddress).toBe(wallet1.address);

    // Verify persisted in DB
    const dbUser = await app.prisma.user.findFirst({
      where: { email },
    });
    expect(dbUser!.walletAddress).toBe(wallet1.address);
  });

  // ─── 409: Address already linked ─────────────────────────────

  it("returns 409 when address is already linked to another user", async () => {
    const firstEmail = scenarioEmail("wallet-link");
    const secondEmail = scenarioEmail("wallet-link-second-user");

    // First user links wallet
    const { cookies: cookies1, userId: userId1 } =
      await registerAndGetCookies(firstEmail);
    const { message: message1, signature: signature1 } =
      await buildSignedMessage(firstEmail, userId1, wallet1.account);

    const res1 = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies1.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature: signature1,
        message: message1,
      },
    });
    expect(res1.statusCode).toBe(200);

    // Second user tries to link same address
    const { cookies: cookies2, userId: userId2 } =
      await registerAndGetCookies(secondEmail);
    const { message: message2, signature: signature2 } =
      await buildSignedMessage(secondEmail, userId2, wallet1.account);

    const res2 = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies2.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature: signature2,
        message: message2,
      },
    });

    expect(res2.statusCode).toBe(409);
    const body = res2.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");

    const [firstUser, secondUser] = await Promise.all([
      app.prisma.user.findUnique({ where: { id: userId1 } }),
      app.prisma.user.findUnique({ where: { id: userId2 } }),
    ]);
    expect(firstUser!.walletAddress).toBe(wallet1.address);
    expect(secondUser!.walletAddress).toBeNull();
  });

  // ─── 401: Unauthenticated ────────────────────────────────────

  it("returns 401 without auth cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature: "0x1234",
        message: "Link wallet to Galileo: test",
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // ─── 400: Invalid Ethereum address ───────────────────────────

  it("returns 400 for invalid Ethereum address", async () => {
    const email = scenarioEmail("wallet-link");
    const { cookies } = await registerAndGetCookies(email);

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: "not-a-valid-address",
        signature: "0x1234",
        message: `Link wallet to Galileo: ${email}`,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // ─── 400: Signature verification fails ───────────────────────

  it("returns 400 when signature does not match address (wrong signer)", async () => {
    const email = scenarioEmail("wallet-link");
    const { cookies, userId } = await registerAndGetCookies(email);
    const nonce = createNonce(userId);
    const timestamp = Date.now();
    const message = buildLinkWalletMessage(email, nonce, timestamp);
    // wallet2 signs, but user claims wallet1's address
    const signature = await wallet2.account.signMessage({ message });

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("SIGNATURE_INVALID");
  });

  // ─── Nonce + Expiry tests ────────────────────────────────────

  it("GET /auth/nonce returns 200 with nonce string", async () => {
    const { cookies } = await registerAndGetCookies(scenarioEmail("nonce-test"));

    const res = await app.inject({
      method: "GET",
      url: "/auth/nonce",
      headers: { cookie: `galileo_at=${cookies.galileo_at}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.nonce).toBeDefined();
    expect(typeof body.data.nonce).toBe("string");
  });

  it("GET /auth/nonce requires authentication (401)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/nonce",
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when message lacks nonce (legacy format)", async () => {
    const email = scenarioEmail("wallet-link-legacy");
    const { cookies } = await registerAndGetCookies(email);
    const legacyMessage = `Link wallet to Galileo: ${email}`;
    const signature = await wallet1.account.signMessage({
      message: legacyMessage,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message: legacyMessage,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(response.json().error.message).toContain("nonce");
  });

  it("returns 400 EXPIRED when timestamp is too old", async () => {
    const email = scenarioEmail("wallet-link-expired");
    const { cookies, userId } = await registerAndGetCookies(email);
    const nonce = createNonce(userId);

    // Use a timestamp from 10 minutes ago
    const oldTimestamp = Date.now() - 10 * 60 * 1000;
    const message = buildLinkWalletMessage(email, nonce, oldTimestamp);
    const signature = await wallet1.account.signMessage({ message });

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("EXPIRED");
  });

  it("returns 400 INVALID_NONCE when nonce is invalid", async () => {
    const email = scenarioEmail("wallet-link-badnonce");
    const { cookies } = await registerAndGetCookies(email);
    const timestamp = Date.now();
    const message = buildLinkWalletMessage(email, "fake-nonce-does-not-exist", timestamp);
    const signature = await wallet1.account.signMessage({ message });

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_NONCE");
  });

  it("returns 400 INVALID_NONCE on replayed nonce (second attempt)", async () => {
    const email = scenarioEmail("wallet-link-replay");
    const { cookies, userId } = await registerAndGetCookies(email);
    const { message, signature } = await buildSignedMessage(email, userId, wallet1.account);

    // First attempt — succeeds
    const res1 = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });
    expect(res1.statusCode).toBe(200);

    // Clear wallet so we can attempt again (otherwise 409 for same address)
    await app.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: null },
    });

    // Second attempt with same nonce — should fail
    const res2 = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });
    expect(res2.statusCode).toBe(400);
    expect(res2.json().error.code).toBe("INVALID_NONCE");
  });

  it("returns 400 INVALID_NONCE with wrong user's nonce", async () => {
    const firstEmail = scenarioEmail("wallet-nonce-user1");
    const secondEmail = scenarioEmail("wallet-nonce-user2");
    const { cookies: cookies1, userId: userId1 } =
      await registerAndGetCookies(firstEmail);
    const { cookies: cookies2, userId: _userId2 } =
      await registerAndGetCookies(secondEmail);

    // Create nonce for user1, but try to use it as user2
    const nonce = createNonce(userId1);
    const timestamp = Date.now();
    const message = buildLinkWalletMessage(secondEmail, nonce, timestamp);
    const signature = await wallet1.account.signMessage({ message });

    const response = await app.inject({
      method: "POST",
      url: "/auth/link-wallet",
      headers: {
        cookie: `galileo_at=${cookies2.galileo_at}`,
        "x-galileo-client": "1",
      },
      payload: {
        address: wallet1.address,
        signature,
        message,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_NONCE");
  });

  it("nonce expires after 5 minutes", () => {
    const userId = "test-user-expiry";
    const nonce = createNonce(userId);

    // Immediately, it should be valid
    expect(consumeNonce(nonce, userId)).toBe(true);

    // Create another and simulate expiry
    const nonce2 = createNonce(userId);
    // Manually set the nonce to be expired
    _setNonce(nonce2 + "-expired", userId, Date.now() - 1);
    expect(consumeNonce(nonce2 + "-expired", userId)).toBe(false);
  });
});
