/**
 * Nonce endpoint for wallet-link message signing.
 *
 * GET /auth/nonce — returns a one-time nonce bound to the authenticated user.
 * Nonces expire after 5 minutes and are consumed on use.
 */

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

// In-memory nonce store (Map<nonce, { userId, expiresAt }>)
// For MVP: in-memory. For production: store in Redis or DB.
const nonceStore = new Map<string, { userId: string; expiresAt: number }>();

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createNonce(userId: string): string {
  // Clean expired nonces (lazy cleanup)
  const now = Date.now();
  for (const [key, val] of nonceStore) {
    if (val.expiresAt < now) nonceStore.delete(key);
  }

  const nonce = randomUUID();
  nonceStore.set(nonce, { userId, expiresAt: now + NONCE_TTL_MS });
  return nonce;
}

export function consumeNonce(nonce: string, userId: string): boolean {
  const entry = nonceStore.get(nonce);
  if (!entry) return false;
  if (entry.userId !== userId) return false;
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(nonce);
    return false;
  }
  nonceStore.delete(nonce); // One-time use
  return true;
}

// Exported for testing
export function _clearNonceStore(): void {
  nonceStore.clear();
}

// Exported for testing — allows injecting fake nonces
export function _setNonce(
  nonce: string,
  userId: string,
  expiresAt: number,
): void {
  nonceStore.set(nonce, { userId, expiresAt });
}

export default async function nonceRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/nonce",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          "Generate a one-time nonce for wallet-link message signing. " +
          "Nonce expires after 5 minutes.",
        tags: ["Auth"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const nonce = createNonce(request.user.sub);
      return reply.status(200).send({
        success: true,
        data: { nonce },
      });
    },
  );
}
