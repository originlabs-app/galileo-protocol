import type { FastifyInstance } from "fastify";
import { verifyRefreshToken, generateTokenPair } from "../../utils/tokens.js";
import { hashToken } from "../../utils/token-hash.js";
import {
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
} from "../../utils/cookies.js";
import { errorResponseSchema } from "../../utils/schemas.js";

export default async function refreshRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/refresh",
    {
      schema: {
        description: "Refresh access token using the galileo_rt cookie",
        tags: ["Auth"],
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
                      createdAt: { type: "string" },
                      updatedAt: { type: "string" },
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
      // Read refresh token from cookie
      const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "No refresh token provided",
          },
        });
      }

      // Verify the refresh token JWT signature
      const payload = verifyRefreshToken(fastify, refreshToken);
      if (!payload) {
        clearAuthCookies(reply);
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired refresh token",
          },
        });
      }

      // Hash the incoming token for comparison
      const hashedIncoming = hashToken(refreshToken);

      // Atomic transaction: verify stored token and rotate in one step
      const result = await fastify.prisma.$transaction(
        async (tx: import("../../plugins/prisma.js").TxClient) => {
          const user = await tx.user.findUnique({
            where: { id: payload.sub },
          });

          if (!user || user.refreshToken !== hashedIncoming) {
            return null;
          }

          // Generate new token pair
          const tokens = generateTokenPair(fastify, {
            sub: user.id,
            role: user.role,
            brandId: user.brandId,
          });

          // Update stored refresh token (hashed)
          await tx.user.update({
            where: { id: user.id },
            data: { refreshToken: hashToken(tokens.refreshToken) },
          });

          return { user, tokens };
        },
      );

      if (!result) {
        clearAuthCookies(reply);
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired refresh token",
          },
        });
      }

      // Set new cookies
      setAuthCookies(
        reply,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );

      // Log without PII
      fastify.log.info({ userId: result.user.id }, "Token refreshed");

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
            brandId: result.user.brandId,
            createdAt: result.user.createdAt,
            updatedAt: result.user.updatedAt,
          },
        },
      });
    },
  );
}
