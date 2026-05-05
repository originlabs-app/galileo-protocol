import type { FastifyInstance } from "fastify";
import { clearAuthCookies } from "../../utils/cookies.js";
import { requireCsrfHeader } from "../../middleware/csrf.js";

export default async function logoutRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/logout",
    {
      onRequest: [requireCsrfHeader, fastify.authenticate],
      schema: {
        description: "Logout and clear auth cookies",
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
                  message: { type: "string" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { sub } = request.user;

      // Clear refresh token from database
      await fastify.prisma.user.update({
        where: { id: sub },
        data: { refreshToken: null },
      });

      // Clear auth cookies
      clearAuthCookies(reply);

      // Log without PII
      fastify.log.info({ userId: sub }, "User logged out");

      return reply.status(200).send({
        success: true,
        data: {
          message: "Logged out successfully",
        },
      });
    },
  );
}
