import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * CSRF protection via custom header check.
 *
 * State-mutating requests (POST, PATCH, DELETE, PUT) must include
 * the `X-Galileo-Client` header. GET/HEAD/OPTIONS are exempt.
 *
 * This prevents CSRF attacks because browsers will not send custom
 * headers in simple cross-origin requests — they trigger a preflight.
 */
const MUTATING_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

export async function requireCsrfHeader(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (MUTATING_METHODS.has(request.method)) {
    const header = request.headers["x-galileo-client"];
    if (!header) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "CSRF_REQUIRED",
          message: "X-Galileo-Client header required",
        },
      });
    }
  }
}
