import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/** HTTP methods that are considered mutations and should be audited */
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Fields to strip from request body before logging (PII/secrets) */
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "refreshToken",
  "email",
]);

/** Sanitize request body: remove sensitive fields, truncate large values */
function sanitizeBody(
  body: unknown,
): Record<string, string | number | boolean | null> {
  if (!body || typeof body !== "object") return {};
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 200) {
      sanitized[key] = value.slice(0, 200) + "...";
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value;
    } else {
      sanitized[key] = String(value);
    }
  }
  return sanitized;
}

/** Extract resource type from URL path */
function extractResource(url: string): string {
  const segments = url.split("/").filter(Boolean);
  if (segments[0] === "auth") return "auth";
  if (segments[0] === "products") return "product";
  if (segments[0] === "01") return "resolver";
  if (segments[0] === "audit-log") return "audit";
  return segments[0] ?? "unknown";
}

/** Extract resource ID from URL path if present */
function extractResourceId(url: string): string | null {
  const match = url.match(/\/products\/([^/]+)/);
  return match?.[1] ?? null;
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Only audit mutations that succeeded (2xx)
      if (!MUTATION_METHODS.has(request.method)) return;
      if (reply.statusCode < 200 || reply.statusCode >= 300) return;

      // Skip health checks and other non-business routes
      if (request.url === "/health") return;

      const actor = request.user?.sub ?? null;
      const action = `${request.method} ${request.routeOptions?.url ?? request.url}`;
      const resource = extractResource(request.url);
      const resourceId = extractResourceId(request.url);

      try {
        await fastify.prisma.auditLog.create({
          data: {
            actor,
            action,
            resource,
            resourceId,
            metadata: {
              statusCode: reply.statusCode,
              body: sanitizeBody(request.body),
              requestId: request.id,
            },
            ip: request.ip,
          },
        });
      } catch {
        // Audit logging must never break the request -- log and continue
        request.log.error("Failed to write audit log entry");
      }
    },
  );
});
