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
import { readProductPassportAuthoringMetadata } from "@galileo/shared";

// Mock viem — must precede all imports that touch viem (R06)
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
const VALID_GTIN_13_B = "0012345678905";

function buildCsv(rows: string[][]): string {
  return rows.map((r) => r.join(",")).join("\n");
}

describe("POST /products/batch-import", () => {
  let app: FastifyInstance;
  let brandAdminCookie: string;
  let operatorCookie: string;
  let adminCookie: string;
  let viewerCookie: string;
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
    fixtureId = nextFixtureId("batch-import");
    const testBrandSlug = `test-brand-${fixtureId}`;
    const otherBrandSlug = `other-brand-${fixtureId}`;
    const brandAdminEmail = `ba.${fixtureId}@test.com`;
    const operatorEmail = `operator.${fixtureId}@test.com`;
    const adminEmail = `admin.${fixtureId}@test.com`;
    const viewerEmail = `viewer.${fixtureId}@test.com`;
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

    // Register BRAND_ADMIN — WITHOUT brandName (no phantom brand)
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

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: operatorEmail, password: "Password123!" },
    });
    await app.prisma.user.update({
      where: { email: operatorEmail },
      data: { brandId: testBrandId, role: "OPERATOR" },
    });
    const operatorLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: operatorEmail, password: "Password123!" },
    });
    operatorCookie = `galileo_at=${parseCookies(operatorLogin).galileo_at}`;

    // Register ADMIN — WITHOUT brandName
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

    // Register VIEWER — WITHOUT brandName
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: viewerEmail, password: "Password123!" },
    });
    await app.prisma.user.update({
      where: { email: viewerEmail },
      data: { role: "VIEWER" },
    });
    const vLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: viewerEmail, password: "Password123!" },
    });
    viewerCookie = `galileo_at=${parseCookies(vLogin).galileo_at}`;

    // Other BRAND_ADMIN — WITHOUT brandName
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

  function injectCsv(csvContent: string, cookie: string, query: string = "") {
    const boundary = "----TestBoundary";
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="products.csv"',
      "Content-Type: text/csv",
      "",
      csvContent,
      `--${boundary}--`,
    ].join("\r\n");

    return app.inject({
      method: "POST",
      url: `/products/batch-import${query}`,
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        cookie,
        "x-galileo-client": "1",
      },
      payload: body,
    });
  }

  it("should import valid CSV with 5 products (201)", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Bag A", VALID_GTIN_13, "SN001", "Leather Goods", "Desc A", "leather"],
      ["Bag B", VALID_GTIN_13, "SN002", "Leather Goods", "Desc B", "leather"],
      ["Watch C", VALID_GTIN_13, "SN003", "Watches", "Desc C", "steel"],
      ["Ring D", VALID_GTIN_13, "SN004", "Jewelry", "Desc D", "gold"],
      ["Perf E", VALID_GTIN_13, "SN005", "Fragrances", "Desc E", ""],
    ]);

    const res = await injectCsv(csv, brandAdminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(201);
    const data = res.json();
    expect(data.success).toBe(true);
    expect(data.data.dryRun).toBe(false);
    expect(data.data.created).toBe(5);
    expect(data.data.errors).toHaveLength(0);

    // Verify products exist in DB
    const products = await app.prisma.product.findMany({
      where: { gtin: VALID_GTIN_13 },
    });
    expect(products).toHaveLength(5);
  });

  it("should return row-level validation feedback during dry-run", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Good", VALID_GTIN_13, "DRY001", "Watches", "", ""],
      ["Bad", "0000000000001", "DRY002", "Watches", "", ""],
    ]);

    const res = await injectCsv(csv, brandAdminCookie);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.success).toBe(true);
    expect(data.data.dryRun).toBe(true);
    expect(data.data.created).toBe(0);
    expect(data.data.summary).toEqual({
      totalRows: 2,
      acceptedRows: 1,
      rejectedRows: 1,
    });
    expect(data.data.errors).toHaveLength(1);
    expect(data.data.errors[0]).toMatchObject({
      row: 3,
      field: "gtin",
    });
    expect(data.data.rows).toEqual([
      expect.objectContaining({ row: 2, status: "accepted" }),
      expect.objectContaining({ row: 3, status: "rejected" }),
    ]);

    const products = await app.prisma.product.findMany({
      where: { gtin: VALID_GTIN_13 },
    });
    expect(products).toHaveLength(0);
  });

  it("stores imported materials in typed passport metadata", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Bag A", VALID_GTIN_13, "MAT001", "Leather Goods", "Desc A", "leather"],
    ]);

    const res = await injectCsv(csv, brandAdminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(201);
    expect(res.json().data.dryRun).toBe(false);
    expect(res.json().data.created).toBe(1);

    const importedProduct = await app.prisma.product.findUnique({
      where: {
        gtin_serialNumber: {
          gtin: VALID_GTIN_13,
          serialNumber: "MAT001",
        },
      },
      include: {
        passport: true,
      },
    });

    const authoring = readProductPassportAuthoringMetadata(
      importedProduct?.passport?.metadata,
    );
    expect(authoring.materials).toEqual([
      {
        name: "leather",
        percentage: 100,
      },
    ]);
  });

  it("should preserve multiline quoted CSV fields during import", async () => {
    const csv = [
      'name,gtin,"serial number",category,description,materials',
      `"Bag A",${VALID_GTIN_13},"MULTI001","Leather Goods","First line`,
      `Second line","leather"`,
    ].join("\n");

    const res = await injectCsv(csv, brandAdminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(201);
    expect(res.json().data.created).toBe(1);

    const importedProduct = await app.prisma.product.findUnique({
      where: {
        gtin_serialNumber: {
          gtin: VALID_GTIN_13,
          serialNumber: "MULTI001",
        },
      },
    });

    expect(importedProduct?.description).toBe("First line\nSecond line");
  });

  it("should report error for duplicate GTIN+serial within CSV", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Item A", VALID_GTIN_13, "DUPE001", "Jewelry", "", ""],
      ["Item B", VALID_GTIN_13, "DUPE001", "Jewelry", "", ""],
    ]);

    const res = await injectCsv(csv, brandAdminCookie);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.data.created).toBe(0);
    expect(data.data.errors).toHaveLength(1);
    expect(data.data.errors[0].message).toContain("Duplicate");
  });

  it("should not disclose whether a duplicate exists in another workspace", async () => {
    await app.prisma.product.create({
      data: {
        gtin: VALID_GTIN_13,
        serialNumber: "XWORK001",
        did: `did:galileo:${fixtureId}:xwork001`,
        name: "Other Workspace Product",
        category: "Watches",
        brandId: otherBrandId,
      },
    });

    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Item A", VALID_GTIN_13, "XWORK001", "Watches", "", ""],
    ]);

    const res = await injectCsv(csv, brandAdminCookie);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.errors).toEqual([
      expect.objectContaining({
        row: 2,
        field: "gtin",
        message: "A product with this GTIN and serial number already exists",
      }),
    ]);
  });

  it("should return 0 created for empty CSV (header only)", async () => {
    const csv = "name,gtin,serialNumber,category,description,materials\n";
    const res = await injectCsv(csv, brandAdminCookie);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.data.dryRun).toBe(true);
    expect(data.data.created).toBe(0);
    expect(data.data.errors).toHaveLength(0);
  });

  it("should return 400 when exceeding 500 rows", async () => {
    const header = [
      "name",
      "gtin",
      "serialNumber",
      "category",
      "description",
      "materials",
    ];
    const rows = [header];
    for (let i = 0; i < 501; i++) {
      rows.push([`Item${i}`, VALID_GTIN_13, `SN${i}`, "Watches", "", ""]);
    }
    const csv = buildCsv(rows);
    const res = await injectCsv(csv, brandAdminCookie);
    expect(res.statusCode).toBe(400);
  });

  it("should allow BRAND_ADMIN to import for own brand", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Mine", VALID_GTIN_13, "OWN001", "Fashion", "", ""],
    ]);
    const res = await injectCsv(csv, brandAdminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(201);
    expect(res.json().data.created).toBe(1);
  });

  it("should allow OPERATOR to import for own brand", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Mine", VALID_GTIN_13, "OP001", "Fashion", "", ""],
    ]);

    const res = await injectCsv(csv, operatorCookie, "?dryRun=false");
    expect(res.statusCode).toBe(201);
    expect(res.json().data.created).toBe(1);

    const product = await app.prisma.product.findUnique({
      where: {
        gtin_serialNumber: {
          gtin: VALID_GTIN_13,
          serialNumber: "OP001",
        },
      },
    });
    expect(product?.brandId).toBe(testBrandId);
  });

  it("should reject VIEWER role with 403", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["X", VALID_GTIN_13, "V001", "Fashion", "", ""],
    ]);
    const res = await injectCsv(csv, viewerCookie);
    expect(res.statusCode).toBe(403);
  });

  it("should reject unauthenticated request with 401", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["X", VALID_GTIN_13, "U001", "Fashion", "", ""],
    ]);
    const res = await injectCsv(csv, "galileo_at=invalid");
    expect(res.statusCode).toBe(401);
  });

  it("should return 400 for malformed CSV (missing columns)", async () => {
    const csv = "name,gtin\nTest,123\n";
    const res = await injectCsv(csv, brandAdminCookie);
    expect(res.statusCode).toBe(400);
  });

  it("should roll back all rows when one is invalid in transaction mode (default)", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Good", VALID_GTIN_13, "TX001", "Watches", "", ""],
      ["Bad", "0000000000001", "TX002", "Watches", "", ""],
    ]);

    const res = await injectCsv(csv, brandAdminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(400);
    const data = res.json();
    expect(data.success).toBe(false);
    expect(data.data.created).toBe(0);
    expect(data.data.errors.length).toBeGreaterThan(0);
  });

  it("should reject commit when dry-run errors remain", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Good1", VALID_GTIN_13, "P001", "Watches", "", ""],
      ["Bad1", "0000000000001", "P002", "Watches", "", ""],
      ["Good2", VALID_GTIN_13, "P003", "Jewelry", "", ""],
    ]);

    const res = await injectCsv(csv, brandAdminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(400);
    const data = res.json();
    expect(data.success).toBe(false);
    expect(data.data.dryRun).toBe(false);
    expect(data.data.created).toBe(0);
    expect(data.data.errors).toHaveLength(1);

    const products = await app.prisma.product.findMany({
      where: { gtin: VALID_GTIN_13 },
    });
    expect(products).toHaveLength(0);
  });

  it("should require ADMIN to provide brandId", async () => {
    const csv = buildCsv([
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      ["Admin Item", VALID_GTIN_13, "ADM001", "Fashion", "", ""],
    ]);

    // Without brandId query param
    const res = await injectCsv(csv, adminCookie, "?dryRun=false");
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("brandId");

    // With brandId
    const res2 = await injectCsv(
      csv,
      adminCookie,
      `?dryRun=false&brandId=${testBrandId}`,
    );
    expect(res2.statusCode).toBe(201);
    expect(res2.json().data.created).toBe(1);
  });
});
