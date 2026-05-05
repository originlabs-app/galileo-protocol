import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyReply } from "fastify";
import { config } from "../config.js";

const isProduction = config.NODE_ENV === "production";

/**
 * Cookie name prefixes for production security:
 * - `__Host-` for access cookie: requires Secure, Path=/, no Domain
 * - `__Secure-` for refresh cookie: requires Secure (compatible with Path=/auth/refresh)
 * In dev/test: no prefix (because __Host- requires HTTPS)
 */
export const ACCESS_COOKIE_NAME = isProduction
  ? "__Host-galileo_at"
  : "galileo_at";
export const REFRESH_COOKIE_NAME = isProduction
  ? "__Secure-galileo_rt"
  : "galileo_rt";

const accessCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  // __Host- prefix requires: Secure=true, Path=/, no Domain attribute
  maxAge: 15 * 60, // 15 minutes in seconds
};

const refreshCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/auth/refresh",
  // __Secure- prefix only requires: Secure=true (compatible with custom Path)
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Set both access and refresh token cookies on a reply.
 */
export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
): void {
  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions);
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
}

/**
 * Clear both auth cookies by setting them to empty with immediate expiration.
 */
export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/auth/refresh",
  });
}
