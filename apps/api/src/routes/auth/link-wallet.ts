import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAddress } from "viem";
import { ETHEREUM_ADDRESS_RE, parseLinkWalletMessage } from "@galileo/shared";
import { consumeNonce } from "./nonce.js";
import { requireCsrfHeader } from "../../middleware/csrf.js";
import { errorResponseSchema } from "../../utils/schemas.js";
import { isPrismaUniqueViolation } from "../../utils/prisma-errors.js";

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const linkWalletBody = z
  .object({
    address: z.string().regex(ETHEREUM_ADDRESS_RE, "Invalid Ethereum address"),
    signature: z.string().min(1, "Signature is required"),
    message: z.string().min(1, "Message is required"),
  })
  .strict();

export default async function linkWalletRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/link-wallet",
    {
      onRequest: [requireCsrfHeader, fastify.authenticate],
      schema: {
        description:
          "Link an Ethereum wallet address to the authenticated user",
        tags: ["Auth"],
        security: [{ cookieAuth: [] }],
        body: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Ethereum wallet address (0x...)",
            },
            signature: {
              type: "string",
              description: "EIP-191 personal_sign signature",
            },
            message: { type: "string", description: "Message that was signed" },
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
                  walletAddress: { type: "string" },
                },
              },
            },
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // 1. Validate body
      const parsed = linkWalletBody.safeParse(request.body);
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

      const { address, signature, message } = parsed.data;
      const checksumAddress = getAddress(address);

      // 2. Verify signature first (supports both EOA + ERC-1271 Smart Wallets)
      let isValid: boolean;
      try {
        isValid = await fastify.chain.publicClient.verifyMessage({
          address: checksumAddress,
          message,
          signature: signature as `0x${string}`,
        });
      } catch {
        isValid = false;
      }

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "SIGNATURE_INVALID",
            message:
              "Signature verification failed — recovered address does not match",
          },
        });
      }

      // 3. Fetch user email and validate message binds to this account
      const { sub } = request.user;
      const currentUser = await fastify.prisma.user.findUnique({
        where: { id: sub },
        select: { email: true },
      });
      if (!currentUser) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not found" },
        });
      }

      // Parse nonce + timestamp from message (v2 format)
      const parsedMessage = parseLinkWalletMessage(message);
      if (!parsedMessage) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Message must include nonce and timestamp. Use GET /auth/nonce first.",
          },
        });
      }

      // Verify email matches
      if (parsedMessage.email !== currentUser.email) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Signed message does not match your account",
          },
        });
      }

      // Verify timestamp (5-minute expiry)
      if (Date.now() - parsedMessage.timestamp > MESSAGE_EXPIRY_MS) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "EXPIRED",
            message: "Signed message has expired. Request a new nonce.",
          },
        });
      }

      // Consume nonce (one-time use)
      if (!consumeNonce(parsedMessage.nonce, sub)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_NONCE",
            message: "Nonce is invalid or has already been used.",
          },
        });
      }

      // 4. Update wallet — unique constraint on walletAddress handles conflicts
      try {
        await fastify.prisma.user.update({
          where: { id: sub },
          data: { walletAddress: checksumAddress },
        });
      } catch (err: unknown) {
        if (isPrismaUniqueViolation(err)) {
          return reply.status(409).send({
            success: false,
            error: {
              code: "CONFLICT",
              message:
                "This wallet address is already linked to another account",
            },
          });
        }
        throw err;
      }

      fastify.log.info({ userId: sub }, "Wallet linked");

      return reply.status(200).send({
        success: true,
        data: {
          walletAddress: checksumAddress,
        },
      });
    },
  );
}
