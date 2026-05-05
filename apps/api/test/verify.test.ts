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

describe("POST /products/:id/verify", () => {
  let app: FastifyInstance;

  let brandAdminCookie: string;
  let testBrandId: string;

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
        name: "Verify Test Brand",
        slug: "verify-test-brand",
        did: "did:galileo:brand:verify-test-brand",
      },
    });
    testBrandId = brand.id;

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
      "verify-ba@test.com",
      "BRAND_ADMIN",
      testBrandId,
    );
  });

  /** Create a product and mint it so it becomes ACTIVE */
  async function createMintedProduct(
    cookie: string,
    serial = "VERIFY-001",
  ): Promise<string> {
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie, ...CSRF },
      payload: {
        name: "Verifiable Product",
        gtin: VALID_GTIN_13,
        serialNumber: serial,
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

  /** Create a DRAFT product (not minted) */
  async function createDraftProduct(
    cookie: string,
    serial = "DRAFT-V-001",
  ): Promise<string> {
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie, ...CSRF },
      payload: {
        name: "Draft Product",
        gtin: VALID_GTIN_13,
        serialNumber: serial,
        brandId: testBrandId,
        category: "Watches",
      },
    });
    return createRes.json().data.product.id;
  }

  it("verifies an ACTIVE product and returns verified: true with VERIFIED event", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/verify`,
      headers: { ...CSRF },
      payload: { location: "Paris, France", userAgent: "TestScanner/1.0" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.verified).toBe(true);
    expect(body.data.product).toBeDefined();
    expect(body.data.product.status).toBe("ACTIVE");
    expect(body.data.product.passport).toBeDefined();
    expect(body.data.product.events).toBeDefined();

    // Check that a VERIFIED event was created
    const verifiedEvent = body.data.product.events.find(
      (e: { type: string }) => e.type === "VERIFIED",
    );
    expect(verifiedEvent).toBeDefined();
    expect(verifiedEvent.data.location).toBe("Paris, France");
    expect(verifiedEvent.data.userAgent).toBe("TestScanner/1.0");
    expect(verifiedEvent.performedBy).toBeNull();
  });

  it("returns verified: false for a DRAFT product", async () => {
    const productId = await createDraftProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/verify`,
      headers: { ...CSRF },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.verified).toBe(false);
    expect(body.data.status).toBe("DRAFT");
    expect(body.data.reason).toBe("Product is not active");
  });

  it("returns verified: false for a RECALLED product", async () => {
    const productId = await createMintedProduct(
      brandAdminCookie,
      "RECALLED-V-001",
    );

    // Recall the product
    await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { reason: "Safety concern" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/verify`,
      headers: { ...CSRF },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.verified).toBe(false);
    expect(body.data.status).toBe("RECALLED");
    expect(body.data.reason).toBe("Product is not active");
  });

  it("returns 404 for non-existent product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/products/nonexistent-id/verify",
      headers: { ...CSRF },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("creates multiple VERIFIED events for repeated verifications (audit trail)", async () => {
    const productId = await createMintedProduct(
      brandAdminCookie,
      "MULTI-V-001",
    );

    // Verify three times
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: "POST",
        url: `/products/${productId}/verify`,
        headers: { ...CSRF },
        payload: { location: `Location ${i}` },
      });
    }

    // Check that three VERIFIED events exist
    const events = await app.prisma.productEvent.findMany({
      where: { productId, type: "VERIFIED" },
      orderBy: { createdAt: "asc" },
    });

    expect(events).toHaveLength(3);
    expect((events[0]!.data as Record<string, unknown>).location).toBe(
      "Location 0",
    );
    expect((events[2]!.data as Record<string, unknown>).location).toBe(
      "Location 2",
    );
  });

  it("records authenticated user ID when auth cookie is present", async () => {
    const productId = await createMintedProduct(brandAdminCookie, "AUTH-V-001");

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/verify`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.verified).toBe(true);

    // The performedBy should be the user ID, not "anonymous"
    const verifiedEvent = body.data.product.events.find(
      (e: { type: string }) => e.type === "VERIFIED",
    );
    expect(verifiedEvent).toBeDefined();
    expect(verifiedEvent.performedBy).not.toBe("anonymous");
  });

  it("works without request body (body is optional)", async () => {
    const productId = await createMintedProduct(
      brandAdminCookie,
      "NOBODY-V-001",
    );

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/verify`,
      headers: { ...CSRF },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.verified).toBe(true);
  });
});
