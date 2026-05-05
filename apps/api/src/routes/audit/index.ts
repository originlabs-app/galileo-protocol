import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../middleware/rbac.js";
import auditExportRoute from "./export.js";

const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  resource: z.string().optional(),
  actor: z.string().optional(),
});

export default async function auditRoutes(fastify: FastifyInstance) {
  // Register export route first (more specific path)
  await fastify.register(auditExportRoute);

  fastify.get(
    "/audit-log",
    {
      onRequest: [fastify.authenticate, requireRole("ADMIN")],
      schema: {
        description:
          "List audit log entries. ADMIN only. " +
          "Supports pagination and filtering by resource type or actor.",
        tags: ["Audit"],
        security: [{ cookieAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              default: 1,
              description: "Page number",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
              description: "Items per page",
            },
            resource: {
              type: "string",
              description: "Filter by resource type",
            },
            actor: {
              type: "string",
              description: "Filter by actor user ID",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = auditQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const { page, limit, resource, actor } = parsed.data;

      const where: Record<string, string> = {};
      if (resource) where.resource = resource;
      if (actor) where.actor = actor;

      const [entries, total] = await Promise.all([
        fastify.prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        fastify.prisma.auditLog.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        success: true,
        data: {
          entries,
          pagination: { total, page, limit, totalPages },
        },
      });
    },
  );
}
