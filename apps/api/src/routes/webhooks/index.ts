/**
 * Webhook subscription CRUD routes.
 *
 * POST   /webhooks          — Create subscription (BRAND_ADMIN, ADMIN)
 * GET    /webhooks          — List subscriptions (brand-scoped)
 * GET    /webhooks/stats    — Aggregated subscription and delivery stats
 * DELETE /webhooks/:id      — Delete subscription
 * GET    /webhooks/:id/deliveries — List pending/failed deliveries for a subscription
 * POST   /webhooks/:id/retry     — Retry all failed/pending deliveries for a subscription
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireRole } from "../../middleware/rbac.js";
import { requireCsrfHeader } from "../../middleware/csrf.js";
import {
  addSubscription,
  removeSubscription,
  getSubscription,
  listSubscriptions,
  generateSecret,
  listDeliveries,
  requeueFailed,
  getStats,
} from "../../services/webhooks/outbox.js";
import type { WebhookSubscription } from "../../services/webhooks/types.js";

const createWebhookBody = z
  .object({
    url: z.string().url("URL must be a valid HTTP(S) URL"),
    events: z
      .array(z.string().min(1))
      .min(1, "At least one event type is required"),
  })
  .strict();

export default async function webhookRoutes(fastify: FastifyInstance) {
  // POST /webhooks — Create a subscription
  fastify.post(
    "/webhooks",
    {
      onRequest: [
        requireCsrfHeader,
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "ADMIN"),
      ],
      schema: {
        description: "Create a webhook subscription for product events",
        tags: ["Webhooks"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const parsed = createWebhookBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const user = request.user;
      const { url, events } = parsed.data;

      // BRAND_ADMIN must have a brandId
      if (user.role !== "ADMIN" && !user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User must belong to a brand",
          },
        });
      }

      const subscription: WebhookSubscription = {
        id: randomUUID(),
        brandId: user.brandId ?? "system",
        url,
        secret: generateSecret(),
        events,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await addSubscription(fastify.prisma, subscription);

      // Audit log: webhook subscription created
      try {
        await fastify.prisma.auditLog.create({
          data: {
            actor: user.sub,
            action: "CREATE webhook_subscription",
            resource: "webhook",
            resourceId: subscription.id,
            metadata: { url: subscription.url, events: subscription.events },
            ip: request.ip,
          },
        });
      } catch {
        request.log.error("Failed to write audit log for webhook create");
      }

      return reply.status(201).send({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            brandId: subscription.brandId,
            url: subscription.url,
            secret: subscription.secret,
            events: subscription.events,
            active: subscription.active,
            createdAt: subscription.createdAt,
          },
        },
      });
    },
  );

  // GET /webhooks — List subscriptions (brand-scoped)
  fastify.get(
    "/webhooks",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description:
          "List webhook subscriptions. BRAND_ADMIN sees only their brand. ADMIN sees all.",
        tags: ["Webhooks"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user;
      const brandId =
        user.role === "ADMIN" ? undefined : (user.brandId ?? undefined);
      const subs = await listSubscriptions(fastify.prisma, brandId);

      return reply.status(200).send({
        success: true,
        data: { subscriptions: subs },
      });
    },
  );

  // GET /webhooks/stats — Aggregated subscription and delivery metrics
  fastify.get(
    "/webhooks/stats",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description:
          "Aggregated webhook subscription and live delivery queue metrics. " +
          "BRAND_ADMIN sees only their brand. ADMIN sees all.",
        tags: ["Webhooks"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user;
      const brandId =
        user.role === "ADMIN" ? undefined : (user.brandId ?? undefined);
      const stats = await getStats(fastify.prisma, brandId);

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    },
  );

  // DELETE /webhooks/:id — Remove subscription
  fastify.delete<{ Params: { id: string } }>(
    "/webhooks/:id",
    {
      onRequest: [
        requireCsrfHeader,
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "ADMIN"),
      ],
      schema: {
        description: "Delete a webhook subscription",
        tags: ["Webhooks"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const sub = await getSubscription(fastify.prisma, request.params.id);

      if (!sub) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Webhook subscription not found",
          },
        });
      }

      // BRAND_ADMIN can only delete their own brand's subscriptions
      if (user.role !== "ADMIN" && sub.brandId !== user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Cannot delete another brand's subscription",
          },
        });
      }

      await removeSubscription(fastify.prisma, request.params.id);

      // Audit log: webhook subscription deleted
      try {
        await fastify.prisma.auditLog.create({
          data: {
            actor: user.sub,
            action: "DELETE webhook_subscription",
            resource: "webhook",
            resourceId: sub.id,
            metadata: { url: sub.url, brandId: sub.brandId },
            ip: request.ip,
          },
        });
      } catch {
        request.log.error("Failed to write audit log for webhook delete");
      }

      return reply.status(200).send({
        success: true,
        data: { deleted: true },
      });
    },
  );

  // GET /webhooks/:id/deliveries — List queued deliveries for a subscription
  const deliveriesQuery = z
    .object({
      status: z.enum(["pending", "failing"]).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      cursor: z.string().min(1).optional(),
    })
    .strict();

  fastify.get<{ Params: { id: string }; Querystring: unknown }>(
    "/webhooks/:id/deliveries",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description:
          "List queued delivery events for a webhook subscription, newest-first. " +
          "Filter by ?status=pending|failing, paginate with ?limit (1-200, default 50) and ?cursor.",
        tags: ["Webhooks"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const parsedQuery = deliveriesQuery.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: parsedQuery.error.flatten().fieldErrors,
          },
        });
      }

      const user = request.user;
      const sub = await getSubscription(fastify.prisma, request.params.id);

      if (!sub) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Webhook subscription not found",
          },
        });
      }

      if (user.role !== "ADMIN" && sub.brandId !== user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Cannot access another brand's deliveries",
          },
        });
      }

      const { deliveries, nextCursor } = await listDeliveries(
        fastify.prisma,
        request.params.id,
        parsedQuery.data,
      );
      return reply.status(200).send({
        success: true,
        data: { deliveries, nextCursor },
      });
    },
  );

  // POST /webhooks/:id/retry — Retry all pending/failed deliveries for a subscription
  fastify.post<{ Params: { id: string } }>(
    "/webhooks/:id/retry",
    {
      onRequest: [
        requireCsrfHeader,
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "ADMIN"),
      ],
      schema: {
        description:
          "Retry all failed or pending deliveries for a webhook subscription. " +
          "Resets attempt counters so the background worker processes them immediately.",
        tags: ["Webhooks"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const sub = await getSubscription(fastify.prisma, request.params.id);

      if (!sub) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Webhook subscription not found",
          },
        });
      }

      if (user.role !== "ADMIN" && sub.brandId !== user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Cannot retry another brand's deliveries",
          },
        });
      }

      const requeued = await requeueFailed(fastify.prisma, request.params.id);

      return reply.status(200).send({
        success: true,
        data: { requeued },
      });
    },
  );
}
