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
import type { FastifyInstance } from "fastify";

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ verifyMessage: vi.fn() })),
    createWalletClient: vi.fn(),
    http: vi.fn(),
  };
});

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(),
}));

vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

import { parseCookies, cleanDb } from "./helpers.js";
import { sanctionedAddresses } from "../src/services/compliance/sanctions.js";
import {
  runComplianceChecks,
  type ComplianceContext,
} from "../src/services/compliance/index.js";
import { jurisdictionCheck } from "../src/services/compliance/jurisdiction.js";
import { sanctionsCheck } from "../src/services/compliance/sanctions.js";
import { brandAuthCheck } from "../src/services/compliance/brand-auth.js";
import { cpoCheck } from "../src/services/compliance/cpo.js";
import { serviceCenterCheck } from "../src/services/compliance/service-center.js";

const VALID_GTIN_13 = "4006381333931";
const CSRF = { "x-galileo-client": "test" };
const VALID_ETH_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const VALID_ETH_CHECKSUM = "0x1234567890AbcdEF1234567890aBcdef12345678";
const ANOTHER_ETH_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const ANOTHER_ETH_CHECKSUM = "0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD";

describe("POST /products/:id/transfer", () => {
  let app: FastifyInstance;

  let brandAdminCookie: string;
  let adminCookie: string;
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
        name: "Transfer Test Brand",
        slug: "transfer-test-brand",
        did: "did:galileo:brand:transfer-test-brand",
      },
    });
    testBrandId = brand.id;

    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Transfer Brand",
        slug: "other-transfer-brand",
        did: "did:galileo:brand:other-transfer-brand",
      },
    });
    otherBrandId = otherBrand.id;

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
      "transfer-ba@test.com",
      "BRAND_ADMIN",
      testBrandId,
    );
    adminCookie = await setupUser("transfer-admin@test.com", "ADMIN");
    otherBrandAdminCookie = await setupUser(
      "transfer-other@test.com",
      "BRAND_ADMIN",
      otherBrandId,
    );
  });

  /** Create a product and mint it so it becomes ACTIVE */
  async function createMintedProduct(
    cookie: string,
    serial = "TRANSFER-001",
  ): Promise<string> {
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie, ...CSRF },
      payload: {
        name: "Transferable Product",
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

  it("transfers an ACTIVE product to a valid address and creates TRANSFERRED event", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.product.walletAddress).toBe(VALID_ETH_CHECKSUM);
    // Product stays ACTIVE after transfer
    expect(body.data.product.status).toBe("ACTIVE");

    const events = body.data.product.events;
    const transferEvent = events.find(
      (e: { type: string }) => e.type === "TRANSFERRED",
    );
    expect(transferEvent).toBeDefined();
    expect(transferEvent.data.to).toBe(VALID_ETH_CHECKSUM);
  });

  it("second transfer updates walletAddress and records both from and to", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    // First transfer
    await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    // Second transfer
    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: ANOTHER_ETH_ADDRESS },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.product.walletAddress).toBe(ANOTHER_ETH_CHECKSUM);
    expect(body.data.product.status).toBe("ACTIVE");

    const events = body.data.product.events;
    const transferEvents = events.filter(
      (e: { type: string }) => e.type === "TRANSFERRED",
    );
    expect(transferEvents).toHaveLength(2);

    // Most recent event first (ordered by createdAt desc)
    expect(transferEvents[0].data.from).toBe(VALID_ETH_CHECKSUM);
    expect(transferEvents[0].data.to).toBe(ANOTHER_ETH_CHECKSUM);
  });

  it("returns 409 for DRAFT product", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: {
        name: "Draft Product",
        gtin: VALID_GTIN_13,
        serialNumber: "DRAFT-TRANSFER",
        brandId: testBrandId,
        category: "Watches",
      },
    });
    const productId = createRes.json().data.product.id;

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("returns 409 for RECALLED product", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    // Recall the product first
    await app.inject({
      method: "POST",
      url: `/products/${productId}/recall`,
      headers: { cookie: brandAdminCookie, ...CSRF },
    });

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("returns 404 for non-existent product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/products/nonexistent-id/transfer",
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    expect(res.statusCode).toBe(404);
  });

  it("denies BRAND_ADMIN from another brand", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: otherBrandAdminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    // 404 (not 403) to avoid leaking that the product exists for another brand
    expect(res.statusCode).toBe(404);
  });

  it("allows ADMIN to transfer any brand product", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: adminCookie, ...CSRF },
      payload: { toAddress: VALID_ETH_ADDRESS },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.product.walletAddress).toBe(VALID_ETH_CHECKSUM);
  });

  it("returns 400 for invalid Ethereum address", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: { toAddress: "not-an-address" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for missing toAddress", async () => {
    const productId = await createMintedProduct(brandAdminCookie);

    const res = await app.inject({
      method: "POST",
      url: `/products/${productId}/transfer`,
      headers: { cookie: brandAdminCookie, ...CSRF },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  // ─── Compliance integration tests ─────────────────────────────

  describe("Compliance checks", () => {
    afterEach(() => {
      sanctionedAddresses.clear();
    });

    it("returns 403 COMPLIANCE_REJECTED when sanctions check fails", async () => {
      const productId = await createMintedProduct(brandAdminCookie);

      // Add the destination address to the sanctions list
      sanctionedAddresses.add(VALID_ETH_CHECKSUM.toLowerCase());

      const res = await app.inject({
        method: "POST",
        url: `/products/${productId}/transfer`,
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: { toAddress: VALID_ETH_ADDRESS },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.error.code).toBe("COMPLIANCE_REJECTED");
      expect(body.error.message).toContain("sanctions");
    });

    it("transfer succeeds when sanctions list is empty (all compliance modules pass)", async () => {
      const productId = await createMintedProduct(brandAdminCookie);

      const res = await app.inject({
        method: "POST",
        url: `/products/${productId}/transfer`,
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: { toAddress: VALID_ETH_ADDRESS },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it("ADMIN can transfer cross-brand products (brand-auth passes for ADMIN)", async () => {
      const productId = await createMintedProduct(brandAdminCookie);

      const res = await app.inject({
        method: "POST",
        url: `/products/${productId}/transfer`,
        headers: { cookie: adminCookie, ...CSRF },
        payload: { toAddress: VALID_ETH_ADDRESS },
      });

      expect(res.statusCode).toBe(200);
    });

    it("compliance rejection includes the module name in the error message", async () => {
      const productId = await createMintedProduct(brandAdminCookie);

      sanctionedAddresses.add(VALID_ETH_CHECKSUM.toLowerCase());

      const res = await app.inject({
        method: "POST",
        url: `/products/${productId}/transfer`,
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: { toAddress: VALID_ETH_ADDRESS },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.message).toContain("sanctions");
    });
  });
});

// ─── Compliance module unit tests ─────────────────────────────

describe("Compliance modules (unit)", () => {
  const baseCtx: ComplianceContext = {
    productId: "prod-1",
    productStatus: "ACTIVE",
    productBrandId: "brand-1",
    fromAddress: null,
    toAddress: "0x1234567890abcdef1234567890abcdef12345678",
    userId: "user-1",
    userRole: "BRAND_ADMIN",
    userBrandId: "brand-1",
  };

  afterEach(() => {
    sanctionedAddresses.clear();
  });

  it("jurisdictionCheck passes when no jurisdiction is provided", async () => {
    const result = await jurisdictionCheck(baseCtx);
    expect(result.passed).toBe(true);
    expect(result.module).toBe("jurisdiction");
  });

  it("jurisdictionCheck fails for OFAC-blocked jurisdictions", async () => {
    const result = await jurisdictionCheck({ ...baseCtx, jurisdiction: "KP" });
    expect(result.passed).toBe(false);
    expect(result.module).toBe("jurisdiction");
    expect(result.reason).toBeDefined();
  });

  it("jurisdictionCheck passes for non-blocked jurisdictions", async () => {
    const result = await jurisdictionCheck({ ...baseCtx, jurisdiction: "FR" });
    expect(result.passed).toBe(true);
  });

  it("sanctionsCheck passes when toAddress is not sanctioned", async () => {
    const result = await sanctionsCheck(baseCtx);
    expect(result.passed).toBe(true);
    expect(result.module).toBe("sanctions");
  });

  it("sanctionsCheck fails when toAddress is sanctioned", async () => {
    sanctionedAddresses.add(baseCtx.toAddress.toLowerCase());
    const result = await sanctionsCheck(baseCtx);
    expect(result.passed).toBe(false);
    expect(result.module).toBe("sanctions");
    expect(result.reason).toBeDefined();
  });

  it("brandAuthCheck passes when user brand matches product brand", async () => {
    const result = await brandAuthCheck(baseCtx);
    expect(result.passed).toBe(true);
    expect(result.module).toBe("brand-auth");
  });

  it("brandAuthCheck fails for cross-brand non-ADMIN", async () => {
    const ctx = { ...baseCtx, userBrandId: "other-brand" };
    const result = await brandAuthCheck(ctx);
    expect(result.passed).toBe(false);
    expect(result.module).toBe("brand-auth");
    expect(result.reason).toContain("Cross-brand");
  });

  it("brandAuthCheck passes for ADMIN regardless of brand", async () => {
    const ctx = { ...baseCtx, userRole: "ADMIN", userBrandId: null };
    const result = await brandAuthCheck(ctx);
    expect(result.passed).toBe(true);
  });

  it("cpoCheck passes when brandCpoEmail is not configured", async () => {
    // No brandCpoEmail in context — brand hasn't opted in to CPO enforcement
    const result = await cpoCheck(baseCtx);
    expect(result.passed).toBe(true);
    expect(result.module).toBe("cpo");
  });

  it("cpoCheck passes when brandCpoEmail is a valid address", async () => {
    const result = await cpoCheck({
      ...baseCtx,
      brandCpoEmail: "cpo@example.com",
    });
    expect(result.passed).toBe(true);
    expect(result.module).toBe("cpo");
  });

  it("cpoCheck fails when brandCpoEmail is explicitly empty", async () => {
    const result = await cpoCheck({ ...baseCtx, brandCpoEmail: "" });
    expect(result.passed).toBe(false);
    expect(result.module).toBe("cpo");
    expect(result.reason).toBeDefined();
  });

  it("serviceCenterCheck passes for same-brand user", async () => {
    // baseCtx has userBrandId === productBrandId
    const result = await serviceCenterCheck(baseCtx);
    expect(result.passed).toBe(true);
    expect(result.module).toBe("service-center");
  });

  it("serviceCenterCheck passes for ADMIN", async () => {
    const result = await serviceCenterCheck({
      ...baseCtx,
      userRole: "ADMIN",
      userBrandId: null,
    });
    expect(result.passed).toBe(true);
  });

  it("serviceCenterCheck fails for cross-brand non-ADMIN without authorization", async () => {
    const result = await serviceCenterCheck({
      ...baseCtx,
      userBrandId: "other-brand",
    });
    expect(result.passed).toBe(false);
    expect(result.module).toBe("service-center");
  });

  it("runComplianceChecks returns passed=true when all modules pass", async () => {
    const result = await runComplianceChecks(baseCtx, [
      jurisdictionCheck,
      sanctionsCheck,
      brandAuthCheck,
      cpoCheck,
      serviceCenterCheck,
    ]);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(5);
  });

  it("runComplianceChecks fails fast on first rejection", async () => {
    sanctionedAddresses.add(baseCtx.toAddress.toLowerCase());
    const result = await runComplianceChecks(baseCtx, [
      jurisdictionCheck,
      sanctionsCheck,
      brandAuthCheck,
      cpoCheck,
      serviceCenterCheck,
    ]);
    expect(result.passed).toBe(false);
    // Should stop at sanctions (2nd module) — jurisdiction passed, sanctions failed
    expect(result.results).toHaveLength(2);
    expect(result.results[1]!.module).toBe("sanctions");
    expect(result.results[1]!.passed).toBe(false);
  });

  it("handles null fromAddress correctly", async () => {
    const ctx = { ...baseCtx, fromAddress: null };
    const result = await runComplianceChecks(ctx, [
      jurisdictionCheck,
      sanctionsCheck,
      brandAuthCheck,
      cpoCheck,
      serviceCenterCheck,
    ]);
    expect(result.passed).toBe(true);
  });
});
