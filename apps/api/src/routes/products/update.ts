import type { FastifyInstance } from "fastify";
import {
  productAuthoringPatchSchema,
  writeProductPassportAuthoringMetadata,
} from "@galileo/shared";
import { Prisma } from "../../generated/prisma/client.js";
import { requireRole } from "../../middleware/rbac.js";
import { RouteError } from "../../utils/route-error.js";
import { buildWorkspaceProductByIdWhere } from "../../utils/workspace.js";

const updateProductBody = productAuthoringPatchSchema;

export default async function updateProductRoute(fastify: FastifyInstance) {
  fastify.patch<{ Params: { id: string } }>(
    "/products/:id",
    {
      onRequest: [
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "OPERATOR", "ADMIN"),
      ],
      schema: {
        description: "Update a DRAFT product's name, description, or category",
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

      // Validate body — reject any fields beyond name/description/category
      const parsed = updateProductBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid input. Only name, description, category, materials, and media can be updated.",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const { materials, media, ...productFields } = parsed.data;

      // Must have at least one field to update (product fields or authoring extras)
      if (
        Object.keys(productFields).length === 0 &&
        materials === undefined &&
        media === undefined
      ) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "No valid fields to update",
          },
        });
      }

      const where = buildWorkspaceProductByIdWhere(reply, user, id);

      if (!where) {
        return;
      }

      const product = await fastify.prisma.product.findFirst({ where });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      // Only DRAFT products can be updated
      if (product.status !== "DRAFT") {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Cannot update a non-DRAFT product",
          },
        });
      }

      // Update product and create UPDATED event in a transaction. The product
      // update is conditional on status=DRAFT so a concurrent mint/recall cannot
      // race between the pre-check above and the actual mutation.
      let updated;
      try {
        updated = await fastify.prisma.$transaction(
          async (tx: import("../../plugins/prisma.js").TxClient) => {
            const productClaim = await tx.product.updateMany({
              where: { ...where, status: "DRAFT" },
              data:
                Object.keys(productFields).length > 0
                  ? productFields
                  : { updatedAt: new Date() },
            });

            if (productClaim.count === 0) {
              throw new RouteError(
                409,
                "CONFLICT",
                "Product is no longer in DRAFT status",
              );
            }

            if (materials !== undefined || media !== undefined) {
              const passport = await tx.productPassport.findUnique({
                where: { productId: id },
              });
              if (passport) {
                await tx.productPassport.update({
                  where: { id: passport.id },
                  data: {
                    metadata: writeProductPassportAuthoringMetadata(
                      passport.metadata,
                      { materials, media },
                    ) as Prisma.InputJsonValue,
                  },
                });
              }
            }

            await tx.productEvent.create({
              data: {
                productId: id,
                type: "UPDATED",
                data: {
                  ...productFields,
                  ...(materials !== undefined ? { materials } : {}),
                  ...(media !== undefined ? { media } : {}),
                },
                performedBy: user.sub,
              },
            });

            // Re-fetch to include the new event
            return tx.product.findFirst({
              where,
              include: {
                passport: true,
                events: {
                  orderBy: { createdAt: "desc" },
                },
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

      return reply.status(200).send({
        success: true,
        data: { product: updated },
      });
    },
  );
}
