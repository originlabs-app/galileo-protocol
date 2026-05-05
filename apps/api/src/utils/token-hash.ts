import { createHash } from "node:crypto";

/**
 * Hash a token using SHA-256.
 * Used to hash refresh tokens before storing in the database.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
