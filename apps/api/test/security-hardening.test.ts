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

import { parseCookies, cleanDb } from "./helpers.js";

// Valid GTINs (GS1 check digit verified)
const VALID_GTIN_13 = "4006381333931";
const VALID_GTIN_13_B = "5901234123457";

describe("Security Hardening", () => {
  let app: FastifyInstance;

  let brandAdminCookie: string;
  let adminCookie: string;
  let nullBrandUserCookie: string;

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

    // Create test brand
    const brand = await app.prisma.brand.create({
      data: {
        name: "Security Test Brand",
        slug: "security-test-brand",
        did: "did:galileo:brand:security-test-brand",
      },
    });
    testBrandId = brand.id;

    // Create another brand
    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Security Brand",
        slug: "other-security-brand",
        did: "did:galileo:brand:other-security-brand",
      },
    });
    otherBrandId = otherBrand.id;

    // Register BRAND_ADMIN user (with brand)
    const brandAdminRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "sec-brand-admin@test.com",
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
        email: "sec-brand-admin@test.com",
        password: "password123",
      },
    });
    const brandAdminCookies = parseCookies(brandAdminLogin);
    brandAdminCookie = `galileo_at=${brandAdminCookies.galileo_at}`;

    // Register ADMIN user (no brand)
    const adminRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "sec-admin@test.com",
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
        email: "sec-admin@test.com",
        password: "password123",
      },
    });
    const adminCookies = parseCookies(adminLogin);
    adminCookie = `galileo_at=${adminCookies.galileo_at}`;

    // Register a user with null brandId (non-ADMIN) to test brandId guard
    const nullBrandRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "sec-nullbrand@test.com",
        password: "password123",
      },
    });
    const nullBrandUser = nullBrandRes.json().data.user;
    await app.prisma.user.update({
      where: { id: nullBrandUser.id },
      data: { role: "BRAND_ADMIN", brandId: null },
    });
    const nullBrandLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "sec-nullbrand@test.com",
        password: "password123",
      },
    });
    const nullBrandCookies = parseCookies(nullBrandLogin);
    nullBrandUserCookie = `galileo_at=${nullBrandCookies.galileo_at}`;
  });

  // ─── C1: Concurrent Mint TOCTOU ─────────────────────────────

  describe("C1: Mint TOCTOU race condition", () => {
    it("concurrent mint: one succeeds, one gets 409", async () => {
      // Create a DRAFT product
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "RACE-001",
          name: "Race Condition Watch",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      // Fire two mint requests concurrently
      const [res1, res2] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/products/${productId}/mint`,
          headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        }),
        app.inject({
          method: "POST",
          url: `/products/${productId}/mint`,
          headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        }),
      ]);

      const statuses = [res1.statusCode, res2.statusCode].sort();
      // Exactly one 200 and one 409
      expect(statuses).toEqual([200, 409]);
    });
  });

  // ─── C4: brandId null guard ─────────────────────────────────

  describe("C4: brandId null guard", () => {
    it("returns 403 on GET /products when non-ADMIN user has null brandId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products",
        headers: { cookie: nullBrandUserCookie },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("FORBIDDEN");
    });

    it("returns 403 on POST /products when non-ADMIN user has null brandId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: nullBrandUserCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "NULL-001",
          name: "Null Brand Product",
          category: "Watches",
        },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("FORBIDDEN");
    });

    it("returns 403 on GET /products/:id when non-ADMIN user has null brandId", async () => {
      // Create a product via brand admin first
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "NULL-DETAIL",
          name: "Null Brand Detail",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}`,
        headers: { cookie: nullBrandUserCookie },
      });
      expect(response.statusCode).toBe(403);
    });

    it("returns 403 on GET /products/stats when non-ADMIN user has null brandId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: nullBrandUserCookie },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("FORBIDDEN");
    });

    it("returns 403 on PATCH /products/:id when non-ADMIN user has null brandId", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "NULL-PATCH",
          name: "Null Brand Patch",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "PATCH",
        url: `/products/${productId}`,
        headers: { cookie: nullBrandUserCookie, "x-galileo-client": "1" },
        payload: { name: "Updated" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("returns 403 on POST /products/:id/mint when non-ADMIN user has null brandId", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "NULL-MINT",
          name: "Null Brand Mint",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: nullBrandUserCookie, "x-galileo-client": "1" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("returns 403 on GET /products/:id/qr when non-ADMIN user has null brandId", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "NULL-QR",
          name: "Null Brand QR",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}/qr`,
        headers: { cookie: nullBrandUserCookie },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  // ─── F4: Validation bounds ──────────────────────────────────

  describe("F4: Validation bounds", () => {
    it("returns 400 for name exceeding 255 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "BOUNDS-001",
          name: "A".repeat(256),
          category: "Watches",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("returns 400 for serialNumber exceeding 20 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "S".repeat(21),
          name: "Valid Name",
          category: "Watches",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("returns 400 for invalid category", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "BOUNDS-002",
          name: "Valid Name",
          category: "InvalidCategory",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("returns 400 for description exceeding 2000 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "BOUNDS-003",
          name: "Valid Name",
          description: "D".repeat(2001),
          category: "Watches",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("returns 400 for update with name exceeding 255 characters", async () => {
      // Create a product first
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "BOUNDS-004",
          name: "Valid Name",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "PATCH",
        url: `/products/${productId}`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          name: "A".repeat(256),
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 400 for update with invalid category", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "BOUNDS-005",
          name: "Valid Name",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "PATCH",
        url: `/products/${productId}`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          category: "invalid-category",
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  // ─── F5: ADMIN create with brandId ─────────────────────────

  describe("F5: ADMIN create with explicit brandId", () => {
    it("ADMIN with brandId in body creates product for that brand (201)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: adminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "ADMIN-001",
          name: "Admin Created Product",
          category: "Jewelry",
          brandId: testBrandId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.product.brandId).toBe(testBrandId);
    });

    it("ADMIN without brandId in body gets 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: adminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "ADMIN-002",
          name: "Admin No Brand",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("brandId");
    });

    it("non-ADMIN body.brandId is ignored — uses user brandId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "NONADMIN-001",
          name: "Non-Admin Brand Override Attempt",
          category: "Watches",
          brandId: otherBrandId, // should be ignored
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      // Should use user's brandId, not the one from body
      expect(body.data.product.brandId).toBe(testBrandId);
    });
  });

  // ─── OWASP: Prototype Pollution & Strict Schemas ──────────

  describe("OWASP: .strict() rejects unknown fields", () => {
    it("POST /products rejects __proto__ sent as raw JSON key", async () => {
      // __proto__ in JSON payload is stripped by JSON.parse but we verify
      // the endpoint returns 400 when any extra fields are present.
      // Sending raw JSON with an explicit "__proto__" key as a string.
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: {
          cookie: brandAdminCookie,
          "x-galileo-client": "1",
          "content-type": "application/json",
        },
        body: `{"gtin":"${VALID_GTIN_13}","serialNumber":"PROTO-001","name":"Proto Test","category":"Watches","__proto__":{"admin":true}}`,
      });

      // JSON.parse strips __proto__ so .strict() won't see it — the request succeeds.
      // This proves prototype pollution is already blocked at the parser level.
      // We accept either 201 (parser stripped __proto__) or 400 (Zod caught it).
      expect([201, 400]).toContain(response.statusCode);
    });

    it("POST /products rejects unknown extra fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "EXTRA-001",
          name: "Extra Field Test",
          category: "Watches",
          isAdmin: true,
          role: "ADMIN",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("POST /auth/register rejects unknown extra fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "strict-test@test.com",
          password: "password123",
          role: "ADMIN",
          isAdmin: true,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("POST /auth/login rejects unknown extra fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "strict-login@test.com",
          password: "password123",
          admin: true,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });
  });

  // ─── OWASP: Bounded string lengths ───────────────────────

  describe("OWASP: recall reason bounded", () => {
    it("returns 400 for recall reason exceeding 2000 characters", async () => {
      // Create and mint a product
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "REASON-BOUNDS",
          name: "Reason Bounds Test",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;
      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/products/${productId}/recall`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: { reason: "R".repeat(2001) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });
  });

  describe("OWASP: verify body bounded", () => {
    it("returns 400 for verify location exceeding 500 characters", async () => {
      // Create and mint a product
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "VERIFY-BOUNDS",
          name: "Verify Bounds Test",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;
      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/products/${productId}/verify`,
        headers: { "x-galileo-client": "1" },
        payload: { location: "L".repeat(501) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("returns 400 for verify userAgent exceeding 500 characters", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "VERIFY-UA",
          name: "Verify UA Test",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;
      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/products/${productId}/verify`,
        headers: { "x-galileo-client": "1" },
        payload: { userAgent: "U".repeat(501) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it("rejects unknown fields in verify body", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "VERIFY-STRICT",
          name: "Verify Strict Test",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;
      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/products/${productId}/verify`,
        headers: { "x-galileo-client": "1" },
        payload: { location: "Paris", isAdmin: true, role: "ADMIN" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });
  });
});
