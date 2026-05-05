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
import {
  addSubscription,
  enqueueWebhookEvent,
  getOutboxEntries,
  clearAll,
} from "../src/services/webhooks/outbox.js";
import {
  signPayload,
  getBackoffMs,
} from "../src/services/webhooks/delivery.js";
import type { WebhookSubscription } from "../src/services/webhooks/types.js";

const CSRF = { "x-galileo-client": "test" };
const VALID_GTIN_13 = "4006381333931";
const VALID_ETH_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("Webhook system", () => {
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
        name: "Webhook Test Brand",
        slug: "webhook-test-brand",
        did: "did:galileo:brand:webhook-test-brand",
      },
    });
    testBrandId = brand.id;

    const otherBrand = await app.prisma.brand.create({
      data: {
        name: "Other Webhook Brand",
        slug: "other-webhook-brand",
        did: "did:galileo:brand:other-webhook-brand",
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
      "webhook-ba@test.com",
      "BRAND_ADMIN",
      testBrandId,
    );
    adminCookie = await setupUser("webhook-admin@test.com", "ADMIN");
    otherBrandAdminCookie = await setupUser(
      "webhook-other@test.com",
      "BRAND_ADMIN",
      otherBrandId,
    );
  });

  afterEach(async () => {
    await clearAll(app.prisma);
  });

  // ─── Route tests ──────────────────────────────────────────────

  describe("POST /webhooks", () => {
    it("creates a webhook subscription (201)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/webhook",
          events: ["TRANSFERRED", "MINTED"],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.subscription.url).toBe("https://example.com/webhook");
      expect(body.data.subscription.events).toEqual(["TRANSFERRED", "MINTED"]);
      expect(body.data.subscription.secret).toBeDefined();
      expect(body.data.subscription.active).toBe(true);
    });

    it("validates URL format (400)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          url: "not-a-url",
          events: ["TRANSFERRED"],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 for unauthenticated request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { ...CSRF },
        payload: {
          url: "https://example.com/webhook",
          events: ["TRANSFERRED"],
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /webhooks", () => {
    it("lists brand-scoped subscriptions", async () => {
      // Create subscription via route
      await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/hook1",
          events: ["TRANSFERRED"],
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.subscriptions.length).toBeGreaterThanOrEqual(1);
      // All should belong to the test brand
      for (const sub of body.data.subscriptions) {
        expect(sub.brandId).toBe(testBrandId);
      }
    });

    it("ADMIN sees all subscriptions", async () => {
      // Create subscription for each brand
      await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/hook1",
          events: ["TRANSFERRED"],
        },
      });
      await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: otherBrandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/hook2",
          events: ["MINTED"],
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/webhooks",
        headers: { cookie: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.subscriptions.length).toBeGreaterThanOrEqual(2);
    });

    it("BRAND_ADMIN cannot see other brand's subscriptions", async () => {
      // Create subscription for other brand
      await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: otherBrandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/hook-other",
          events: ["TRANSFERRED"],
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Should not see the other brand's subscription
      for (const sub of body.data.subscriptions) {
        expect(sub.brandId).toBe(testBrandId);
      }
    });
  });

  describe("GET /webhooks/stats", () => {
    async function seedSubscription(
      brandId: string,
      events: string[] = ["TRANSFERRED"],
      active = true,
    ): Promise<string> {
      const id = `sub-${Math.random().toString(36).slice(2, 10)}`;
      await addSubscription(app.prisma, {
        id,
        brandId,
        url: "https://example.com/hook",
        secret: "test-secret",
        events,
        active,
        createdAt: new Date().toISOString(),
      });
      return id;
    }

    it("returns zeros when nothing exists", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.subscriptions).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
      });
      expect(body.data.deliveries).toEqual({
        total: 0,
        pending: 0,
        failing: 0,
      });
      expect(body.data.byEvent).toEqual([]);
    });

    it("counts active and inactive subscriptions", async () => {
      await seedSubscription(testBrandId, ["TRANSFERRED"], true);
      await seedSubscription(testBrandId, ["MINTED"], true);
      await seedSubscription(testBrandId, ["RECALLED"], false);

      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.subscriptions).toEqual({
        total: 3,
        active: 2,
        inactive: 1,
      });
    });

    it("distinguishes pending (attempts=0) from failing (attempts>0) deliveries", async () => {
      const subId = await seedSubscription(testBrandId, ["TRANSFERRED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-a", {});
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-b", {});
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-c", {});

      // Mark two of the three as retrying (attempts=2)
      const deliveries = await app.prisma.webhookDelivery.findMany({
        where: { webhookId: subId },
        orderBy: { createdAt: "asc" },
        take: 2,
      });
      await app.prisma.webhookDelivery.updateMany({
        where: { id: { in: deliveries.map((d) => d.id) } },
        data: { attempts: 2, lastError: "timeout" },
      });

      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.deliveries).toEqual({
        total: 3,
        pending: 1,
        failing: 2,
      });
      expect(body.data.byEvent).toEqual([
        { eventType: "TRANSFERRED", pending: 1, failing: 2 },
      ]);
    });

    it("aggregates byEvent across multiple event types", async () => {
      await seedSubscription(testBrandId, ["TRANSFERRED", "MINTED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-a", {});
      await enqueueWebhookEvent(app.prisma, "MINTED", "prod-b", {});

      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.byEvent).toEqual([
        { eventType: "MINTED", pending: 1, failing: 0 },
        { eventType: "TRANSFERRED", pending: 1, failing: 0 },
      ]);
    });

    it("BRAND_ADMIN sees only their brand's stats", async () => {
      await seedSubscription(testBrandId, ["TRANSFERRED"]);
      await seedSubscription(otherBrandId, ["TRANSFERRED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-a", {});

      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.subscriptions.total).toBe(1);
      expect(body.data.deliveries.total).toBe(1);
    });

    it("ADMIN sees stats across all brands", async () => {
      await seedSubscription(testBrandId, ["TRANSFERRED"]);
      await seedSubscription(otherBrandId, ["TRANSFERRED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-a", {});

      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
        headers: { cookie: adminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.subscriptions.total).toBe(2);
      expect(body.data.deliveries.total).toBe(2);
    });

    it("returns 401 for unauthenticated request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/webhooks/stats",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /webhooks/:id/deliveries", () => {
    async function createSubWithEvents(
      eventTypes: string[],
    ): Promise<string> {
      const createRes = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/hook-deliveries",
          events: eventTypes,
        },
      });
      return createRes.json().data.subscription.id;
    }

    it("returns deliveries newest-first with nextCursor=null when one page", async () => {
      const subId = await createSubWithEvents(["TRANSFERRED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-old", {});
      await new Promise((r) => setTimeout(r, 5));
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-new", {});

      const res = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries`,
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.deliveries).toHaveLength(2);
      expect(body.data.deliveries[0].payload.productId).toBe("prod-new");
      expect(body.data.deliveries[1].payload.productId).toBe("prod-old");
      expect(body.data.nextCursor).toBeNull();
    });

    it("filters by status=pending (attempts=0)", async () => {
      const subId = await createSubWithEvents(["TRANSFERRED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-a", {});
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-b", {});

      // Mark one as retrying
      const rows = await app.prisma.webhookDelivery.findMany({
        where: { webhookId: subId },
        take: 1,
      });
      await app.prisma.webhookDelivery.update({
        where: { id: rows[0]!.id },
        data: { attempts: 1, lastError: "boom" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries?status=pending`,
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.deliveries).toHaveLength(1);
      expect(body.data.deliveries[0].attempts).toBe(0);
    });

    it("filters by status=failing (attempts>0)", async () => {
      const subId = await createSubWithEvents(["TRANSFERRED"]);
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-a", {});
      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-b", {});

      const rows = await app.prisma.webhookDelivery.findMany({
        where: { webhookId: subId },
        take: 1,
      });
      await app.prisma.webhookDelivery.update({
        where: { id: rows[0]!.id },
        data: { attempts: 3, lastError: "timeout" },
      });

      const res = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries?status=failing`,
        headers: { cookie: brandAdminCookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.deliveries).toHaveLength(1);
      expect(body.data.deliveries[0].attempts).toBe(3);
      expect(body.data.deliveries[0].lastError).toBe("timeout");
    });

    it("paginates with limit + cursor", async () => {
      const subId = await createSubWithEvents(["TRANSFERRED"]);
      for (let i = 0; i < 5; i++) {
        await enqueueWebhookEvent(app.prisma, "TRANSFERRED", `prod-${i}`, {});
        await new Promise((r) => setTimeout(r, 2));
      }

      const first = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries?limit=2`,
        headers: { cookie: brandAdminCookie },
      });
      expect(first.statusCode).toBe(200);
      const firstBody = first.json();
      expect(firstBody.data.deliveries).toHaveLength(2);
      expect(firstBody.data.nextCursor).not.toBeNull();

      const second = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries?limit=2&cursor=${firstBody.data.nextCursor}`,
        headers: { cookie: brandAdminCookie },
      });
      expect(second.statusCode).toBe(200);
      const secondBody = second.json();
      expect(secondBody.data.deliveries).toHaveLength(2);
      // No overlap with first page
      const firstIds = firstBody.data.deliveries.map(
        (d: { id: string }) => d.id,
      );
      const secondIds = secondBody.data.deliveries.map(
        (d: { id: string }) => d.id,
      );
      for (const id of secondIds) expect(firstIds).not.toContain(id);
    });

    it("rejects invalid status value (400)", async () => {
      const subId = await createSubWithEvents(["TRANSFERRED"]);
      const res = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries?status=bogus`,
        headers: { cookie: brandAdminCookie },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 403 when BRAND_ADMIN queries another brand's subscription", async () => {
      const subId = await createSubWithEvents(["TRANSFERRED"]);
      const res = await app.inject({
        method: "GET",
        url: `/webhooks/${subId}/deliveries`,
        headers: { cookie: otherBrandAdminCookie },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /webhooks/:id", () => {
    it("removes subscription", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          url: "https://example.com/hook-delete",
          events: ["TRANSFERRED"],
        },
      });
      const subId = createRes.json().data.subscription.id;

      const res = await app.inject({
        method: "DELETE",
        url: `/webhooks/${subId}`,
        headers: { cookie: brandAdminCookie, ...CSRF },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.deleted).toBe(true);

      // Verify it's gone
      const listRes = await app.inject({
        method: "GET",
        url: "/webhooks",
        headers: { cookie: brandAdminCookie },
      });
      const remaining = listRes
        .json()
        .data.subscriptions.filter((s: { id: string }) => s.id === subId);
      expect(remaining).toHaveLength(0);
    });
  });

  // ─── Outbox unit tests ────────────────────────────────────────

  describe("Outbox", () => {
    it("enqueue creates entries for matching subscriptions", async () => {
      const sub: WebhookSubscription = {
        id: "sub-1",
        brandId: testBrandId,
        url: "https://example.com/hook",
        secret: "secret-key",
        events: ["TRANSFERRED"],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await addSubscription(app.prisma, sub);

      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-1", {
        test: true,
      });

      const entries = await getOutboxEntries(app.prisma);
      expect(entries.length).toBe(1);
      expect(entries[0]!.subscriptionId).toBe("sub-1");
      expect(entries[0]!.status).toBe("pending");
    });

    it("enqueue skips inactive subscriptions", async () => {
      const sub: WebhookSubscription = {
        id: "sub-inactive",
        brandId: testBrandId,
        url: "https://example.com/hook",
        secret: "secret-key",
        events: ["TRANSFERRED"],
        active: false,
        createdAt: new Date().toISOString(),
      };
      await addSubscription(app.prisma, sub);

      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-1", {
        test: true,
      });

      const entries = await getOutboxEntries(app.prisma);
      expect(entries.length).toBe(0);
    });

    it("enqueue skips subscriptions not matching event type", async () => {
      const sub: WebhookSubscription = {
        id: "sub-minted-only",
        brandId: testBrandId,
        url: "https://example.com/hook",
        secret: "secret-key",
        events: ["MINTED"],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await addSubscription(app.prisma, sub);

      await enqueueWebhookEvent(app.prisma, "TRANSFERRED", "prod-1", {
        test: true,
      });

      const entries = await getOutboxEntries(app.prisma);
      expect(entries.length).toBe(0);
    });
  });

  // ─── Delivery unit tests ──────────────────────────────────────

  describe("Delivery", () => {
    it("signPayload generates correct HMAC-SHA256", () => {
      const sig = signPayload('{"test":true}', "secret");
      expect(sig).toMatch(/^[a-f0-9]{64}$/);

      // Same input produces same output
      const sig2 = signPayload('{"test":true}', "secret");
      expect(sig).toBe(sig2);

      // Different secret produces different output
      const sig3 = signPayload('{"test":true}', "other-secret");
      expect(sig).not.toBe(sig3);
    });

    it("getBackoffMs returns exponential delays", () => {
      expect(getBackoffMs(0)).toBe(60_000); // 1 min
      expect(getBackoffMs(1)).toBe(300_000); // 5 min
      expect(getBackoffMs(2)).toBe(1_500_000); // 25 min
      expect(getBackoffMs(3)).toBe(7_200_000); // 2 hours
      expect(getBackoffMs(4)).toBe(36_000_000); // 10 hours
    });
  });

  // ─── Webhook fires after product transfer ─────────────────────

  describe("Webhook fires after product events", () => {
    it("webhook event is enqueued after product transfer", async () => {
      // Register a subscription for TRANSFERRED events
      const sub: WebhookSubscription = {
        id: "sub-transfer-fire",
        brandId: testBrandId,
        url: "https://example.com/hook-fire",
        secret: "test-secret",
        events: ["TRANSFERRED"],
        active: true,
        createdAt: new Date().toISOString(),
      };
      await addSubscription(app.prisma, sub);

      // Create and mint a product
      const createRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: {
          name: "Webhook Fire Product",
          gtin: VALID_GTIN_13,
          serialNumber: "WH-FIRE-001",
          brandId: testBrandId,
          category: "Watches",
        },
      });
      const productId = createRes.json().data.product.id;

      await app.inject({
        method: "POST",
        url: `/products/${productId}/mint`,
        headers: { cookie: brandAdminCookie, ...CSRF },
      });

      // Transfer the product
      await app.inject({
        method: "POST",
        url: `/products/${productId}/transfer`,
        headers: { cookie: brandAdminCookie, ...CSRF },
        payload: { toAddress: VALID_ETH_ADDRESS },
      });

      // Check that a webhook event was enqueued
      const entries = await getOutboxEntries(app.prisma);
      const transferEntry = entries.find(
        (e) =>
          e.eventType === "TRANSFERRED" &&
          e.subscriptionId === "sub-transfer-fire",
      );
      expect(transferEntry).toBeDefined();
      expect(transferEntry!.status).toBe("pending");
      expect(transferEntry!.payload).toHaveProperty("productId", productId);
    });
  });
});
