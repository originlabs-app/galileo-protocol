import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  generateDid,
  generateDigitalLinkUrl,
  productAuthoringSchema,
  productIdentitySchema,
  writeProductPassportAuthoringMetadata,
} from "@galileo/shared";
import { Prisma } from "../../generated/prisma/client.js";
import { requireRole } from "../../middleware/rbac.js";
import { isPrismaUniqueViolation } from "../../utils/prisma-errors.js";
import { resolveWorkspaceMutationBrandId } from "../../utils/workspace.js";

const createProductBody = productIdentitySchema
  .extend({
    brandId: z.string().optional(),
  })
  .merge(productAuthoringSchema)
  .strict();

export default async function createProductRoute(fastify: FastifyInstance) {
  fastify.post(
    "/products",
    {
      onRequest: [
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "OPERATOR", "ADMIN"),
      ],
      schema: {
        description:
          "Create a new product with GTIN, serial number, and metadata",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const parsed = createProductBody.safeParse(request.body);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;

        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              fieldErrors.gtin?.[0] ??
              fieldErrors.serialNumber?.[0] ??
              parsed.error.issues[0]?.message ??
              "Invalid input",
            details: fieldErrors,
          },
        });
      }

      const {
        gtin,
        serialNumber,
        name,
        description,
        category,
        brandId: bodyBrandId,
        materials,
        media,
      } = parsed.data;

      const user = request.user;
      const brandId = resolveWorkspaceMutationBrandId(
        reply,
        user,
        bodyBrandId,
        {
          membershipMessage: "User must belong to a brand to create products",
        },
      );

      if (!brandId) {
        return;
      }

      // Generate DID and Digital Link
      const did = generateDid(gtin, serialNumber);
      const digitalLink = generateDigitalLinkUrl(gtin, serialNumber);
      const passportMetadata = writeProductPassportAuthoringMetadata(
        undefined,
        { materials, media },
      );

      try {
        // Create product, passport, and event in a transaction
        const result = await fastify.prisma.$transaction(
          async (tx: import("../../plugins/prisma.js").TxClient) => {
            const product = await tx.product.create({
              data: {
                gtin,
                serialNumber,
                did,
                name,
                description: description ?? null,
                category,
                brandId,
              },
            });

            const passport = await tx.productPassport.create({
              data: {
                productId: product.id,
                digitalLink,
                ...(Object.keys(passportMetadata).length > 0
                  ? {
                      metadata: passportMetadata as Prisma.InputJsonValue,
                    }
                  : {}),
              },
            });

            await tx.productEvent.create({
              data: {
                productId: product.id,
                type: "CREATED",
                data: { name, gtin, serialNumber, category },
                performedBy: user.sub,
              },
            });

            return { product, passport };
          },
        );

        return reply.status(201).send({
          success: true,
          data: {
            product: result.product,
            passport: result.passport,
          },
        });
      } catch (err: unknown) {
        // Handle unique constraint violation (duplicate gtin+serial)
        if (isPrismaUniqueViolation(err)) {
          return reply.status(409).send({
            success: false,
            error: {
              code: "CONFLICT",
              message:
                "A product with this GTIN and serial number already exists",
            },
          });
        }
        throw err;
      }
    },
  );
}
