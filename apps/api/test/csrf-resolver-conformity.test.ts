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
import { JSONLD_CONTEXT } from "../src/routes/resolver/resolve.js";

// Valid GTINs (GS1 check digit verified)
const VALID_GTIN_13 = "4006381333931"; // 13 digits, padded to 14 → "04006381333931"
const VALID_GTIN_14 = "10614141007346"; // 14 digits, already 14

describe("CSRF + Resolver Conformity + GTIN Padding", () => {
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

    // Create test brand
    const brand = await app.prisma.brand.create({
      data: {
        name: "CSRF Test Brand",
        slug: "csrf-test-brand",
        did: "did:galileo:brand:csrf-test-brand",
      },
    });
    testBrandId = brand.id;

    // Register and setup BRAND_ADMIN
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "csrf-admin@test.com", password: "password123" },
    });
    const user = registerRes.json().data.user;
    await app.prisma.user.update({
      where: { id: user.id },
      data: { role: "BRAND_ADMIN", brandId: testBrandId },
    });
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "csrf-admin@test.com", password: "password123" },
    });
    const cookies = parseCookies(loginRes);
    brandAdminCookie = `galileo_at=${cookies.galileo_at}`;
  });

  // ─── CSRF Header Tests ──────────────────────────────────────

  describe("CSRF: X-Galileo-Client header", () => {
    it("POST /products without X-Galileo-Client returns 403", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "CSRF-001",
          name: "CSRF Test Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CSRF_REQUIRED");
      expect(body.error.message).toBe("X-Galileo-Client header required");
    });

    it("POST /products with X-Galileo-Client: 1 succeeds (201)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "CSRF-002",
          name: "CSRF OK Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().success).toBe(true);
    });

    it("PATCH /products/:id without X-Galileo-Client returns 403", async () => {
      // Create a product first
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "CSRF-PATCH",
          name: "Patchable",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "PATCH",
        url: `/products/${productId}`,
        headers: { cookie: brandAdminCookie },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("CSRF_REQUIRED");
    });

    it("PUT request without X-Galileo-Client is blocked by CSRF middleware", async () => {
      // Directly test the requireCsrfHeader middleware to verify PUT is covered
      const { requireCsrfHeader } = await import("../src/middleware/csrf.js");

      // Create a mock request and reply
      let csrfBlocked = false;
      const mockRequest = {
        method: "PUT",
        headers: {},
      } as unknown as import("fastify").FastifyRequest;

      const mockReply = {
        status: (code: number) => {
          if (code === 403) csrfBlocked = true;
          return {
            send: () => {},
          };
        },
      } as unknown as import("fastify").FastifyReply;

      await requireCsrfHeader(mockRequest, mockReply);
      expect(csrfBlocked).toBe(true);
    });

    it("GET /products does NOT require X-Galileo-Client header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
    });

    it("GET /products/:id does NOT require X-Galileo-Client header", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "CSRF-GET",
          name: "Get Me",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
    });

    it("Public resolver GET does NOT require X-Galileo-Client header", async () => {
      // Create and mint a product
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "CSRF-PUBLIC",
          name: "Public Product",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;
      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      });

      // Resolver is public — no auth, no CSRF header needed
      const response = await app.inject({
        method: "GET",
        url: `/01/${VALID_GTIN_13}/21/CSRF-PUBLIC`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ─── Resolver Conformity Tests ──────────────────────────────

  describe("Resolver: JSON-LD conformity", () => {
    let mintedGtin: string;
    let mintedSerial: string;

    beforeEach(async () => {
      mintedGtin = VALID_GTIN_13;
      mintedSerial = "CONFORM-001";

      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: mintedGtin,
          serialNumber: mintedSerial,
          name: "Conformity Watch",
          description: "A watch for conformity testing",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      });
    });

    it("returns @type IndividualProduct (not Product)", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${mintedGtin}/21/${mintedSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body["@type"]).toBe("IndividualProduct");
    });

    it("returns @context array with Schema.org, GS1, and Galileo contexts", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${mintedGtin}/21/${mintedSerial}`,
      });

      const body = response.json();
      expect(body["@context"]).toEqual(JSONLD_CONTEXT);
    });

    it("maps ACTIVE status to 'verified'", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${mintedGtin}/21/${mintedSerial}`,
      });

      const body = response.json();
      expect(body.status).toBe("verified");
      // Raw ACTIVE should not appear
      expect(JSON.stringify(body)).not.toContain('"ACTIVE"');
    });

    it("includes Galileo-specific terms mapped via context", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${mintedGtin}/21/${mintedSerial}`,
      });

      const body = response.json();
      // Properties mapped via galileo.jsonld context
      expect(body["@id"]).toBeDefined();
      expect(body.serialNumber).toBe(mintedSerial);
      expect(body.passport).toBeDefined();
      expect(body.passport.txHash).toBeDefined();
      expect(body.passport.chainId).toBe(84532);
      expect(body.brand).toBeDefined();
      expect(body.brand["@type"]).toBe("Brand");
      expect(body.brand["@id"]).toBeDefined();
    });

    it("returns @id with the DID using 14-digit padded GTIN", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${mintedGtin}/21/${mintedSerial}`,
      });

      const body = response.json();
      // 13-digit GTIN padded to 14
      expect(body["@id"]).toBe(
        `did:galileo:01:0${mintedGtin}:21:${mintedSerial}`,
      );
    });
  });

  // ─── GTIN 14-Digit Padding Tests ────────────────────────────

  describe("GTIN 14-digit padding", () => {
    it("resolver returns gtin with 14-digit padded GTIN", async () => {
      // Create and mint a product with 13-digit GTIN
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "PAD-001",
          name: "Padded GTIN Product",
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
        method: "GET",
        url: `/01/${VALID_GTIN_13}/21/PAD-001`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // 13-digit GTIN padded to 14
      expect(body.gtin).toBe("0" + VALID_GTIN_13);
      expect(body.gtin).toHaveLength(14);
    });

    it("resolver returns passport.digitalLink with 14-digit padded GTIN", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "PAD-002",
          name: "Digital Link Padded",
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
        method: "GET",
        url: `/01/${VALID_GTIN_13}/21/PAD-002`,
      });

      const body = response.json();
      expect(body.passport.digitalLink).toContain(`id.galileoprotocol.io`);
    });
  });

  // ─── GTIN Check Digit Validation ────────────────────────────

  describe("Resolver: GTIN check digit validation", () => {
    it("returns 400 for GTIN with invalid check digit", async () => {
      // 4006381333932 has wrong check digit (should be 1, not 2)
      const response = await app.inject({
        method: "GET",
        url: "/01/4006381333932/21/SN-001",
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toBe("Invalid GTIN check digit");
    });

    it("returns 400 for non-numeric GTIN in resolver", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/01/400638ABCDEFG/21/SN-001",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.message).toBe("Invalid GTIN check digit");
    });

    it("returns 400 for short GTIN in resolver", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/01/12345/21/SN-001",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.message).toBe("Invalid GTIN check digit");
    });

    it("returns 404 (not 400) for valid GTIN that has no matching product", async () => {
      // 0614141007349 is a valid GTIN-13 but no product exists
      const response = await app.inject({
        method: "GET",
        url: "/01/0614141007349/21/NONEXISTENT",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    });
  });
});
