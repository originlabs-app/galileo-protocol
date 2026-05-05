import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ProductStatus, EventType } from "@galileo/shared";
import { errorResponseSchema } from "../../utils/schemas.js";
import { enqueueWebhookEvent } from "../../services/webhooks/outbox.js";

const verifyBody = z
  .object({
    location: z
      .string()
      .max(500, "Location must be at most 500 characters")
      .optional()
      .default(""),
    userAgent: z
      .string()
      .max(500, "User agent must be at most 500 characters")
      .optional()
      .default(""),
  })
  .strict();

export default async function verifyProductRoute(fastify: FastifyInstance) {
  fastify.post<{
    Params: { id: string };
    Body: { location?: string; userAgent?: string } | undefined;
  }>(
    "/products/:id/verify",
    {
      schema: {
        description:
          "Verify a product by its ID. Public endpoint — no authentication required. " +
          "Records a VERIFIED event for anti-counterfeiting analytics.",
        tags: ["Products"],
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Product ID" },
          },
          required: ["id"],
        },
        response: {
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Validate body (all fields optional, bounded, no extra fields)
      const bodyParsed = verifyBody.safeParse(request.body ?? {});
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
      const { location, userAgent } = bodyParsed.data;

      // Optional auth: try to extract user ID from cookie if present
      let performedBy: string | null = null;
      try {
        await request.jwtVerify();
        performedBy = request.user.sub;
      } catch {
        // No valid auth — that's fine, this is a public endpoint
      }

      // Fetch the full product with relations upfront (single DB round-trip)
      const product = await fastify.prisma.product.findUnique({
        where: { id },
        include: {
          passport: true,
          events: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      // Only ACTIVE products can be verified
      if (product.status !== ProductStatus.ACTIVE) {
        return reply.status(200).send({
          success: true,
          data: {
            verified: false,
            status: product.status,
            reason: "Product is not active",
          },
        });
      }

      // Record the VERIFIED event
      const newEvent = await fastify.prisma.productEvent.create({
        data: {
          productId: id,
          type: EventType.VERIFIED,
          data: { location, userAgent },
          performedBy,
        },
      });

      // Prepend the new event to the already-fetched list (avoids a third DB call)
      product.events = [newEvent, ...product.events].slice(0, 50);

      // Fire webhook (non-blocking, R29 — cross-cutting hooks fail silently)
      await enqueueWebhookEvent(fastify.prisma, EventType.VERIFIED, id, {
        productId: id,
        location,
      }).catch(() => {
        // Webhook enqueue failure must not break the request
      });

      return reply.status(200).send({
        success: true,
        data: {
          verified: true,
          product,
        },
      });
    },
  );
}
