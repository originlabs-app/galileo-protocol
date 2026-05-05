import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { emailSchema, passwordSchema } from "@galileo/shared";
import { verifyPassword } from "../../utils/password.js";
import { generateTokenPair } from "../../utils/tokens.js";
import { hashToken } from "../../utils/token-hash.js";
import { setAuthCookies } from "../../utils/cookies.js";
import { errorResponseSchema } from "../../utils/schemas.js";

// Pre-hashed dummy value for timing-safe login when user is not found
const DUMMY_HASH =
  "$2b$12$LJ3m4ys3Lg2VBe0A8MrXxu7N6OVxB5VH6kFGz3K8HnGFbkOKMgK.i";

const loginBody = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

const INVALID_CREDENTIALS_ERROR = {
  success: false as const,
  error: {
    code: "UNAUTHORIZED",
    message: "Invalid email or password",
  },
};

export default async function loginRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/login",
    {
      schema: {
        description: "Login with email and password",
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            email: { type: "string", description: "User email" },
            password: { type: "string", description: "User password" },
          },
        },
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
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = loginBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const { email, password } = parsed.data;

      // Find user by email
      const user = await fastify.prisma.user.findUnique({
        where: { email },
      });

      // Timing-safe: perform dummy bcrypt compare when user not found
      // to prevent timing-based user enumeration
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        return reply.status(401).send(INVALID_CREDENTIALS_ERROR);
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send(INVALID_CREDENTIALS_ERROR);
      }

      const tokens = generateTokenPair(fastify, {
        sub: user.id,
        role: user.role,
        brandId: user.brandId,
      });

      // Store hashed refresh token
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashToken(tokens.refreshToken) },
      });

      // Set httpOnly cookies
      setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

      // Log without PII
      fastify.log.info({ userId: user.id }, "User logged in");

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            brandId: user.brandId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    },
  );
}
