/**
 * SIWE (Sign-In With Ethereum, EIP-4361) authentication routes.
 *
 * GET  /auth/siwe/nonce  — generate a one-time nonce for SIWE signing
 * POST /auth/siwe/verify — verify SIWE message + signature, issue session
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAddress } from "viem";
import { config } from "../../config.js";
import { requireCsrfHeader } from "../../middleware/csrf.js";
import { createSiweNonce, consumeSiweNonce } from "../../services/siwe.js";
import { generateTokenPair } from "../../utils/tokens.js";
import { hashToken } from "../../utils/token-hash.js";
import { setAuthCookies } from "../../utils/cookies.js";

const siweVerifyBody = z
  .object({
    message: z.string().min(1, "Message is required"),
    signature: z
      .string()
      .regex(/^0x(?:[0-9a-fA-F]{2})+$/, "Signature must be hex-encoded bytes"),
  })
  .strict();

const SIWE_MESSAGE_MAX_AGE_MS = 5 * 60 * 1000;
const SIWE_CLOCK_SKEW_MS = 60 * 1000;

interface SiweFields {
  address: string;
  nonce: string;
  chainId: number;
  domain: string;
  uri: string;
  version: string;
  issuedAt: string;
}

/**
 * Minimal SIWE message parser.
 * Extracts nonce and address from an EIP-4361 formatted message.
 */
function parseSiweFields(message: string): SiweFields | null {
  try {
    const lines = message.split("\n");
    let address = "";
    let nonce = "";
    let chainId = 0;
    let domain = "";
    let uri = "";
    let version = "";
    let issuedAt = "";

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
      const uriMatch = line.match(/^URI:\s*(.+)$/);
      if (uriMatch) uri = uriMatch[1]!.trim();
      const versionMatch = line.match(/^Version:\s*(.+)$/);
      if (versionMatch) version = versionMatch[1]!.trim();
      const issuedAtMatch = line.match(/^Issued At:\s*(.+)$/);
      if (issuedAtMatch) issuedAt = issuedAtMatch[1]!.trim();
    }

    if (!address || !nonce || !domain || !uri || !version || !issuedAt) {
      return null;
    }
    return { address, nonce, chainId, domain, uri, version, issuedAt };
  } catch {
    return null;
  }
}

function allowedSiweOrigins(): string[] {
  return config.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(
    Boolean,
  ).map((origin) => new URL(origin).origin);
}

function validateSiweFields(fields: SiweFields): {
  ok: true;
} | {
  ok: false;
  code: string;
  message: string;
} {
  if (fields.version !== "1") {
    return {
      ok: false,
      code: "INVALID_MESSAGE",
      message: "Unsupported SIWE message version",
    };
  }

  if (fields.chainId !== config.chain.deployment.chainId) {
    return {
      ok: false,
      code: "INVALID_CHAIN_ID",
      message: "SIWE message chain ID is not supported",
    };
  }

  const issuedAtTime = Date.parse(fields.issuedAt);
  const now = Date.now();
  if (!Number.isFinite(issuedAtTime)) {
    return {
      ok: false,
      code: "INVALID_MESSAGE",
      message: "SIWE message issuedAt is invalid",
    };
  }
  if (issuedAtTime > now + SIWE_CLOCK_SKEW_MS) {
    return {
      ok: false,
      code: "INVALID_MESSAGE",
      message: "SIWE message issuedAt is in the future",
    };
  }
  if (now - issuedAtTime > SIWE_MESSAGE_MAX_AGE_MS) {
    return {
      ok: false,
      code: "INVALID_MESSAGE",
      message: "SIWE message has expired",
    };
  }

  let uri: URL;
  try {
    uri = new URL(fields.uri);
  } catch {
    return {
      ok: false,
      code: "INVALID_MESSAGE",
      message: "SIWE message URI is invalid",
    };
  }

  if (fields.domain !== uri.host) {
    return {
      ok: false,
      code: "INVALID_DOMAIN",
      message: "SIWE message domain does not match URI",
    };
  }

  const allowedOrigins = allowedSiweOrigins();
  const allowedHosts = new Set(
    allowedOrigins.map((origin) => new URL(origin).host),
  );

  if (!allowedOrigins.includes(uri.origin) || !allowedHosts.has(fields.domain)) {
    return {
      ok: false,
      code: "INVALID_DOMAIN",
      message: "SIWE message origin is not allowed",
    };
  }

  return { ok: true };
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
      onRequest: [requireCsrfHeader],
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

      const fieldValidation = validateSiweFields(fields);
      if (!fieldValidation.ok) {
        return reply.status(400).send({
          success: false,
          error: {
            code: fieldValidation.code,
            message: fieldValidation.message,
          },
        });
      }

      let checksumAddress: `0x${string}`;
      try {
        checksumAddress = getAddress(fields.address) as `0x${string}`;
      } catch {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_MESSAGE",
            message: "SIWE message address is invalid",
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
      try {
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
