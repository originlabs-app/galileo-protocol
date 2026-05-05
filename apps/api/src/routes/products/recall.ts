import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ProductStatus, EventType } from "@galileo/shared";
import { requireRole } from "../../middleware/rbac.js";
import { RouteError } from "../../utils/route-error.js";
import { enqueueWebhookEvent } from "../../services/webhooks/outbox.js";

const recallBody = z
  .object({
    reason: z
      .string()
      .max(2000, "Reason must be at most 2000 characters")
      .optional()
      .default(""),
  })
  .strict();

export default async function recallProductRoute(fastify: FastifyInstance) {
  fastify.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>(
    "/products/:id/recall",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description:
          "Recall an ACTIVE product, transitioning it to RECALLED status",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Product ID" },
          },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user;

      // Validate body (reason is optional, max 2000 chars, no extra fields)
      const bodyParsed = recallBody.safeParse(request.body ?? {});
      if (!bodyParsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: bodyParsed.error.flatten().fieldErrors,
          },
        });
      }
      const { reason } = bodyParsed.data;

      if (user.role !== "ADMIN" && !user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User must belong to a brand",
          },
        });
      }

      try {
        await fastify.prisma.$transaction(
          async (tx: import("../../plugins/prisma.js").TxClient) => {
            const product = await tx.product.findUnique({
              where: { id },
              select: { id: true, brandId: true, status: true },
            });

            if (!product) {
              throw new RouteError(404, "NOT_FOUND", "Product not found");
            }

            if (user.role !== "ADMIN" && product.brandId !== user.brandId) {
              throw new RouteError(404, "NOT_FOUND", "Product not found");
            }

            if (product.status !== ProductStatus.ACTIVE) {
              throw new RouteError(
                409,
                "CONFLICT",
                "Only ACTIVE products can be recalled",
              );
            }

            const updated = await tx.product.updateMany({
              where: { id, status: ProductStatus.ACTIVE },
              data: { status: ProductStatus.RECALLED },
            });

            if (updated.count === 0) {
              throw new RouteError(
                409,
                "CONFLICT",
                "Only ACTIVE products can be recalled",
              );
            }

            await tx.productEvent.create({
              data: {
                productId: id,
                type: EventType.RECALLED,
                data: { reason },
                performedBy: user.sub,
              },
            });
          },
        );
      } catch (err) {
        if (err instanceof RouteError) {
          return reply.status(err.statusCode).send({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            },
          });
        }
        throw err;
      }

      const fullProduct = await fastify.prisma.product.findUnique({
        where: { id },
        include: {
          passport: true,
          events: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });

      if (!fullProduct) {
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Product not found after recall — this should not happen",
          },
        });
      }

      // Fire webhook (non-blocking, R29 — cross-cutting hooks fail silently)
      await enqueueWebhookEvent(fastify.prisma, EventType.RECALLED, id, {
        productId: id,
        reason: bodyParsed.data.reason,
      }).catch(() => {
        // Webhook enqueue failure must not break the request
      });

      return reply.status(200).send({
        success: true,
        data: { product: fullProduct },
      });
    },
  );
}
