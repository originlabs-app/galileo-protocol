/**
 * Audit trail export route.
 *
 * GET /audit-log/export
 * - format=csv|json (default: json)
 * - from/to: ISO 8601 date range filter
 * - resource: filter by resource type
 * - actor: filter by actor ID
 * - ADMIN sees all entries, BRAND_ADMIN sees only their brand's entries
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../middleware/rbac.js";

const exportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).default("json"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  resource: z.string().optional(),
  actor: z.string().optional(),
  sortBy: z.enum(["date", "action"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export default async function auditExportRoute(fastify: FastifyInstance) {
  fastify.get(
    "/audit-log/export",
    {
      onRequest: [fastify.authenticate, requireRole("ADMIN", "BRAND_ADMIN")],
      schema: {
        description:
          "Export audit log entries as CSV or JSON. " +
          "ADMIN sees all entries. BRAND_ADMIN sees only their brand's entries.",
        tags: ["Audit"],
        security: [{ cookieAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["csv", "json"],
              default: "json",
            },
            from: { type: "string", format: "date-time" },
            to: { type: "string", format: "date-time" },
            resource: { type: "string" },
            actor: { type: "string" },
            sortBy: {
              type: "string",
              enum: ["date", "action"],
              default: "date",
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
              description: "Sort direction",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = exportQuerySchema.safeParse(request.query);
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

      const { format, from, to, resource, actor, sortBy, sortOrder } = parsed.data;
      const user = request.user;

      // Build where clause
      const where: Record<string, unknown> = {};
      if (resource) where.resource = resource;
      if (actor) where.actor = actor;
      if (from || to) {
        where.createdAt = {};
        if (from)
          (where.createdAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
      }

      // Brand scoping for BRAND_ADMIN: filter by actors belonging to their brand
      if (user.role === "BRAND_ADMIN" && user.brandId) {
        const brandUsers = await fastify.prisma.user.findMany({
          where: { brandId: user.brandId },
          select: { id: true },
        });
        const brandUserIds = brandUsers.map((u: { id: string }) => u.id);
        where.actor = { in: brandUserIds };
      }

      const orderBy =
        sortBy === "action"
          ? { action: sortOrder }
          : { createdAt: sortOrder };

      const entries = await fastify.prisma.auditLog.findMany({
        where,
        orderBy,
        take: 10000, // Safety limit
      });

      if (format === "csv") {
        const header = "id,actor,action,resource,resourceId,ip,createdAt";
        const rows = entries.map(
          (e: {
            id: string;
            actor: string | null;
            action: string;
            resource: string;
            resourceId: string | null;
            ip: string | null;
            createdAt: Date;
          }) =>
            [
              e.id,
              e.actor ?? "",
              e.action,
              e.resource,
              e.resourceId ?? "",
              e.ip ?? "",
              e.createdAt.toISOString(),
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(","),
        );
        const csv = [header, ...rows].join("\n");
        return reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header(
            "Content-Disposition",
            `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
          )
          .send(csv);
      }

      // JSON format
      return reply
        .header("Content-Type", "application/json; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.json"`,
        )
        .send({
          success: true,
          data: {
            entries,
            exportedAt: new Date().toISOString(),
            count: entries.length,
          },
        });
    },
  );
}
