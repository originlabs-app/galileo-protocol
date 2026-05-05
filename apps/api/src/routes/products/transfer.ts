import type { FastifyInstance } from "fastify";
import { getAddress } from "viem";
import { ETHEREUM_ADDRESS_RE, ProductStatus, EventType } from "@galileo/shared";
import { requireRole } from "../../middleware/rbac.js";
import { RouteError } from "../../utils/route-error.js";
import { errorResponseSchema } from "../../utils/schemas.js";
import {
  runComplianceChecks,
  type ComplianceContext,
} from "../../services/compliance/index.js";
import { jurisdictionCheck } from "../../services/compliance/jurisdiction.js";
import { sanctionsCheck } from "../../services/compliance/sanctions.js";
import { brandAuthCheck } from "../../services/compliance/brand-auth.js";
import { cpoCheck } from "../../services/compliance/cpo.js";
import { serviceCenterCheck } from "../../services/compliance/service-center.js";
import { enqueueWebhookEvent } from "../../services/webhooks/outbox.js";

export default async function transferProductRoute(fastify: FastifyInstance) {
  fastify.post<{
    Params: { id: string };
    Body: { toAddress: string };
  }>(
    "/products/:id/transfer",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description: "Transfer a product to a new wallet address",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            toAddress: {
              type: "string",
              description: "Destination Ethereum wallet address (0x...)",
            },
          },
          required: ["toAddress"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  product: {
                    type: "object",
                    additionalProperties: true,
                  },
                },
              },
            },
          },
          400: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user;
      const toAddress = request.body?.toAddress;

      // Validate toAddress presence and format
      if (
        !toAddress ||
        typeof toAddress !== "string" ||
        !ETHEREUM_ADDRESS_RE.test(toAddress)
      ) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message:
              "toAddress must be a valid Ethereum address (0x + 40 hex chars)",
          },
        });
      }

      // Checksum-normalize the destination address
      const checksumToAddress = getAddress(toAddress);

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
              select: {
                id: true,
                brandId: true,
                status: true,
                walletAddress: true,
                brand: { select: { cpoEmail: true } },
              },
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
                "Only ACTIVE products can be transferred",
              );
            }

            const fromAddress = product.walletAddress ?? null;

            // Run compliance checks before transfer
            const complianceCtx: ComplianceContext = {
              productId: product.id,
              productStatus: product.status,
              productBrandId: product.brandId,
              fromAddress,
              toAddress: checksumToAddress,
              userId: user.sub,
              userRole: user.role,
              userBrandId: user.brandId ?? null,
              // brandCpoEmail: undefined means "not configured" → CPO check passes
              brandCpoEmail: product.brand?.cpoEmail ?? undefined,
            };

            const compliance = await runComplianceChecks(complianceCtx, [
              jurisdictionCheck,
              sanctionsCheck,
              brandAuthCheck,
              cpoCheck,
              serviceCenterCheck,
            ]);

            if (!compliance.passed) {
              const failed = compliance.results.find((r) => !r.passed);
              throw new RouteError(
                403,
                "COMPLIANCE_REJECTED",
                `Transfer blocked by compliance: ${failed?.module} — ${failed?.reason}`,
              );
            }

            // Optimistic concurrency: only update if status is still ACTIVE.
            // If a concurrent request already changed the status, count=0 → 409.
            const updated = await tx.product.updateMany({
              where: { id, status: ProductStatus.ACTIVE },
              data: { walletAddress: checksumToAddress },
            });

            if (updated.count === 0) {
              throw new RouteError(
                409,
                "CONFLICT",
                "Product status changed concurrently — please retry",
              );
            }

            await tx.productEvent.create({
              data: {
                productId: id,
                type: EventType.TRANSFERRED,
                data: { from: fromAddress, to: checksumToAddress },
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
            message:
              "Product not found after transfer — this should not happen",
          },
        });
      }

      // Fire webhook (non-blocking, R29 — cross-cutting hooks fail silently)
      await enqueueWebhookEvent(fastify.prisma, EventType.TRANSFERRED, id, {
        productId: id,
        toAddress: checksumToAddress,
      }).catch(() => {
        // Webhook enqueue failure must not break the request
      });

      const transferEvent =
        fullProduct.events.find((e) => e.type === EventType.TRANSFERRED) ??
        null;

      return reply.status(200).send({
        success: true,
        data: { product: fullProduct, event: transferEvent },
      });
    },
  );
}
