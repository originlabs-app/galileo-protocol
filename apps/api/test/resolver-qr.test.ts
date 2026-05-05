import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb, nextFixtureId } from "./helpers.js";
import { JSONLD_CONTEXT } from "../src/routes/resolver/resolve.js";
import { writeProductPassportAuthoringMetadata } from "@galileo/shared";

// Valid GTINs (GS1 check digit verified)
const VALID_GTIN = "4006381333931";

describe("Resolver & QR endpoints", () => {
  let app: FastifyInstance;

  let brandAdminCookie: string;
  let otherBrandAdminCookie: string;
  let testBrandId: string;
  let otherBrandId: string;
  let testBrandDid: string;

  // Store products created in beforeEach
  let activeProductId: string;
  let activeProductGtin: string;
  let activeProductSerial: string;
  let draftProductId: string;
  let draftProductGtin: string;
  let draftProductSerial: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDb(app.prisma);
    const fixtureId = nextFixtureId("resolver");
    const testBrandSlug = `resolver-test-brand-${fixtureId}`;
    const otherBrandSlug = `other-resolver-brand-${fixtureId}`;
    const brandAdminEmail = `resolver-admin.${fixtureId}@test.com`;
    const otherBrandAdminEmail = `other-resolver-admin.${fixtureId}@test.com`;
    testBrandDid = `did:galileo:brand:${testBrandSlug}`;

    // Create test brand
    const brand = await app.prisma.brand.create({
      data: {
        name: "Resolver Test Brand",
        slug: testBrandSlug,
        did: testBrandDid,
      },
    });
    testBrandId = brand.id;

    // Create other brand
    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Resolver Brand",
        slug: otherBrandSlug,
        did: `did:galileo:brand:${otherBrandSlug}`,
      },
    });
    otherBrandId = otherBrand.id;

    // Register BRAND_ADMIN user
    const brandAdminRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: brandAdminEmail, password: "password123" },
    });
    const brandAdminUser = brandAdminRes.json().data.user;
    await app.prisma.user.update({
      where: { id: brandAdminUser.id },
      data: { role: "BRAND_ADMIN", brandId: testBrandId },
    });
    const brandAdminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: brandAdminEmail, password: "password123" },
    });
    const brandAdminCookies = parseCookies(brandAdminLogin);
    brandAdminCookie = `galileo_at=${brandAdminCookies.galileo_at}`;

    // Register other BRAND_ADMIN
    const otherRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: otherBrandAdminEmail,
        password: "password123",
      },
    });
    const otherUser = otherRes.json().data.user;
    await app.prisma.user.update({
      where: { id: otherUser.id },
      data: { role: "BRAND_ADMIN", brandId: otherBrandId },
    });
    const otherLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: otherBrandAdminEmail,
        password: "password123",
      },
    });
    const otherCookies = parseCookies(otherLogin);
    otherBrandAdminCookie = `galileo_at=${otherCookies.galileo_at}`;

    // Create a DRAFT product
    draftProductGtin = VALID_GTIN;
    draftProductSerial = "SN-DRAFT-001";
    const draftRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      payload: {
        gtin: draftProductGtin,
        serialNumber: draftProductSerial,
        name: "Draft Resolver Product",
        description: "A draft product for resolver tests",
        category: "Watches",
      },
    });
    draftProductId = draftRes.json().data.product.id;

    // Create and MINT a product (ACTIVE)
    activeProductGtin = VALID_GTIN;
    activeProductSerial = "SN-ACTIVE-001";
    const activeRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      payload: {
        gtin: activeProductGtin,
        serialNumber: activeProductSerial,
        name: "Active Resolver Product",
        description: "An active product for resolver tests",
        category: "Jewelry",
      },
    });
    activeProductId = activeRes.json().data.product.id;

    // Mint the product to make it ACTIVE
    await app.inject({
      method: "POST",
      url: `/products/${activeProductId}/mint`,
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
    });
  });

  // ─── GS1 Digital Link Resolver ───────────────────────────────

  describe("GET /01/:gtin/21/:serial (GS1 Resolver)", () => {
    it("returns 200 with application/ld+json for ACTIVE product", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/ld+json");

      const body = response.json();
      expect(body["@context"]).toEqual(JSONLD_CONTEXT);
      expect(body["@type"]).toBe("IndividualProduct");
      expect(body["@id"]).toBe(
        `did:galileo:01:0${activeProductGtin}:21:${activeProductSerial}`,
      );
      expect(body.name).toBe("Active Resolver Product");
      expect(body.description).toBe("An active product for resolver tests");
      expect(body.gtin).toBe("0" + activeProductGtin); // 14-digit padded
      expect(body.serialNumber).toBe(activeProductSerial);
      expect(body.category).toBe("Jewelry");
      expect(body.status).toBe("verified");

      // Passport fields
      expect(body.passport).toBeDefined();
      expect(body.passport.digitalLink).toContain("id.galileoprotocol.io");
      expect(body.passport.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(body.passport.tokenAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(body.passport.chainId).toBe(84532);
      expect(body.passport.mintedAt).toBeDefined();

      // Brand fields (C3: @type Brand, @id instead of custom did)
      expect(body.brand).toBeDefined();
      expect(body.brand["@type"]).toBe("Brand");
      expect(body.brand["@id"]).toBe(testBrandDid);
      expect(body.brand.name).toBe("Resolver Test Brand");
    });

    it("returns 404 for non-existent product", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/01/0000000000000/21/NONEXISTENT",
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 for DRAFT product (no data leak)", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${draftProductGtin}/21/${draftProductSerial}`,
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      // Should not leak any product data
      expect(body).not.toHaveProperty("data");
    });

    it("works without authentication (public endpoint)", async () => {
      // No cookie header — should still work
      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
        // No headers, no cookies
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/ld+json");
    });

    it("correctly decodes URL-encoded serial number", async () => {
      const specialSerial = "SN/TEST#123?A B";
      const specialProduct = await app.prisma.product.create({
        data: {
          gtin: VALID_GTIN,
          serialNumber: specialSerial,
          did: "did:galileo:test:special-serial-product",
          name: "Special Serial Product",
          category: "Accessories",
          status: "ACTIVE",
          brandId: testBrandId,
        },
      });

      await app.prisma.productPassport.create({
        data: {
          productId: specialProduct.id,
          digitalLink: `https://id.galileoprotocol.io/01/0${VALID_GTIN}/21/${encodeURIComponent(specialSerial)}`,
          mintedAt: new Date(),
          chainId: 84532,
        },
      });

      // Resolve with URL-encoded serial
      const encodedSerial = encodeURIComponent(specialSerial);
      const response = await app.inject({
        method: "GET",
        url: `/01/${VALID_GTIN}/21/${encodedSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe("Special Serial Product");
    });

    it("resolves product when using 14-digit padded GTIN (DB stores 13-digit)", async () => {
      // The DB stores the 13-digit GTIN. Querying with the 14-digit padded
      // form (leading zero added) should still resolve successfully.
      const gtin14 = "0" + activeProductGtin; // e.g., "04006381333931"
      const response = await app.inject({
        method: "GET",
        url: `/01/${gtin14}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/ld+json");
      const body = response.json();
      expect(body.name).toBe("Active Resolver Product");
      expect(body.gtin).toBe(gtin14); // always returns 14-digit padded
      expect(body.status).toBe("verified");
    });

    it("resolves product with original 13-digit GTIN as well", async () => {
      // Querying with the original 13-digit GTIN should also work
      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe("Active Resolver Product");
      expect(body.status).toBe("verified");
    });

    it("includes hasMaterialComposition when product has materials in metadata", async () => {
      // Store materials in product passport metadata
      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: activeProductId },
      });
      await app.prisma.productPassport.update({
        where: { id: passport!.id },
        data: {
          metadata: writeProductPassportAuthoringMetadata(passport!.metadata, {
            materials: [
              { name: "Calfskin Leather", percentage: 65 },
              { name: "Cotton Canvas", percentage: 30 },
              { name: "Brass Hardware", percentage: 5 },
            ],
          }),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.hasMaterialComposition).toBeDefined();
      expect(body.hasMaterialComposition).toHaveLength(3);
      expect(body.hasMaterialComposition[0].name).toBe("Calfskin Leather");
      expect(body.hasMaterialComposition[0].percentage).toBe(65);
      expect(body.hasMaterialComposition[1].name).toBe("Cotton Canvas");
      expect(body.hasMaterialComposition[2].name).toBe("Brass Hardware");
    });

    it("includes hasMaterialComposition when product uses legacy metadata.materials", async () => {
      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: activeProductId },
      });
      await app.prisma.productPassport.update({
        where: { id: passport!.id },
        data: {
          metadata: {
            materials: [
              { name: "Silk Lining", percentage: 40 },
              { name: "Lambskin", percentage: 60 },
            ],
          },
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().hasMaterialComposition).toEqual([
        { name: "Silk Lining", percentage: 40 },
        { name: "Lambskin", percentage: 60 },
      ]);
    });

    it("omits hasMaterialComposition when product has no materials in metadata", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.hasMaterialComposition).toBeUndefined();
    });

    it("omits hasMaterialComposition when metadata materials is empty array", async () => {
      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: activeProductId },
      });
      await app.prisma.productPassport.update({
        where: { id: passport!.id },
        data: {
          metadata: writeProductPassportAuthoringMetadata(passport!.metadata, {
            materials: [],
          }),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.hasMaterialComposition).toBeUndefined();
    });

    it("keeps linked media inside authoring metadata without exposing upload internals", async () => {
      const passport = await app.prisma.productPassport.findUnique({
        where: { productId: activeProductId },
      });
      await app.prisma.productPassport.update({
        where: { id: passport!.id },
        data: {
          metadata: writeProductPassportAuthoringMetadata(passport!.metadata, {
            media: [
              {
                kind: "image",
                url: "/uploads/products/active/example-image.jpg",
                cid: "bafkreiexamplecid",
                alt: "Front profile image",
                position: 0,
              },
            ],
          }),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/01/${activeProductGtin}/21/${activeProductSerial}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).not.toHaveProperty("imageUrl");
      expect(body).not.toHaveProperty("imageCid");
      expect(body.passport).not.toHaveProperty("metadata");
      expect(body.passport).not.toHaveProperty("media");
      expect(body.passport).toEqual(
        expect.objectContaining({
          digitalLink: expect.any(String),
          chainId: 84532,
        }),
      );
    });
  });

  // ─── QR Code Generation ──────────────────────────────────────

  describe("GET /products/:id/qr (QR Code Generation)", () => {
    it("returns image/png for ACTIVE product with default size", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("image/png");

      // Verify PNG header bytes (PNG magic number: 0x89 0x50 0x4E 0x47)
      const buffer = Buffer.from(response.rawPayload);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    });

    it("returns QR code at custom size", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr?size=500`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("image/png");

      // Should be a valid PNG
      const buffer = Buffer.from(response.rawPayload);
      expect(buffer[0]).toBe(0x89);
    });

    it("returns 400 for size below minimum (100)", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr?size=50`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("size");
    });

    it("returns 400 for size above maximum (1000)", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr?size=2000`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("size");
    });

    it("returns 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr`,
        // No cookie
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 400 for DRAFT product", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${draftProductId}/qr`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("unminted");
    });

    it("returns 404 for non-existent product", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/products/nonexistent-id-12345/qr",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 for other brand's product", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr`,
        headers: { cookie: otherBrandAdminCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 400 for non-numeric size parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr?size=abc`,
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(400);
    });

    it("responds in under 500ms", async () => {
      const start = Date.now();
      const response = await app.inject({
        method: "GET",
        url: `/products/${activeProductId}/qr`,
        headers: { cookie: brandAdminCookie },
      });
      const elapsed = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(elapsed).toBeLessThan(500);
    });
  });
});
