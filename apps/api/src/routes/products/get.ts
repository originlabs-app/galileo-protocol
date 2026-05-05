import type { FastifyInstance } from "fastify";
import { ensureSameWorkspaceBrand } from "../../utils/workspace.js";

export default async function getProductRoute(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    "/products/:id",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: "Get a product by ID with its passport and events",
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

      const product = await fastify.prisma.product.findUnique({
        where: { id },
        include: {
          passport: true,
          events: {
            orderBy: { createdAt: "desc" },
          },
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

      if (!ensureSameWorkspaceBrand(reply, user, product.brandId)) {
        return;
      }

      return reply.status(200).send({
        success: true,
        data: { product },
      });
    },
  );
}
