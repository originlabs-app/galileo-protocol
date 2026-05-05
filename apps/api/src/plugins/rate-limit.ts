import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ACCESS_COOKIE_NAME } from "../utils/cookies.js";

/**
 * Rate-limiting plugin for the Galileo Protocol API.
 *
 * Global defaults:
 *   - Authenticated requests (access-token cookie present): 100 req/min
 *   - Unauthenticated requests: 30 req/min
 * Route-specific overrides are applied via the `onRoute` hook using
 * Fastify's `config.rateLimit` option.
 *
 * Storage: uses the default in-memory store (suitable for single-instance).
 * For multi-instance deployments, switch to a Redis-backed store:
 *
 *   import Redis from "ioredis";
 *   const redis = new Redis(process.env.REDIS_URL);
 *   // then pass `redis` to the plugin options
 */

/** Route URL patterns and their rate-limit configurations. */
const ROUTE_LIMITS: {
  match: (url: string) => boolean;
  max: number;
  timeWindow: string;
}[] = [
  // Auth brute-force protection: 5 req/min
  {
    match: (url) => url === "/auth/login" || url === "/auth/register",
    max: 5,
    timeWindow: "1 minute",
  },
  // Token refresh: 10 req/min
  {
    match: (url) => url === "/auth/refresh",
    max: 10,
    timeWindow: "1 minute",
  },
  // Public resolver: 60 req/min
  {
    match: (url) => url === "/01/:gtin/21/:serial",
    max: 60,
    timeWindow: "1 minute",
  },
];

export default fp(async (fastify: FastifyInstance) => {
  // Disable rate limiting in test environment to avoid interfering with test suites
  if (
    config.NODE_ENV === "test" ||
    process.env.NODE_ENV === "test" ||
    process.env.GALILEO_DISABLE_RATE_LIMIT === "true"
  ) {
    return;
  }

  await fastify.register(rateLimit, {
    global: true,
    // Authenticated users (access-token cookie present) get 100 req/min;
    // unauthenticated requests are limited to 30 req/min.
    max: (req) => (req.cookies?.[ACCESS_COOKIE_NAME] ? 100 : 30),
    timeWindow: "1 minute",
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: "RATE_LIMIT",
        message: "Too many requests, please try again later",
      },
    }),
  });

  // Apply route-specific rate limits via the onRoute hook.
  // When a route is registered, check if its URL matches a known pattern
  // and inject the appropriate `config.rateLimit` override.
  fastify.addHook("onRoute", (routeOptions) => {
    const url = routeOptions.url;
    const override = ROUTE_LIMITS.find((r) => r.match(url));
    if (override) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: override.max,
          timeWindow: override.timeWindow,
        },
      };
    }
  });
});
