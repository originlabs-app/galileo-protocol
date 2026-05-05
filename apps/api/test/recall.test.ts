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

import { parseCookies, cleanDb } from "./helpers.js";

const VALID_GTIN_13 = "4006381333931";
const CSRF = { "x-galileo-client": "test" };

describe("POST /products/:id/recall", () => {
  let app: FastifyInstance;

  let brandAdminCookie: string;
  let adminCookie: string;
  let operatorCookie: string;
  let viewerCookie: string;
  let otherBrandAdminCookie: string;

  let testBrandId: string;
  let otherBrandId: string;

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

    const brand = await app.prisma.brand.create({
      data: {
        name: "Recall Test Brand",
        slug: "recall-test-brand",
        did: "did:galileo:brand:recall-test-brand",
      },
    });
    testBrandId = brand.id;

    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Recall Brand",
        slug: "other-recall-brand",
        did: "did:galileo:brand:other-recall-brand",
      },
    });
    otherBrandId = otherBrand.id;

    // Helper to register, set role, login, and return cookie
    async function setupUser(
      email: string,
      role: string,
      brandId?: string,
    ): Promise<string> {
      const reg = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, password: "password123" },
      });
      const userId = reg.json().data.user.id;
      await app.prisma.user.update({
        where: { id: userId },
        data: { role, ...(brandId ? { brandId } : {}) },
      });
      const login = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: "password123" },
      });
      const cookies = parseCookies(login);
      return `galileo_at=${cookies.galileo_at}`;
    }

    brandAdminCookie = await setupUser(
      "recall-ba@test.com",
      "BRAND_ADMIN",
      testBrandId,
    );
    adminCookie = await setupUser("recall-admin@test.com", "ADMIN");
    operatorCookie = await setupUser(
      "recall-op@test.com",
      "OPERATOR",
      testBrandId,
    );
    viewerCookie = await setupUser(
      "recall-viewer@test.com",
      "VIEWER",
      testBrandId,
    );
    otherBrandAdminCookie = await setupUser(
      "recall-other@test.com",
      "BRAND_ADMIN",
      otherBrandId,
    );
  });

  /** Create a product and mint it so it becomes ACTIVE */
  async function createMintedProduct(cookie: string): Promise<string> {
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie, ...CSRF },
      payload: {
        name: "Recallable Product",
        gtin: VALID_GTIN_13,
        serialNumber: "RECALL-001",
        brandId: testBrandId,
        category: "Watches",
      },
    });
    const productId = createRes.json().data.product.id;

    await app.inject({
      method: "POST",
      url: `/products/${productId}/mint`,
      headers: { cookie, ...CSRF },
    });

    return productId;
  }

  it("recalls an ACTIVE product and creates RECALLED event", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { reason: "Safety concern identified" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.product.status).toBe("RECALLED");

    const events = body.data.product.events;
    const recallEvent = events.find(
      (e: { type: string }) => e.type === "RECALLED",
    );
    expect(recallEvent).toBeDefined();
    expect(recallEvent.data.reason).toBe("Safety concern identified");
  });

  it("recalls without a reason (defaults to empty string)", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(200);
    const events = res.json().data.product.events;
    const recallEvent = events.find(
      (e: { type: string }) => e.type === "RECALLED",
    );
    expect(recallEvent.data.reason).toBe("");
  });

  it("returns 409 for DRAFT product", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: {
        name: "Draft Product",
        gtin: VALID_GTIN_13,
        serialNumber: "DRAFT-001",
        brandId: testBrandId,
        category: "Watches",
      },
    });
    const productId = createRes.json().data.product.id;

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("returns 409 for already RECALLED product", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    // First recall
    await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    // Second recall
    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(409);
  });

  it("returns 404 for non-existent product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/products/nonexistent-id/recall",
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(404);
  });

  it("denies OPERATOR role", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: operatorCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(403);
  });

  it("denies VIEWER role", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: viewerCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(403);
  });

  it("denies BRAND_ADMIN from other brand", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: otherBrandAdminCookie, ...CSRF },
    });

    // 404 (not 403) to avoid leaking that the product exists for another brand
    expect(res.statusCode).toBe(404);
  });

  it("allows ADMIN to recall any brand product", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: adminCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.product.status).toBe("RECALLED");
  });

  it("recalled product shows 'recalled' status via resolver", async () => {
    // Create, mint, and get the GTIN for resolver lookup
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: {
        name: "Resolver Recall Test",
        gtin: VALID_GTIN_13,
        serialNumber: "RESOLVE-RECALL",
        brandId: testBrandId,
        category: "Watches",
      },
    });
    const product = createRes.json().data.product;

    await app.inject({
      method: "POST",
      url: `/products/${product.id}/mint`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    // Recall
    await app.inject({
      method: "POST",
      url: `/products/${product.id}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { reason: "Defective batch" },
    });

    // Check resolver
    const resolverRes = await app.inject({
      method: "GET",
      url: `/01/${VALID_GTIN_13}/21/RESOLVE-RECALL`,
      headers: { accept: "application/ld+json" },
    });

    expect(resolverRes.statusCode).toBe(200);
    expect(resolverRes.json().status).toBe("recalled");
  });
});
