import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "../generated/prisma/client.js";

/**
 * RBAC guard factory — checks that the authenticated user has one of the allowed roles.
 *
 * Usage:
 *   fastify.get('/admin', { onRequest: [fastify.authenticate, requireRole('ADMIN')] }, handler)
 *
 * Exported for Sprint 2 use. Not actively used in Sprint 1 routes.
 */
export function requireRole(
  ...allowedRoles: Role[]
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role;

    if (!userRole || !allowedRoles.includes(userRole as Role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }
  };
}
