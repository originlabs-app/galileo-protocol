import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { emailSchema, passwordSchema } from "@galileo/shared";
import { hashPassword } from "../../utils/password.js";
import { generateTokenPair } from "../../utils/tokens.js";
import { hashToken } from "../../utils/token-hash.js";
import { setAuthCookies } from "../../utils/cookies.js";
import { errorResponseSchema } from "../../utils/schemas.js";

const registerBody = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    brandName: z
      .string()
      .min(1)
      .max(255, "Brand name must be at most 255 characters")
      .optional(),
  })
  .strict();

export default async function registerRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/register",
    {
      schema: {
        description: "Register a new user for the single-brand pilot",
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            email: { type: "string", description: "Valid email address" },
            password: {
              type: "string",
              description: "Password (min 8 characters)",
            },
            brandName: {
              type: "string",
              description:
                "Optional brand name hint. Public registration does not create brands during the pilot.",
            },
          },
        },
        response: {
          201: {
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
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = registerBody.safeParse(request.body);
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

      const { email, password, brandName } = parsed.data;

      // Check if user exists
      const existing = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            code: "CONFLICT",
            message: "An account with this email already exists",
          },
        });
      }

      const passwordHash = await hashPassword(password);

      if (brandName) {
        fastify.log.info(
          { email, requestedBrandName: brandName },
          "Ignoring brandName during pilot registration",
        );
      }

      const user = await fastify.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "VIEWER",
        },
      });

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
      fastify.log.info({ userId: user.id }, "User registered");

      return reply.status(201).send({
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
