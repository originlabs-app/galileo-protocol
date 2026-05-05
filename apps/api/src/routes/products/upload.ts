import type { FastifyInstance } from "fastify";
import {
  ProductStatus,
  readProductPassportAuthoringMetadata,
  writeProductPassportAuthoringMetadata,
} from "@galileo/shared";
import { Prisma } from "../../generated/prisma/client.js";
import { requireRole } from "../../middleware/rbac.js";
import { computeCid } from "../../utils/cid.js";
import { buildWorkspaceProductByIdWhere } from "../../utils/workspace.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export default async function uploadProductImageRoute(
  fastify: FastifyInstance,
) {
  fastify.post<{ Params: { id: string } }>(
    "/products/:id/upload",
    {
      onRequest: [
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "OPERATOR", "ADMIN"),
      ],
      schema: {
        description:
          "Upload a product image (JPEG, PNG, or WebP, max 5 MB). " +
          "Only DRAFT products can have images uploaded.",
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
      const where = buildWorkspaceProductByIdWhere(reply, user, id);

      if (!where) {
        return;
      }

      const product = await fastify.prisma.product.findFirst({
        where,
        include: {
          passport: true,
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

      // Only DRAFT products can have images added
      if (product.status !== ProductStatus.DRAFT) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Only DRAFT products can have images uploaded",
          },
        });
      }

      // Parse multipart payload: one file plus required alt text for
      // the typed passport media descriptor.
      let alt = "";
      let fileBuffer: Buffer | null = null;
      let fileMimeType: string | null = null;

      try {
        for await (const part of request.parts()) {
          if (part.type === "file") {
            fileMimeType = part.mimetype;
            fileBuffer = await part.toBuffer();
            continue;
          }

          if (part.fieldname === "alt") {
            alt = String(part.value ?? "").trim();
          }
        }
      } catch {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid multipart request",
          },
        });
      }

      if (!fileBuffer || !fileMimeType) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "No file provided",
          },
        });
      }

      if (!alt) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Media alt text is required",
          },
        });
      }

      // Validate content type
      if (!ALLOWED_MIME_TYPES.has(fileMimeType)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message:
              "Invalid file type. Allowed: image/jpeg, image/png, image/webp",
          },
        });
      }

      // Enforce size limit (multipart plugin handles it, but double-check)
      if (fileBuffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "File exceeds 5 MB limit",
          },
        });
      }

      // Compute CID for content-addressing (tamper-evidence)
      const cid = await computeCid(fileBuffer);
      const ext = MIME_TO_EXT[fileMimeType] || ".bin";
      const storageKey = `products/${id}/${cid}${ext}`;

      // Upload to storage (R2 or local filesystem)
      const imageUrl = await fastify.storage.upload(
        storageKey,
        fileBuffer,
        fileMimeType,
      );
      const currentAuthoring = readProductPassportAuthoringMetadata(
        product.passport?.metadata,
      );
      const currentMedia = currentAuthoring.media ?? [];
      const previousPrimaryImage =
        currentMedia.find(
          (media) => media.kind === "image" && media.position === 0,
        ) ?? currentMedia.find((media) => media.kind === "image");
      const nextPrimaryImage = {
        kind: "image" as const,
        url: imageUrl,
        cid,
        alt,
        position: 0,
      };
      const nextMedia = [
        nextPrimaryImage,
        ...currentMedia.filter(
          (media) => !(media.kind === "image" && media.position === 0),
        ),
      ];
      const replacementAction =
        previousPrimaryImage?.url === imageUrl
          ? "unchanged"
          : previousPrimaryImage
            ? "replaced"
            : "added";
      const previousStorageKey = previousPrimaryImage?.url
        ? fastify.storage.resolveKey(previousPrimaryImage.url)
        : product.imageUrl
          ? fastify.storage.resolveKey(product.imageUrl)
          : null;

      const updated = await fastify.prisma.$transaction(
        async (tx: import("../../plugins/prisma.js").TxClient) => {
          await tx.product.update({
            where: { id },
            data: { imageUrl, imageCid: cid },
          });

          if (!product.passport) {
            throw new Error("Product passport missing for upload");
          }

          await tx.productPassport.update({
            where: { id: product.passport.id },
            data: {
              metadata: writeProductPassportAuthoringMetadata(
                product.passport.metadata,
                { media: nextMedia },
              ) as Prisma.InputJsonValue,
            },
          });

          await tx.productEvent.create({
            data: {
              productId: id,
              type: "UPDATED",
              data: {
                media: nextMedia,
                mediaChange: {
                  action: replacementAction,
                  primaryImage: nextPrimaryImage,
                  previousPrimaryImage: previousPrimaryImage ?? null,
                },
              },
              performedBy: user.sub,
            },
          });

          return tx.product.findUnique({
            where: { id },
            include: {
              passport: true,
              events: { orderBy: { createdAt: "desc" }, take: 50 },
            },
          });
        },
      );

      let previousFileDeleted: boolean | null = null;
      if (
        replacementAction === "replaced" &&
        previousStorageKey &&
        previousPrimaryImage?.url !== imageUrl
      ) {
        try {
          await fastify.storage.delete(previousStorageKey);
          previousFileDeleted = true;
        } catch (error) {
          previousFileDeleted = false;
          fastify.log.error(
            { err: error, productId: id, previousStorageKey },
            "Failed to delete superseded media object",
          );
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          product: updated,
          upload: {
            imageUrl,
            imageCid: cid,
            contentType: fileMimeType,
            size: fileBuffer.length,
            media: nextPrimaryImage,
            replacement: {
              action: replacementAction,
              previousImageUrl: previousPrimaryImage?.url ?? null,
              previousImageCid: previousPrimaryImage?.cid ?? null,
              previousFileDeleted,
            },
          },
        },
      });
    },
  );
}
