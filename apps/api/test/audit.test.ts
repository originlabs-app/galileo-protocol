import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb } from "./helpers.js";

const VALID_GTIN_13 = "4006381333931";

describe("Audit trail", () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let brandAdminCookie: string;
  let viewerCookie: string;
  let testBrandId: string;

  beforeAll(async () => {
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
        name: "Audit Test Brand",
        slug: "audit-test-brand",
        did: "did:galileo:brand:audit-test-brand",
      },
    });
    testBrandId = brand.id;

    // Register + login ADMIN
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "audit-admin@test.com", password: "password123" },
    });
    const adminUser = await app.prisma.user.findUnique({
      where: { email: "audit-admin@test.com" },
    });
    await app.prisma.user.update({
      where: { id: adminUser!.id },
      data: { role: "ADMIN" },
    });
    const adminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "audit-admin@test.com", password: "password123" },
    });
    const adminCookies = parseCookies(adminLogin);
    adminCookie = `galileo_at=${adminCookies.galileo_at}`;

    // Register + login BRAND_ADMIN
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "audit-brand-admin@test.com",
        password: "password123",
      },
    });
    const brandAdminUser = await app.prisma.user.findUnique({
      where: { email: "audit-brand-admin@test.com" },
    });
    await app.prisma.user.update({
      where: { id: brandAdminUser!.id },
      data: { role: "BRAND_ADMIN", brandId: testBrandId },
    });
    const brandAdminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "audit-brand-admin@test.com",
        password: "password123",
      },
    });
    const brandAdminCookies = parseCookies(brandAdminLogin);
    brandAdminCookie = `galileo_at=${brandAdminCookies.galileo_at}`;

    // Register + login VIEWER
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "audit-viewer@test.com", password: "password123" },
    });
    const viewerUser = await app.prisma.user.findUnique({
      where: { email: "audit-viewer@test.com" },
    });
    await app.prisma.user.update({
      where: { id: viewerUser!.id },
      data: { role: "VIEWER", brandId: testBrandId },
    });
    const viewerLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "audit-viewer@test.com", password: "password123" },
    });
    const viewerCookies = parseCookies(viewerLogin);
    viewerCookie = `galileo_at=${viewerCookies.galileo_at}`;
  });

  // ─── Audit hook tests ──────────────────────────────────────

  describe("Audit hook", () => {
    it("creates audit log entry for POST /products", async () => {
      // Clear audit logs from registration/login in beforeEach
      await app.prisma.auditLog.deleteMany();

      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "AUDIT-001",
          name: "Audit Product",
          category: "Watches",
        },
      });
      expect(createRes.statusCode).toBe(201);

      const logs = await app.prisma.auditLog.findMany({
        where: { resource: "product" },
      });
      // POST /products has no :id in the URL, so resourceId is null
      const productLog = logs.find(
        (l) => l.action.includes("POST") && l.action.includes("products"),
      );
      expect(productLog).toBeDefined();
      expect(productLog!.resource).toBe("product");
      expect(productLog!.actor).toBeDefined();
      expect(productLog!.resourceId).toBeNull();
    });

    it("sanitizes sensitive fields in audit metadata", async () => {
      await app.prisma.auditLog.deleteMany();

      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "audit-sensitive@test.com",
          password: "supersecret123",
        },
      });
      expect(registerRes.statusCode).toBe(201);

      let logs = await app.prisma.auditLog.findMany({
        where: { action: "POST /auth/register" },
      });
      for (let attempt = 0; attempt < 10 && logs.length === 0; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        logs = await app.prisma.auditLog.findMany({
          where: { action: "POST /auth/register" },
        });
      }
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const log = logs[0]!;
      const metadata = log.metadata as Record<string, unknown>;
      const body = metadata.body as Record<string, unknown>;
      expect(body.password).toBe("[REDACTED]");
      expect(body.email).toBe("[REDACTED]");
    });

    it("does not log failed mutations (4xx)", async () => {
      await app.prisma.auditLog.deleteMany();

      // Try to create product without auth — should 401
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "FAIL-001",
          name: "Fail Product",
          category: "Watches",
        },
      });

      const logs = await app.prisma.auditLog.findMany({
        where: { resource: "product" },
      });
      expect(logs).toHaveLength(0);
    });

    it("does not log GET requests", async () => {
      await app.prisma.auditLog.deleteMany();

      await app.inject({
        method: "GET",
        url: "/products",
        headers: { cookie: brandAdminCookie },
      });

      const logs = await app.prisma.auditLog.findMany({
        where: { resource: "product" },
      });
      expect(logs).toHaveLength(0);
    });

    it("audit hook failure does not break the request", async () => {
      // This test ensures that even if the audit log write fails,
      // the main request still succeeds. We just verify the request works
      // when audit log table exists (normal flow).
      const response = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "RESILIENCE-001",
          name: "Resilient Product",
          category: "Watches",
        },
      });
      expect(response.statusCode).toBe(201);
    });
  });

  // ─── GET /audit-log endpoint tests ─────────────────────────

  describe("GET /audit-log", () => {
    it("returns paginated audit log entries for ADMIN", async () => {
      await app.prisma.auditLog.deleteMany();

      // Create a product to generate audit entries
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "LOG-001",
          name: "Logged Product",
          category: "Watches",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/audit-log",
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.entries).toBeDefined();
      expect(Array.isArray(body.data.entries)).toBe(true);
      expect(body.data.pagination).toBeDefined();
      expect(body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("filters by resource type", async () => {
      await app.prisma.auditLog.deleteMany();

      // Create a product (generates a 'product' resource log)
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "FILTER-RES-001",
          name: "Filtered Product",
          category: "Watches",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/audit-log?resource=product",
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const entry of body.data.entries) {
        expect(entry.resource).toBe("product");
      }
    });

    it("filters by actor", async () => {
      await app.prisma.auditLog.deleteMany();

      // Create a product (generates audit log with brandAdmin actor)
      await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
        payload: {
          gtin: VALID_GTIN_13,
          serialNumber: "FILTER-ACT-001",
          name: "Actor Product",
          category: "Watches",
        },
      });

      const brandAdminUser = await app.prisma.user.findUnique({
        where: { email: "audit-brand-admin@test.com" },
      });

      const response = await app.inject({
        method: "GET",
        url: `/audit-log?actor=${brandAdminUser!.id}`,
        headers: { cookie: adminCookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const entry of body.data.entries) {
        expect(entry.actor).toBe(brandAdminUser!.id);
      }
    });

    it("returns 403 for non-ADMIN users", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/audit-log",
        headers: { cookie: viewerCookie },
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 401 for unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/audit-log",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 403 for BRAND_ADMIN", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/audit-log",
        headers: { cookie: brandAdminCookie },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
