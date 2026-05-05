/**
 * SIWE (Sign-In With Ethereum, EIP-4361) authentication routes.
 *
 * GET  /auth/siwe/nonce  — generate a one-time nonce for SIWE signing
 * POST /auth/siwe/verify — verify SIWE message + signature, issue session
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAddress } from "viem";
import { createSiweNonce, consumeSiweNonce } from "../../services/siwe.js";
import { generateTokenPair } from "../../utils/tokens.js";
import { hashToken } from "../../utils/token-hash.js";
import { setAuthCookies } from "../../utils/cookies.js";

const siweVerifyBody = z
  .object({
    message: z.string().min(1, "Message is required"),
    signature: z.string().min(1, "Signature is required"),
  })
  .strict();

/**
 * Minimal SIWE message parser.
 * Extracts nonce and address from an EIP-4361 formatted message.
 */
function parseSiweFields(message: string): {
  address: string;
  nonce: string;
  chainId: number;
  domain: string;
} | null {
  try {
    const lines = message.split("\n");
    let address = "";
    let nonce = "";
    let chainId = 0;
    let domain = "";

    // Line 0: "{domain} wants you to sign in with your Ethereum account:"
    const domainMatch = lines[0]?.match(/^(.+?) wants you to sign in/);
    if (domainMatch) domain = domainMatch[1]!;

    // Line 1: address
    if (lines[1]) address = lines[1].trim();

    // Search for Nonce and Chain ID fields
    for (const line of lines) {
      const nonceMatch = line.match(/^Nonce:\s*(.+)$/);
      if (nonceMatch) nonce = nonceMatch[1]!.trim();
      const chainMatch = line.match(/^Chain ID:\s*(\d+)$/);
      if (chainMatch) chainId = Number(chainMatch[1]);
    }

    if (!address || !nonce) return null;
    return { address, nonce, chainId, domain };
  } catch {
    return null;
  }
}

export default async function siweRoutes(fastify: FastifyInstance) {
  // GET /auth/siwe/nonce — no auth required (this is for login)
  fastify.get(
    "/auth/siwe/nonce",
    {
      schema: {
        description:
          "Generate a one-time nonce for SIWE (Sign-In With Ethereum) message signing. Expires after 5 minutes.",
        tags: ["Auth"],
      },
    },
    async (_request, reply) => {
      const nonce = createSiweNonce();
      return reply.status(200).send({
        success: true,
        data: { nonce },
      });
    },
  );

  // POST /auth/siwe/verify — verify SIWE signature and issue session
  fastify.post(
    "/auth/siwe/verify",
    {
      schema: {
        description:
          "Verify a SIWE message and signature. If valid and the wallet is linked to an account, issues a session cookie.",
        tags: ["Auth"],
      },
    },
    async (request, reply) => {
      const parsed = siweVerifyBody.safeParse(request.body);
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

      const { message, signature } = parsed.data;

      // Parse SIWE message fields
      const fields = parseSiweFields(message);
      if (!fields) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_MESSAGE",
            message: "Could not parse SIWE message",
          },
        });
      }

      // Consume nonce (one-time use)
      if (!consumeSiweNonce(fields.nonce)) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_NONCE",
            message: "Nonce is invalid, expired, or already used",
          },
        });
      }

      // Verify signature using publicClient.verifyMessage (supports both EOA + ERC-1271 Smart Wallets)
      let isValid: boolean;
      let checksumAddress: `0x${string}`;
      try {
        checksumAddress = getAddress(fields.address) as `0x${string}`;
        isValid = await fastify.chain.publicClient.verifyMessage({
          address: checksumAddress,
          message,
          signature: signature as `0x${string}`,
        });
      } catch {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_SIGNATURE",
            message: "SIWE verification failed",
          },
        });
      }

      if (!isValid) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_SIGNATURE",
            message: "SIWE verification failed",
          },
        });
      }

      // Look up user by wallet address
      const user = await fastify.prisma.user.findFirst({
        where: { walletAddress: checksumAddress },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "WALLET_NOT_LINKED",
            message:
              "No account linked to this wallet. Login with email first and link your wallet.",
          },
        });
      }

      // Issue session cookies (same as email/password login)
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

      setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

      fastify.log.info({ userId: user.id }, "User logged in via SIWE");

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            brandId: user.brandId,
          },
        },
      });
    },
  );
}
