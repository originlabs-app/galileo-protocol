import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

export interface JwtPayload {
  sub: string;
  role: string;
  brandId: string | null;
}

/**
 * Access the refresh JWT namespace from fastify.jwt.refresh.
 * The namespace is created by @fastify/jwt when registered with { namespace: "refresh" }.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function refreshJwt(fastify: FastifyInstance): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (fastify.jwt as any).refresh;
}

/**
 * Generate an access token (15min) using the Fastify JWT plugin.
 */
export function generateAccessToken(
  fastify: FastifyInstance,
  payload: JwtPayload,
): string {
  return fastify.jwt.sign(payload);
}

/**
 * Generate a refresh token (7d) using the refresh JWT namespace.
 * Includes a unique jti to ensure token uniqueness across rotations.
 */
export function generateRefreshToken(
  fastify: FastifyInstance,
  payload: JwtPayload,
): string {
  return refreshJwt(fastify).sign({ ...payload, jti: randomUUID() }) as string;
}

/**
 * Verify a refresh token. Returns the decoded payload or null if invalid.
 */
export function verifyRefreshToken(
  fastify: FastifyInstance,
  token: string,
): JwtPayload | null {
  try {
    const decoded = refreshJwt(fastify).verify(token) as JwtPayload & {
      iat: number;
      exp: number;
    };
    return { sub: decoded.sub, role: decoded.role, brandId: decoded.brandId };
  } catch {
    return null;
  }
}

/**
 * Generate both access and refresh tokens for a user.
 */
export function generateTokenPair(
  fastify: FastifyInstance,
  payload: JwtPayload,
): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(fastify, payload),
    refreshToken: generateRefreshToken(fastify, payload),
  };
}
