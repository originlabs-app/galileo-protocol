import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

/**
 * Swagger UI CSP directives — relaxed to allow inline scripts/styles
 * that Swagger UI needs to render properly.
 */
const swaggerCspDirectives = {
  defaultSrc: ["'self'"],
  imgSrc: ["'self'", "data:", "https://fastify.dev"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  frameSrc: ["'self'"],
  frameAncestors: ["'self'"],
};

/** Pre-computed CSP header value for Swagger UI routes. */
const swaggerCspValue = Object.entries(swaggerCspDirectives)
  .map(
    ([key, sources]) =>
      `${key.replace(/([A-Z])/g, "-$1").toLowerCase()} ${sources.join(" ")}`,
  )
  .join("; ");

export default fp(async (fastify: FastifyInstance) => {
  // Disable helmet in test environment — it can interfere with test assertions
  if (config.NODE_ENV === "test") {
    return;
  }

  const isProduction = config.NODE_ENV === "production";

  // In non-production environments, Swagger UI is served at /docs.
  // Register helmet with route-level overrides for Swagger compatibility.
  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    xXssProtection: false,
    // HSTS only in production — avoid locking dev/staging into HTTPS
    strictTransportSecurity: isProduction
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  });

  // Override CSP for Swagger UI routes in non-production environments.
  // Helmet's strict CSP blocks the inline scripts/styles that Swagger UI requires.
  if (!isProduction) {
    fastify.addHook("onRequest", async (request, reply) => {
      if (request.url.startsWith("/docs")) {
        reply.header("content-security-policy", swaggerCspValue);
      }
    });
  }
});
