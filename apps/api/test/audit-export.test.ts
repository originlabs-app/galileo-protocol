import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb } from "./helpers.js";

const VALID_GTIN_13 = "4006381333931";

describe("GET /audit-log/export", () => {
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
        name: "Export Test Brand",
        slug: "export-test-brand",
        did: "did:galileo:brand:export-test-brand",
      },
    });
    testBrandId = brand.id;

    // Register + login ADMIN
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "export-admin@test.com", password: "password123" },
    });
    const adminUser = await app.prisma.user.findUnique({
      where: { email: "export-admin@test.com" },
    });
    await app.prisma.user.update({
      where: { id: adminUser!.id },
      data: { role: "ADMIN" },
    });
    const adminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "export-admin@test.com", password: "password123" },
    });
    const adminCookies = parseCookies(adminLogin);
    adminCookie = `galileo_at=${adminCookies.galileo_at}`;

    // Register + login BRAND_ADMIN
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "export-brand-admin@test.com",
        password: "password123",
      },
    });
    const brandAdminUser = await app.prisma.user.findUnique({
      where: { email: "export-brand-admin@test.com" },
    });
    await app.prisma.user.update({
      where: { id: brandAdminUser!.id },
      data: { role: "BRAND_ADMIN", brandId: testBrandId },
    });
    const brandAdminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "export-brand-admin@test.com",
        password: "password123",
      },
    });
    const brandAdminCookies = parseCookies(brandAdminLogin);
    brandAdminCookie = `galileo_at=${brandAdminCookies.galileo_at}`;

    // Register + login VIEWER
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "export-viewer@test.com", password: "password123" },
    });
    const viewerUser = await app.prisma.user.findUnique({
      where: { email: "export-viewer@test.com" },
    });
    await app.prisma.user.update({
      where: { id: viewerUser!.id },
      data: { role: "VIEWER", brandId: testBrandId },
    });
    const viewerLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "export-viewer@test.com", password: "password123" },
    });
    const viewerCookies = parseCookies(viewerLogin);
    viewerCookie = `galileo_at=${viewerCookies.galileo_at}`;
  });

  it("returns JSON export by default (200)", async () => {
    // Generate audit entries
    await app.prisma.auditLog.deleteMany();
    await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      payload: {
        gtin: VALID_GTIN_13,
        serialNumber: "EXPORT-JSON-001",
        name: "Export JSON Product",
        category: "Watches",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export",
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.entries).toBeDefined();
    expect(Array.isArray(body.data.entries)).toBe(true);
    expect(body.data.count).toBeGreaterThanOrEqual(1);
    expect(body.data.exportedAt).toBeDefined();
  });

  it("returns CSV with correct Content-Type and Content-Disposition", async () => {
    await app.prisma.auditLog.deleteMany();
    await app.inject({
      method: "POST",
      url: "/products",
      headers: { cookie: brandAdminCookie, "x-galileo-client": "1" },
      payload: {
        gtin: VALID_GTIN_13,
        serialNumber: "EXPORT-CSV-001",
        name: "Export CSV Product",
        category: "Watches",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export?format=csv",
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain("audit-log-");

    const csv = res.body;
    const lines = csv.split("\n");
    // First line should be header
    expect(lines[0]).toBe("id,actor,action,resource,resourceId,ip,createdAt");
    // Should have at least one data row
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it("date range filter limits results", async () => {
    await app.prisma.auditLog.deleteMany();

    // Create an audit entry with a known timestamp
    const now = new Date();
    await app.prisma.auditLog.create({
      data: {
        actor: "test-actor",
        action: "TEST_ACTION",
        resource: "test",
        createdAt: now,
      },
    });

    // Query with a future "from" — should return 0 entries
    const futureFrom = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const res = await app.inject({
      method: "GET",
      url: `/audit-log/export?from=${futureFrom}`,
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.entries).toHaveLength(0);
  });

  it("resource filter works", async () => {
    await app.prisma.auditLog.deleteMany();
    await app.prisma.auditLog.create({
      data: {
        actor: "test-actor",
        action: "TEST_ACTION",
        resource: "product",
      },
    });
    await app.prisma.auditLog.create({
      data: {
        actor: "test-actor",
        action: "TEST_ACTION",
        resource: "auth",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export?resource=product",
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const entry of body.data.entries) {
      expect(entry.resource).toBe("product");
    }
  });

  it("ADMIN sees all entries", async () => {
    await app.prisma.auditLog.deleteMany();
    await app.prisma.auditLog.create({
      data: {
        actor: "some-random-actor",
        action: "RANDOM_ACTION",
        resource: "test",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export",
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.entries.length).toBeGreaterThanOrEqual(1);
  });

  it("BRAND_ADMIN sees only their brand's entries", async () => {
    await app.prisma.auditLog.deleteMany();

    // Get brand admin user ID
    const brandAdminUser = await app.prisma.user.findUnique({
      where: { email: "export-brand-admin@test.com" },
    });

    // Create an entry by a brand user and one by a random actor
    await app.prisma.auditLog.create({
      data: {
        actor: brandAdminUser!.id,
        action: "BRAND_ACTION",
        resource: "product",
      },
    });
    await app.prisma.auditLog.create({
      data: {
        actor: "non-brand-actor",
        action: "OTHER_ACTION",
        resource: "product",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export",
      headers: { cookie: brandAdminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Should only see entries from brand users
    for (const entry of body.data.entries) {
      expect(entry.actor).toBe(brandAdminUser!.id);
    }
  });

  it("VIEWER role returns 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export",
      headers: { cookie: viewerCookie },
    });

    expect(res.statusCode).toBe(403);
  });

  it("unauthenticated returns 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export",
    });

    expect(res.statusCode).toBe(401);
  });

  it("empty result: JSON has empty entries array", async () => {
    await app.prisma.auditLog.deleteMany();

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export?resource=nonexistent",
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.entries).toHaveLength(0);
    expect(body.data.count).toBe(0);
  });

  it("CSV escapes special characters correctly", async () => {
    await app.prisma.auditLog.deleteMany();
    await app.prisma.auditLog.create({
      data: {
        actor: 'actor-with-"quotes"',
        action: "ACTION,WITH,COMMAS",
        resource: "test",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/audit-log/export?format=csv",
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const csv = res.body;
    // Verify that quotes are escaped (doubled)
    expect(csv).toContain('""quotes""');
    // Verify commas inside quoted fields
    expect(csv).toContain('"ACTION,WITH,COMMAS"');
  });
});
