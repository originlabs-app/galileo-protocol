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

// Mock viem entirely — must be before any import that touches viem
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({ verifyMessage: vi.fn() })),
  createWalletClient: vi.fn(),
  http: vi.fn(),
  parseEther: vi.fn((v: string) => BigInt(Math.floor(parseFloat(v) * 1e18))),
  formatEther: vi.fn((v: bigint) => (Number(v) / 1e18).toString()),
  isAddress: vi.fn(() => true),
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(),
}));

vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

import { parseCookies, cleanDb, nextFixtureId } from "./helpers.js";

// Valid GTIN (GS1 check digit verified)
const VALID_GTIN_13 = "4006381333931";

describe("POST /products/:id/mint", () => {
  let app: FastifyInstance;

  let brandAdminCookie: string;
  let adminCookie: string;
  let operatorCookie: string;
  let viewerCookie: string;
  let otherBrandAdminCookie: string;

  let testBrandId: string;
  let otherBrandId: string;
  let fixtureId: string;

  beforeAll(async () => {
    // Dynamic import to ensure vi.mock takes effect before module load
    const { buildApp } = await import("../src/server.js");
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDb(app.prisma);
    fixtureId = nextFixtureId("mint");
    const testBrandSlug = `test-luxury-brand-${fixtureId}`;
    const otherBrandSlug = `other-brand-${fixtureId}`;
    const brandAdminEmail = `mint-brand-admin.${fixtureId}@test.com`;
    const operatorEmail = `mint-operator.${fixtureId}@test.com`;
    const viewerEmail = `mint-viewer.${fixtureId}@test.com`;
    const otherBrandAdminEmail = `mint-other-admin.${fixtureId}@test.com`;
    const adminEmail = `mint-admin.${fixtureId}@test.com`;

    // Create test brand
    const brand = await app.prisma.brand.create({
      data: {
        name: "Test Luxury Brand",
        slug: testBrandSlug,
        did: `did:galileo:brand:${testBrandSlug}`,
      },
    });
    testBrandId = brand.id;

    // Create another brand
    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Brand",
        slug: otherBrandSlug,
        did: `did:galileo:brand:${otherBrandSlug}`,
      },
    });
    otherBrandId = otherBrand.id;

    // Register BRAND_ADMIN user (with brand)
    const brandAdminRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: brandAdminEmail,
        password: "password123",
      },
    });
    const brandAdminUser = brandAdminRes.json().data.user;
    await app.prisma.user.update({
      where: { id: brandAdminUser.id },
      data: { role: "BRAND_ADMIN", brandId: testBrandId },
    });
    const brandAdminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: brandAdminEmail,
        password: "password123",
      },
    });
    const brandAdminCookies = parseCookies(brandAdminLogin);
    brandAdminCookie = `galileo_at=${brandAdminCookies.galileo_at}`;

    // Register OPERATOR user
    const operatorRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: operatorEmail,
        password: "password123",
      },
    });
    const operatorUser = operatorRes.json().data.user;
    await app.prisma.user.update({
      where: { id: operatorUser.id },
      data: { role: "OPERATOR", brandId: testBrandId },
    });
    const operatorLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: operatorEmail,
        password: "password123",
      },
    });
    const operatorCookies = parseCookies(operatorLogin);
    operatorCookie = `galileo_at=${operatorCookies.galileo_at}`;

    // Register VIEWER user
    const viewerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: viewerEmail,
        password: "password123",
      },
    });
    const viewerUser = viewerRes.json().data.user;
    await app.prisma.user.update({
      where: { id: viewerUser.id },
      data: { role: "VIEWER", brandId: testBrandId },
    });
    const viewerLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: viewerEmail,
        password: "password123",
      },
    });
    const viewerCookies = parseCookies(viewerLogin);
    viewerCookie = `galileo_at=${viewerCookies.galileo_at}`;

    // Register other BRAND_ADMIN (different brand)
    const otherBrandAdminRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: otherBrandAdminEmail,
        password: "password123",
      },
    });
    const otherBrandAdminUser = otherBrandAdminRes.json().data.user;
    await app.prisma.user.update({
      where: { id: otherBrandAdminUser.id },
      data: { role: "BRAND_ADMIN", brandId: otherBrandId },
    });
    const otherBrandAdminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: otherBrandAdminEmail,
        password: "password123",
      },
    });
    const otherBrandAdminCookies = parseCookies(otherBrandAdminLogin);
    otherBrandAdminCookie = `galileo_at=${otherBrandAdminCookies.galileo_at}`;

    // Register ADMIN user (no brand — can do everything)
    const adminRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: adminEmail,
        password: "password123",
      },
    });
    const adminUser = adminRes.json().data.user;
    await app.prisma.user.update({
      where: { id: adminUser.id },
      data: { role: "ADMIN" },
    });
    const adminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: adminEmail,
        password: "password123",
      },
    });
    const adminCookies = parseCookies(adminLogin);
    adminCookie = `galileo_at=${adminCookies.galileo_at}`;
  });

  /**
   * Helper: create a DRAFT product and return its ID.
   */
  async function createDraftProduct(serial = "MINT-001"): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      payload: {
        gtin: VALID_GTIN_13,
        serialNumber: serial,
        name: "Mintable Watch",
        category: "Watches",
      },
    });
    return res.json().data.product.id;
  }

  // ── 1. Mint success (mock mode) ────────────────────────────

  it("mints a DRAFT product: sets ACTIVE, returns synthetic txHash/tokenAddress/chainId/mintedAt, creates MINTED event", async () => {
    const productId = await createDraftProduct();

    const response = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);

    const product = body.data.product;
    expect(product.status).toBe("ACTIVE");

    // Passport on-chain data
    const passport = product.passport;
    expect(passport.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(passport.tokenAddress).toMatch(/^0x[0-9a-f]{40}$/);
    expect(passport.chainId).toBe(84532);
    expect(passport.mintedAt).toBeDefined();
    expect(new Date(passport.mintedAt).getTime()).toBeGreaterThan(0);

    // MINTED event
    const mintedEvent = product.events.find(
      (e: { type: string }) => e.type === "MINTED",
    );
    expect(mintedEvent).toBeDefined();
    expect(mintedEvent.data).toHaveProperty("txHash");
  });

  // ── 2. Mint already-active product (409) ───────────────────

  it("returns 409 when minting an already-ACTIVE product", async () => {
    const productId = await createDraftProduct("MINT-ALREADY");

    // First mint — should succeed
    const first = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
    });
    expect(first.statusCode).toBe(200);

    // Second mint — should fail with 409
    const second = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
    });

    expect(second.statusCode).toBe(409);
    const body = second.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
  });

  // ── 3. Mint wrong role — OPERATOR (403) ────────────────────

  it("returns 403 when OPERATOR tries to mint", async () => {
    const productId = await createDraftProduct("MINT-OP");

    const response = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: operatorCookie, "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(403);
  });

  // ── 4. Mint wrong role — VIEWER (403) ──────────────────────

  it("returns 403 when VIEWER tries to mint", async () => {
    const productId = await createDraftProduct("MINT-VIEW");

    const response = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: viewerCookie, "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(403);
  });

  // ── 5. Mint no auth (401) ──────────────────────────────────

  it("returns 401 without authentication", async () => {
    const productId = await createDraftProduct("MINT-NOAUTH");

    const response = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(401);
  });

  // ── 6. Mint non-existent product (404) ─────────────────────

  it("returns 404 for non-existent product", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/products/nonexistent-id-99999/mint",
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(404);
  });

  // ── 7. Mint wrong brand (404) ──────────────────────────────

  it("returns 404 when BRAND_ADMIN tries to mint another brand's product", async () => {
    const productId = await createDraftProduct("MINT-OTHERBRAND");

    const response = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: otherBrandAdminCookie, "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(404);
  });

  // ── 8. Chain disabled startup — chainEnabled is false ──────

  it("chain plugin sets chainEnabled=false when no minting credential but publicClient is available", () => {
    expect(app.chain).toBeDefined();
    expect(app.chain.chainEnabled).toBe(false);
    // publicClient is always available (needed for ERC-1271 verification)
    expect(app.chain.publicClient).toBeDefined();
    expect(app.chain.walletClient).toBeUndefined();
  });

  // ── 9. Mint creates correct passport data ──────────────────

  it("updates passport with all on-chain fields and creates event with txHash in data", async () => {
    const productId = await createDraftProduct("MINT-PASSPORT");

    await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
    });

    // Verify passport directly from DB
    const passport = await app.prisma.productPassport.findUnique({
      where: { productId },
    });
    expect(passport).toBeDefined();
    expect(passport!.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(passport!.tokenAddress).toMatch(/^0x[0-9a-f]{40}$/);
    expect(passport!.chainId).toBe(84532);
    expect(passport!.mintedAt).toBeInstanceOf(Date);

    // Verify MINTED event in DB
    const events = await app.prisma.productEvent.findMany({
      where: { productId, type: "MINTED" },
    });
    expect(events).toHaveLength(1);
    const eventData = events[0]!.data as Record<string, unknown>;
    expect(eventData.txHash).toBe(passport!.txHash);
    expect(eventData.tokenAddress).toBe(passport!.tokenAddress);
    expect(eventData.chainId).toBe(84532);
  });

  // ── 10. ADMIN can mint any brand's product ─────────────────

  it("ADMIN can mint any brand's product (200)", async () => {
    const productId = await createDraftProduct("MINT-ADMIN-001");

    const response = await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie: adminCookie, "x-galileo-client": "1" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.product.status).toBe("ACTIVE");
    expect(body.data.product.passport.txHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
