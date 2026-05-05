import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";

export default async function qrProductRoute(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string }; Querystring: { size?: string } }>(
    "/products/:id/qr",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          "Generate a QR code PNG for a minted product's digital link",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Product ID" },
          },
          required: ["id"],
        },
        querystring: {
          type: "object",
          properties: {
            size: {
              type: "string",
              description:
                "QR code image width/height in pixels (100-1000, default 300)",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user;

      // brandId null guard: non-ADMIN users without a brandId cannot access product routes
      if (user.role !== "ADMIN" && !user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User must belong to a brand",
          },
        });
      }

      // Parse and validate size parameter
      const sizeParam = request.query.size;
      const size = sizeParam ? parseInt(sizeParam, 10) : 300;

      if (isNaN(size) || size < 100 || size > 1000) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid size parameter. Must be a number between 100 and 1000.",
          },
        });
      }

      // Look up product with passport
      const product = await fastify.prisma.product.findUnique({
        where: { id },
        include: { passport: true },
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

      // Brand scoping: non-ADMIN users can only access their own brand's products
      // Return 404 (not 403) to avoid leaking that the product exists for another brand
      if (user.role !== "ADMIN" && product.brandId !== user.brandId) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      // Cannot generate QR for DRAFT (unminted) products
      if (product.status === "DRAFT") {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Cannot generate QR for unminted product",
          },
        });
      }

      // Generate QR code PNG buffer from the Digital Link URL
      const digitalLink = product.passport?.digitalLink;
      if (!digitalLink) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Product does not have a digital link",
          },
        });
      }

      const pngBuffer = await QRCode.toBuffer(digitalLink, {
        width: size,
        type: "png",
      });

      return reply
        .status(200)
        .header("content-type", "image/png")
        .send(pngBuffer);
    },
  );
}
