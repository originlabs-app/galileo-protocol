import type { FastifyInstance } from "fastify";
import { errorResponseSchema } from "../../utils/schemas.js";

export default async function meRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/me",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: "Get current authenticated user profile",
        tags: ["Auth"],
        security: [{ cookieAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      email: { type: "string" },
                      role: { type: "string" },
                      brandId: { type: "string", nullable: true },
                      walletAddress: { type: "string", nullable: true },
                      createdAt: { type: "string" },
                      updatedAt: { type: "string" },
                      brand: {
                        type: "object",
                        nullable: true,
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          slug: { type: "string" },
                          did: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sub } = request.user;

      const user = await fastify.prisma.user.findUnique({
        where: { id: sub },
        include: { brand: true },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not found",
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            brandId: user.brandId,
            walletAddress: user.walletAddress,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            brand: user.brand
              ? {
                  id: user.brand.id,
                  name: user.brand.name,
                  slug: user.brand.slug,
                  did: user.brand.did,
                }
              : null,
          },
        },
      });
    },
  );
}
