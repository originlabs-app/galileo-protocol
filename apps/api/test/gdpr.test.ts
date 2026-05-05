import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb } from "./helpers.js";
import { EventType } from "@galileo/shared";

const VALID_GTIN = "4006381333931";

describe("GDPR endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Data Export (GET /auth/me/data) ──────────────────────

  describe("GET /auth/me/data", () => {
    beforeEach(async () => {
      await cleanDb(app.prisma);
    });

    it("returns 200 with complete user data export", async () => {
      // Register user
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "export@test.com",
          password: "password123",
        },
      });
      expect(registerRes.statusCode).toBe(201);
      const userId = registerRes.json().data.user.id;
      const cookies = parseCookies(registerRes);

      // Create brand and assign to user
      const brand = await app.prisma.brand.create({
        data: {
          name: "Export Brand",
          slug: "export-brand-gdpr",
          did: "did:galileo:brand:export-brand-gdpr",
        },
      });
      await app.prisma.user.update({
        where: { id: userId },
        data: { brandId: brand.id },
      });

      const response = await app.inject({
        method: "GET",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.exportedAt).toBeDefined();
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe("export@test.com");
      expect(body.data.brand).toBeDefined();
      expect(body.data.brand.name).toBe("Export Brand");
      expect(body.data.products).toBeDefined();
      expect(body.data.events).toBeDefined();
    });

    it("does NOT include passwordHash or refreshToken in export", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "nopii@test.com",
          password: "password123",
        },
      });
      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.user.refreshToken).toBeUndefined();
    });

    it("returns brand: null and products: [] for user without brand", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "nobrand@test.com",
          password: "password123",
        },
      });
      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.brand).toBeNull();
      expect(body.data.products).toEqual([]);
    });

    it("includes products when user's brand has products", async () => {
      // Register user
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "withproducts@test.com",
          password: "password123",
        },
      });
      const userId = registerRes.json().data.user.id;

      // Create brand and assign to user as BRAND_ADMIN
      const brand = await app.prisma.brand.create({
        data: {
          name: "Products Brand",
          slug: "products-brand-gdpr",
          did: "did:galileo:brand:products-brand-gdpr",
        },
      });
      await app.prisma.user.update({
        where: { id: userId },
        data: { brandId: brand.id, role: "BRAND_ADMIN" },
      });

      // Re-login to get updated token
      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "withproducts@test.com",
          password: "password123",
        },
      });
      const loginCookies = parseCookies(loginRes);

      // Create a product
      await app.inject({
        method: "POST",
        url: "/products",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: {
          gtin: VALID_GTIN,
          serialNumber: "SN-EXPORT-001",
          name: "Export Test Product",
          category: "Watches",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.products.length).toBe(1);
      expect(body.data.products[0].name).toBe("Export Test Product");
    });

    it("includes events performed by user", async () => {
      // Register user
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "withevents@test.com",
          password: "password123",
        },
      });
      const userId = registerRes.json().data.user.id;

      // Create brand and assign to user as BRAND_ADMIN
      const brand = await app.prisma.brand.create({
        data: {
          name: "Events Brand",
          slug: "events-brand-gdpr",
          did: "did:galileo:brand:events-brand-gdpr",
        },
      });
      await app.prisma.user.update({
        where: { id: userId },
        data: { brandId: brand.id, role: "BRAND_ADMIN" },
      });

      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "withevents@test.com",
          password: "password123",
        },
      });
      const loginCookies = parseCookies(loginRes);

      // Create a product (generates a CREATED event)
      await app.inject({
        method: "POST",
        url: "/products",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: {
          gtin: VALID_GTIN,
          serialNumber: "SN-EVENT-001",
          name: "Event Test Product",
          category: "Watches",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.events.length).toBeGreaterThanOrEqual(1);
      expect(
        body.data.events.some(
          (e: { type: string }) => e.type === EventType.CREATED,
        ),
      ).toBe(true);
    });

    it("returns 401 without auth cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me/data",
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  // ─── Data Erasure (DELETE /auth/me/data) ──────────────────

  describe("DELETE /auth/me/data", () => {
    beforeEach(async () => {
      await cleanDb(app.prisma);
    });

    it("returns 200 and deletes user record from database", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "erasure@test.com",
          password: "password123",
        },
      });
      const cookies = parseCookies(registerRes);
      const userId = registerRes.json().data.user.id;

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: { confirm: "DELETE_MY_ACCOUNT" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toBe("All personal data has been deleted");
      expect(body.data.deletedAt).toBeDefined();

      // Verify user is gone from DB
      const deletedUser = await app.prisma.user.findUnique({
        where: { id: userId },
      });
      expect(deletedUser).toBeNull();
    });

    it("anonymizes events by setting performedBy to null", async () => {
      // Register user
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "anon-events@test.com",
          password: "password123",
        },
      });
      const userId = registerRes.json().data.user.id;

      // Create brand and assign to user as BRAND_ADMIN
      const brand = await app.prisma.brand.create({
        data: {
          name: "Anon Brand",
          slug: "anon-brand-gdpr",
          did: "did:galileo:brand:anon-brand-gdpr",
        },
      });
      await app.prisma.user.update({
        where: { id: userId },
        data: { brandId: brand.id, role: "BRAND_ADMIN" },
      });

      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "anon-events@test.com",
          password: "password123",
        },
      });
      const loginCookies = parseCookies(loginRes);

      // Create a product to generate events
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: {
          gtin: VALID_GTIN,
          serialNumber: "SN-ANON-001",
          name: "Anon Product",
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      // Verify events exist with performedBy set
      const eventsBefore = await app.prisma.productEvent.findMany({
        where: { performedBy: userId },
      });
      expect(eventsBefore.length).toBeGreaterThanOrEqual(1);

      // Delete user data
      await app.inject({
        method: "DELETE",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: { confirm: "DELETE_MY_ACCOUNT" },
      });

      // Verify events still exist but performedBy is null
      const eventsAfter = await app.prisma.productEvent.findMany({
        where: { productId },
      });
      expect(eventsAfter.length).toBeGreaterThanOrEqual(1);
      for (const event of eventsAfter) {
        expect(event.performedBy).toBeNull();
      }
    });

    it("preserves products belonging to the user's brand", async () => {
      // Register user
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "keep-products@test.com",
          password: "password123",
        },
      });
      const userId = registerRes.json().data.user.id;

      // Create brand and assign to user as BRAND_ADMIN
      const brand = await app.prisma.brand.create({
        data: {
          name: "Keep Brand",
          slug: "keep-brand-gdpr",
          did: "did:galileo:brand:keep-brand-gdpr",
        },
      });
      const brandId = brand.id;
      await app.prisma.user.update({
        where: { id: userId },
        data: { brandId, role: "BRAND_ADMIN" },
      });

      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "keep-products@test.com",
          password: "password123",
        },
      });
      const loginCookies = parseCookies(loginRes);

      // Create a product
      await app.inject({
        method: "POST",
        url: "/products",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: {
          gtin: VALID_GTIN,
          serialNumber: "SN-KEEP-001",
          name: "Keep Product",
          category: "Watches",
        },
      });

      // Delete user data
      await app.inject({
        method: "DELETE",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${loginCookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: { confirm: "DELETE_MY_ACCOUNT" },
      });

      // Verify products still exist
      const products = await app.prisma.product.findMany({
        where: { brandId },
      });
      expect(products.length).toBe(1);
      expect(products[0]!.name).toBe("Keep Product");
    });

    it("clears auth cookies in the response", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "clearcookies@test.com",
          password: "password123",
        },
      });
      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
          "x-galileo-client": "1",
        },
        payload: { confirm: "DELETE_MY_ACCOUNT" },
      });

      expect(response.statusCode).toBe(200);

      // Check Set-Cookie headers contain cleared cookies
      const rawCookies = response.headers["set-cookie"];
      const cookieHeaders = Array.isArray(rawCookies)
        ? rawCookies
        : [rawCookies];
      const atHeader = cookieHeaders.find((h) => h?.startsWith("galileo_at="));
      const rtHeader = cookieHeaders.find((h) => h?.startsWith("galileo_rt="));
      expect(atHeader).toBeDefined();
      expect(rtHeader).toBeDefined();
    });

    it("returns 401 without auth cookie", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/auth/me/data",
        headers: {
          "x-galileo-client": "1",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it("returns 403 without X-Galileo-Client header (CSRF)", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "nocsrf@test.com",
          password: "password123",
        },
      });
      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/me/data",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CSRF_REQUIRED");
    });
  });
});
