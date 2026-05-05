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

// Mock viem (R06)
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({ verifyMessage: vi.fn() })),
  createWalletClient: vi.fn(),
  http: vi.fn(),
  getAddress: vi.fn((a: string) => a),
  verifyMessage: vi.fn(),
  parseEther: vi.fn((v: string) => BigInt(Math.floor(parseFloat(v) * 1e18))),
  formatEther: vi.fn((v: bigint) => (Number(v) / 1e18).toString()),
  isAddress: vi.fn(() => true),
}));
vi.mock("viem/accounts", () => ({ privateKeyToAccount: vi.fn() }));
vi.mock("viem/chains", () => ({
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

import { parseCookies, cleanDb, nextFixtureId } from "./helpers.js";

const VALID_GTIN_13 = "4006381333931";

describe("POST /products/batch-mint", () => {
  let app: FastifyInstance;
  let brandAdminCookie: string;
  let adminCookie: string;
  let testBrandId: string;
  let otherBrandId: string;
  let otherBrandAdminCookie: string;
  let fixtureId: string;

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
    fixtureId = nextFixtureId("batch-mint");
    const testBrandSlug = `test-brand-${fixtureId}`;
    const otherBrandSlug = `other-brand-${fixtureId}`;
    const brandAdminEmail = `ba.${fixtureId}@test.com`;
    const adminEmail = `admin.${fixtureId}@test.com`;
    const otherBrandAdminEmail = `other-ba.${fixtureId}@test.com`;

    const brand = await app.prisma.brand.create({
      data: {
        name: "Test Brand",
        slug: testBrandSlug,
        did: `did:galileo:brand:${testBrandSlug}`,
      },
    });
    testBrandId = brand.id;

    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Brand",
        slug: otherBrandSlug,
        did: `did:galileo:brand:${otherBrandSlug}`,
      },
    });
    otherBrandId = otherBrand.id;

    // BRAND_ADMIN — register WITHOUT brandName (no phantom brand)
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: brandAdminEmail, password: "Password123!" },
    });
    await app.prisma.user.update({
      where: { email: brandAdminEmail },
      data: { brandId: testBrandId, role: "BRAND_ADMIN" },
    });
    const baLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: brandAdminEmail, password: "Password123!" },
    });
    brandAdminCookie = `galileo_at=${parseCookies(baLogin).galileo_at}`;

    // ADMIN — register WITHOUT brandName
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: adminEmail, password: "Password123!" },
    });
    await app.prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    const adLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: adminEmail, password: "Password123!" },
    });
    adminCookie = `galileo_at=${parseCookies(adLogin).galileo_at}`;

    // Other BRAND_ADMIN — register WITHOUT brandName
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: otherBrandAdminEmail, password: "Password123!" },
    });
    await app.prisma.user.update({
      where: { email: otherBrandAdminEmail },
      data: { brandId: otherBrandId, role: "BRAND_ADMIN" },
    });
    const otherLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: otherBrandAdminEmail, password: "Password123!" },
    });
    otherBrandAdminCookie = `galileo_at=${parseCookies(otherLogin).galileo_at}`;
  });

  async function createProduct(
    serial: string,
    status: string = "DRAFT",
    brand: string = testBrandId,
  ): Promise<string> {
    const product = await app.prisma.product.create({
      data: {
        gtin: VALID_GTIN_13,
        serialNumber: serial,
        did: `did:galileo:${fixtureId}:${serial}`,
        name: `Product ${serial}`,
        category: "Watches",
        brandId: brand,
        status,
      },
    });
    await app.prisma.productPassport.create({
      data: {
        productId: product.id,
        digitalLink: `https://galileo.test/01/${VALID_GTIN_13}/21/${serial}`,
      },
    });
    return product.id;
  }

  function mintBatch(productIds: string[], cookie: string) {
    return app.inject({
      method: "POST",
      url: "/products/batch-mint",
      headers: {
        cookie,
        "x-galileo-client": "1",
        "content-type": "application/json",
      },
      payload: { productIds },
    });
  }

  it("should batch mint 3 DRAFT products — all become ACTIVE (200)", async () => {
    const ids = [
      await createProduct("BM001"),
      await createProduct("BM002"),
      await createProduct("BM003"),
    ];

    const res = await mintBatch(ids, brandAdminCookie);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.data.minted).toBe(3);
    expect(data.data.errors).toHaveLength(0);

    // Verify all are ACTIVE
    for (const id of ids) {
      const p = await app.prisma.product.findUnique({ where: { id } });
      expect(p!.status).toBe("ACTIVE");
    }
  });

  it("should report error for non-existent product ID", async () => {
    const id1 = await createProduct("BM010");
    const res = await mintBatch(
      [id1, "00000000-0000-0000-0000-000000000000"],
      brandAdminCookie,
    );
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.data.errors).toHaveLength(1);
    expect(data.data.errors[0].message).toContain("not found");
  });

  it("should report error for already ACTIVE product", async () => {
    const id = await createProduct("BM020", "ACTIVE");
    const res = await mintBatch([id], brandAdminCookie);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.data.minted).toBe(0);
    expect(data.data.errors[0].message).toContain("already minted");
  });

  it("should report error for RECALLED product", async () => {
    const id = await createProduct("BM030", "RECALLED");
    const res = await mintBatch([id], brandAdminCookie);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.data.minted).toBe(0);
    expect(data.data.errors[0].message).toContain("recalled");
  });

  it("should treat cross-brand products like missing products for BRAND_ADMIN", async () => {
    const crossId = await createProduct("BM040", "DRAFT", otherBrandId);
    const res = await mintBatch([crossId], brandAdminCookie);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.minted).toBe(0);
    expect(res.json().data.errors).toEqual([
      { productId: crossId, message: "Product not found" },
    ]);
  });

  it("should reject empty productIds array with 400", async () => {
    const res = await mintBatch([], brandAdminCookie);
    expect(res.statusCode).toBe(400);
  });

  it("should reject over 100 products with 400", async () => {
    const ids = Array.from(
      { length: 101 },
      (_, i) => `${String(i).padStart(8, "0")}-0000-0000-0000-000000000000`,
    );
    const res = await mintBatch(ids, brandAdminCookie);
    expect(res.statusCode).toBe(400);
  });

  it("should reject unauthenticated with 401", async () => {
    const res = await mintBatch(["any-id"], "galileo_at=invalid");
    expect(res.statusCode).toBe(401);
  });

  it("should allow ADMIN to mint any brand's products", async () => {
    const id = await createProduct("BM050", "DRAFT", otherBrandId);
    const res = await mintBatch([id], adminCookie);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.minted).toBe(1);
  });

  it("should generate txHash and tokenAddress for minted products", async () => {
    const id = await createProduct("BM060");
    await mintBatch([id], brandAdminCookie);

    const passport = await app.prisma.productPassport.findUnique({
      where: { productId: id },
    });
    expect(passport!.txHash).toBeTruthy();
    expect(passport!.tokenAddress).toBeTruthy();
    expect(passport!.chainId).toBe(84532);
  });
});
