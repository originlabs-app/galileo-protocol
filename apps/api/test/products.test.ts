import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb, nextFixtureId } from "./helpers.js";
import { hashPassword } from "../src/utils/password.js";
import { readProductPassportAuthoringMetadata } from "@galileo/shared";

// Valid GTINs (GS1 check digit verified)
const VALID_GTIN_13 = "4006381333931";
const VALID_GTIN_13_B = "5901234123457";
const TEST_PASSWORD = "password123";

function fixtureEmail(localPart: string, fixtureId: string): string {
  return `${localPart}.${fixtureId}@test.com`;
}

describe("Product CRUD endpoints", () => {
  let app: FastifyInstance;

  // Tokens for different roles
  let brandAdminCookie: string;
  let operatorCookie: string;
  let viewerCookie: string;
  let adminCookie: string;
  let otherBrandAdminCookie: string;

  let testBrandId: string;
  let otherBrandId: string;
  let fixtureId: string;
  let brandAdminEmail: string;
  let operatorEmail: string;
  let viewerEmail: string;
  let adminEmail: string;
  let otherBrandAdminEmail: string;
  let noBrandCreateEmail: string;
  let noBrandStatsEmail: string;

  async function createFixtureUser(params: {
    email: string;
    role: "ADMIN" | "BRAND_ADMIN" | "OPERATOR" | "VIEWER";
    brandId?: string | null;
  }) {
    return app.prisma.user.create({
      data: {
        email: params.email,
        passwordHash: await hashPassword(TEST_PASSWORD),
        role: params.role,
        brandId: params.brandId ?? null,
      },
    });
  }

  async function loginAs(email: string) {
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email,
        password: TEST_PASSWORD,
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const cookies = parseCookies(loginRes);
    return `galileo_at=${cookies.galileo_at}`;
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDb(app.prisma);
    fixtureId = nextFixtureId("products");
    brandAdminEmail = fixtureEmail("brand-admin", fixtureId);
    operatorEmail = fixtureEmail("operator", fixtureId);
    viewerEmail = fixtureEmail("viewer", fixtureId);
    adminEmail = fixtureEmail("admin", fixtureId);
    otherBrandAdminEmail = fixtureEmail("other-brand-admin", fixtureId);
    noBrandCreateEmail = fixtureEmail("nobrand-create", fixtureId);
    noBrandStatsEmail = fixtureEmail("nobrand-stats", fixtureId);
    const primaryBrandSlug = `test-luxury-brand-${fixtureId}`;
    const secondaryBrandSlug = `other-brand-${fixtureId}`;

    // Create test brand
    const brand = await app.prisma.brand.create({
      data: {
        name: `Test Luxury Brand ${fixtureId}`,
        slug: primaryBrandSlug,
        did: `did:galileo:brand:${primaryBrandSlug}`,
      },
    });
    testBrandId = brand.id;

    // Create another brand
    const otherBrand = await app.prisma.brand.create({
      data: {
        name: `Other Brand ${fixtureId}`,
        slug: secondaryBrandSlug,
        did: `did:galileo:brand:${secondaryBrandSlug}`,
      },
    });
    otherBrandId = otherBrand.id;

    await createFixtureUser({
      email: brandAdminEmail,
      role: "BRAND_ADMIN",
      brandId: testBrandId,
    });
    brandAdminCookie = await loginAs(brandAdminEmail);

    await createFixtureUser({
      email: operatorEmail,
      role: "OPERATOR",
      brandId: testBrandId,
    });
    operatorCookie = await loginAs(operatorEmail);

    await createFixtureUser({
      email: viewerEmail,
      role: "VIEWER",
      brandId: testBrandId,
    });
    viewerCookie = await loginAs(viewerEmail);

    await createFixtureUser({
      email: adminEmail,
      role: "ADMIN",
    });
    adminCookie = await loginAs(adminEmail);

    await createFixtureUser({
      email: otherBrandAdminEmail,
      role: "BRAND_ADMIN",
      brandId: otherBrandId,
    });
    otherBrandAdminCookie = await loginAs(otherBrandAdminEmail);
  });

  // ─── POST /products ─────────────────────────────────────────

  describe("POST /products", () => {
    it("creates product with valid GTIN and returns 201 with auto-generated DID and Digital Link", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-001",
          name: "Luxury Watch",
          description: "A beautiful timepiece",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);

      // Check product fields
      const product = body.data.product;
      expect(product.gtin).toBe(VALID_GTIN_13);
      expect(product.serialNumber).toBe("SN-001");
      expect(product.name).toBe("Luxury Watch");
      expect(product.description).toBe("A beautiful timepiece");
      expect(product.category).toBe("Watches");
      expect(product.status).toBe("DRAFT");
      expect(product.brandId).toBe(testBrandId);
      expect(product.did).toBe(`did:galileo:01:0${VALID_GTIN_13}:21:SN-001`);

      // Check passport
      const passport = body.data.passport;
      expect(passport).toBeDefined();
      expect(passport.digitalLink).toBe(
        `https://id.galileoprotocol.io/01/0${VALID_GTIN_13}/21/SN-001`,
      );
      expect(passport.productId).toBe(product.id);

      // Verify CREATED event was logged
      const events = await app.prisma.productEvent.findMany({
        where: { productId: product.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe("CREATED");
    });

    it("allows OPERATOR to create products with the shared authoring contract", async () => {
      const materials = [{ name: "Brushed Steel", percentage: 100 }];
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: operatorCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-OP-001",
          name: "Operator Product",
          category: "Jewelry",
          materials,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.product.brandId).toBe(testBrandId);

      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: body.data.product.id },
      });
      expect(
        readProductPassportAuthoringMetadata(passport?.metadata).materials,
      ).toEqual(materials);
    });

    it("non-ADMIN without brandId gets 403", async () => {
      await createFixtureUser({
        email: noBrandCreateEmail,
        role: "OPERATOR",
      });
      const noBrandCookie = await loginAs(noBrandCreateEmail);

      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: noBrandCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-NOBRAND",
          name: "Blocked Product",
          category: "Watches",
          brandId: otherBrandId,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("FORBIDDEN");
    });

    it("ignores body brandId for non-ADMIN users and keeps the assigned workspace", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: operatorCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-OP-BOUNDARY",
          name: "Operator Workspace Product",
          category: "Jewelry",
          brandId: otherBrandId,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data.product.brandId).toBe(testBrandId);
    });

    it("returns 400 for invalid GTIN check digit", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: "4006381333932", // wrong check digit (should be 1)
          serialNumber: "SN-002",
          name: "Bad GTIN Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Invalid GTIN");
    });

    it("returns 400 for serials that cannot generate a Galileo DID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN/002",
          name: "Bad Serial Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Serial number");
      expect(body.error.details.serialNumber?.[0]).toContain("hyphens");
    });

    it("creates product when serial uses the shared 20-character DID limit", async () => {
      const serialNumber = "12345678901234567890";
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber,
          name: "Max Serial Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.product.serialNumber).toBe(serialNumber);
      expect(body.data.product.did).toBe(
        `did:galileo:01:0${VALID_GTIN_13}:21:${serialNumber}`,
      );
      expect(body.data.passport.digitalLink).toBe(
        `https://id.galileoprotocol.io/01/0${VALID_GTIN_13}/21/${serialNumber}`,
      );
    });

    it("returns 400 for non-numeric GTIN", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: "400638ABCDEFG",
          serialNumber: "SN-003",
          name: "Bad GTIN Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it("returns 400 for wrong-length GTIN", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: "12345",
          serialNumber: "SN-004",
          name: "Short GTIN Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 409 for duplicate gtin+serial combination", async () => {
      // First creation
      const first = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-DUP",
          name: "First Product",
          category: "Watches",
        },
      });
      expect(first.statusCode).toBe(201);

      // Duplicate
      const second = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-DUP",
          name: "Duplicate Product",
          category: "Jewelry",
        },
      });

      expect(second.statusCode).toBe(409);
      const body = second.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CONFLICT");
    });

    it("returns 401 without auth", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-NOAUTH",
          name: "No Auth Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 403 for VIEWER role", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: viewerCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-VIEWER",
          name: "Viewer Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 400 for missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          // missing serialNumber, name, category
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("creates product with materials and stores them in passport metadata", async () => {
      const materials = [
        { name: "Calfskin Leather", percentage: 65 },
        { name: "Cotton Canvas", percentage: 30 },
        { name: "Brass Hardware", percentage: 5 },
      ];

      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-MAT-001",
          name: "Material Product",
          category: "Leather Goods",
          materials,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);

      // Verify materials stored in passport metadata
      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: body.data.product.id },
      });
      const metadata = passport!.metadata as Record<string, unknown>;
      expect(metadata).toMatchObject({
        authoring: {
          version: 1,
          materials,
        },
      });
      expect(readProductPassportAuthoringMetadata(metadata).materials).toEqual(
        materials,
      );
    });

    it("creates product without materials (field is optional)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-NOMAT-001",
          name: "No Material Product",
          category: "Watches",
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("rejects materials with invalid structure", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "SN-BADMAT-001",
          name: "Bad Material Product",
          category: "Watches",
          materials: [{ name: "", percentage: 200 }],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── GET /products ──────────────────────────────────────────

  describe("GET /products", () => {
    beforeEach(async () => {
      // Seed some products for the test brand
      for (let i = 0; i < 25; i++) {
        await app.inject({
          method: "POST",
          url: "/products",
          headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
          payload: {
            gtin: VALID_GTIN_13,
            serialNumber: `LIST-SN-${String(i).padStart(3, "0")}`,
            name: `Product ${i}`,
            category: "Watches",
          },
        });
      }

      // Seed a product for the other brand
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: otherBrandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13_B,
          serialNumber: "OTHER-001",
          name: "Other Brand Product",
          category: "Jewelry",
        },
      });
    });

    it("returns brand-scoped paginated list with default pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.products).toHaveLength(20); // default limit
      expect(body.data.pagination.total).toBe(25);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(20);
      expect(body.data.pagination.totalPages).toBe(2);

      // Should not include other brand's products
      for (const product of body.data.products) {
        expect(product.brandId).toBe(testBrandId);
      }
    });

    it("returns correct page with custom pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products?page=2&limit=5",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.products).toHaveLength(5);
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.limit).toBe(5);
      expect(body.data.pagination.total).toBe(25);
      expect(body.data.pagination.totalPages).toBe(5);
    });

    it("returns empty array for page beyond total", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products?page=100&limit=20",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.products).toHaveLength(0);
      expect(body.data.pagination.total).toBe(25);
    });

    it("ADMIN sees all brands' products", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products?limit=100",
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.pagination.total).toBe(26); // 25 + 1 from other brand
    });

    it("VIEWER can list products (read access)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products",
        headers: { cookie: viewerCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // VIEWER belongs to testBrand, so should see testBrand products
      expect(body.data.pagination.total).toBe(25);
    });

    it("returns 401 without auth", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products",
      });

      expect(response.statusCode).toBe(401);
    });

    it("filters by status", async () => {
      // All seeded products are DRAFT. Change a few to ACTIVE.
      const allProducts = await app.prisma.product.findMany({
        where: { brandId: testBrandId },
        take: 3,
      });
      for (const p of allProducts) {
        await app.prisma.product.update({
          where: { id: p.id },
          data: { status: "ACTIVE" },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: "/products?status=ACTIVE&limit=100",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.pagination.total).toBe(3);
      for (const product of body.data.products) {
        expect(product.status).toBe("ACTIVE");
      }
    });

    it("filters by category", async () => {
      // All 25 seeded products have category "Watches"
      // Create one product with a different category
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "CAT-FILTER-001",
          name: "Category Filter Product",
          category: "Jewelry",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/products?category=Jewelry&limit=100",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.pagination.total).toBe(1);
      expect(body.data.products[0].category).toBe("Jewelry");
    });

    it("combines status and category filters", async () => {
      // Create a product with different category and make it ACTIVE
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "COMBO-FILTER-001",
          name: "Combo Filter Product",
          category: "Jewelry",
        },
      });
      const productId = createRes.json().data.product.id;
      await app.prisma.product.update({
        where: { id: productId },
        data: { status: "ACTIVE" },
      });

      const response = await app.inject({
        method: "GET",
        url: "/products?status=ACTIVE&category=Jewelry&limit=100",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.pagination.total).toBe(1);
      expect(body.data.products[0].status).toBe("ACTIVE");
      expect(body.data.products[0].category).toBe("Jewelry");
    });

    it("returns 400 for invalid status value", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products?status=INVALID",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── GET /products/:id ──────────────────────────────────────

  describe("GET /products/:id", () => {
    let productId: string;

    beforeEach(async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "DETAIL-001",
          name: "Detail Product",
          description: "For detail testing",
          category: "Watches",
        },
      });
      productId = createRes.json().data.product.id;
    });

    it("returns product with passport and events", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      const product = body.data.product;
      expect(product.id).toBe(productId);
      expect(product.name).toBe("Detail Product");
      expect(product.passport).toBeDefined();
      expect(product.passport.digitalLink).toContain("id.galileoprotocol.io");
      expect(product.events).toBeDefined();
      expect(product.events.length).toBeGreaterThanOrEqual(1);
      expect(product.events[0].type).toBe("CREATED");
    });

    it("returns 404 for non-existent product", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products/nonexistent-id-12345",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 for other brand's product", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}`,
        headers: { cookie: otherBrandAdminCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it("ADMIN can see any brand's product", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}`,
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.product.id).toBe(productId);
    });

    it("returns 401 without auth", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${productId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── GET /products/stats ────────────────────────────────────

  describe("GET /products/stats", () => {
    it("returns 200 with byStatus, verificationCount, recentEvents", async () => {
      // Create a product to have some data
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "STATS-001",
          name: "Stats Product",
          category: "Watches",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.byStatus).toBeDefined();
      expect(typeof body.data.verificationCount).toBe("number");
      expect(Array.isArray(body.data.recentEvents)).toBe(true);
    });

    it("byStatus counts match actual product statuses", async () => {
      // Create 2 DRAFT products
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "STATS-D1",
          name: "Draft 1",
          category: "Watches",
        },
      });
      const createRes2 = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "STATS-D2",
          name: "Draft 2",
          category: "Watches",
        },
      });

      // Make one ACTIVE via direct DB update
      const productId2 = createRes2.json().data.product.id;
      await app.prisma.product.update({
        where: { id: productId2 },
        data: { status: "ACTIVE" },
      });

      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.byStatus.DRAFT).toBe(1);
      expect(body.data.byStatus.ACTIVE).toBe(1);
    });

    it("verificationCount reflects VERIFIED events", async () => {
      // Create and make a product available for verification
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "STATS-V1",
          name: "Verifiable Product",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      // Make it ACTIVE so it can be verified
      await app.prisma.product.update({
        where: { id: productId },
        data: { status: "ACTIVE" },
      });

      // Verify the product (public endpoint, no CSRF needed)
      await app.inject({
        method: "POST",
        url: `/products/${productId}/verify`,
        headers: { "x-galileo-client": "1" },
      });

      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.verificationCount).toBe(1);
    });

    it("recentEvents returns up to 10 events ordered by createdAt desc", async () => {
      // Create multiple products to generate multiple CREATED events
      for (let i = 0; i < 12; i++) {
        await app.inject({
          method: "POST",
          url: "/products",
          headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
          payload: {
            gtin: VALID_GTIN_13,
            serialNumber: `STATS-E${String(i).padStart(3, "0")}`,
            name: `Event Product ${i}`,
            category: "Watches",
          },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.recentEvents).toHaveLength(10);

      // Check ordering: first event should be newest
      const dates = body.data.recentEvents.map((e: { createdAt: string }) =>
        new Date(e.createdAt).getTime(),
      );
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it("recentEvents includes product name and gtin", async () => {
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "STATS-PN1",
          name: "Named Product",
          category: "Watches",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.recentEvents.length).toBeGreaterThan(0);
      const event = body.data.recentEvents[0];
      expect(event.product.name).toBe("Named Product");
      expect(event.product.gtin).toBe(VALID_GTIN_13);
    });

    it("brand-scoped: BRAND_ADMIN only sees own brand stats", async () => {
      // Create product for test brand
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "STATS-B1",
          name: "My Brand Product",
          category: "Watches",
        },
      });

      // Create product for other brand
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: otherBrandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13_B,
          serialNumber: "STATS-OB1",
          name: "Other Brand Product",
          category: "Jewelry",
        },
      });

      // Test brand admin should only see 1 product
      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.byStatus.DRAFT).toBe(1);

      // ADMIN should see 2 products
      const adminResponse = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: adminCookie },
      });

      expect(adminResponse.statusCode).toBe(200);
      const adminBody = adminResponse.json();
      expect(adminBody.data.byStatus.DRAFT).toBe(2);
    });

    it("GET /products/stats denies non-ADMIN without brandId", async () => {
      await createFixtureUser({
        email: noBrandStatsEmail,
        role: "OPERATOR",
      });
      const noBrandCookie = await loginAs(noBrandStatsEmail);

      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
        headers: { cookie: noBrandCookie },
      });

      expect(response.statusCode).toBe(403);
    });

    it("unauthenticated request gets 401", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products/stats",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── PATCH /products/:id ────────────────────────────────────

  describe("PATCH /products/:id", () => {
    let draftProductId: string;

    beforeEach(async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "PATCH-001",
          name: "Patchable Product",
          description: "Original description",
          category: "Watches",
        },
      });
      draftProductId = createRes.json().data.product.id;
    });

    it("updates name, description, category on DRAFT product and creates UPDATED event", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          name: "Updated Name",
          description: "Updated description",
          category: "Jewelry",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      const product = body.data.product;
      expect(product.name).toBe("Updated Name");
      expect(product.description).toBe("Updated description");
      expect(product.category).toBe("Jewelry");

      // Verify UPDATED event was created
      const updatedEvent = product.events.find(
        (e: { type: string }) => e.type === "UPDATED",
      );
      expect(updatedEvent).toBeDefined();
    });

    it("rejects update on ACTIVE product", async () => {
      // Change status to ACTIVE
      await app.prisma.product.update({
        where: { id: draftProductId },
        data: { status: "ACTIVE" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          name: "Should Not Update",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.message).toContain("non-DRAFT");
    });

    it("rejects gtin/serialNumber/did/status changes with 400", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: "9999999999999",
          serialNumber: "CHANGED",
          did: "did:galileo:01:fake:21:fake",
          status: "ACTIVE",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 404 for other brand's product", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { cookie: otherBrandAdminCookie, "x-galileo-client": "1" },
        payload: {
          name: "Intruder Update",
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 for non-existent product", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/products/nonexistent-id-12345",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          name: "Ghost Update",
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 403 for VIEWER role", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { cookie: viewerCookie, "x-galileo-client": "1" },
        payload: {
          name: "Viewer Update",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 401 without auth", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { "x-galileo-client": "1" },
        payload: {
          name: "No Auth Update",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("updates product with materials stored in passport metadata", async () => {
      const materials = [
        { name: "18K Gold", percentage: 75 },
        { name: "Diamond", percentage: 25 },
      ];

      const response = await app.inject({
        method: "PATCH",
        url: `/products/${draftProductId}`,
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          materials,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify materials stored in passport metadata
      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: draftProductId },
      });
      const metadata = passport!.metadata as Record<string, unknown>;
      expect(metadata).toMatchObject({
        authoring: {
          version: 1,
          materials,
        },
      });
      expect(readProductPassportAuthoringMetadata(metadata).materials).toEqual(
        materials,
      );
    });
  });
});
