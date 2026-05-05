import type { FastifyInstance } from "fastify";
import { EventType } from "@galileo/shared";
import { buildWorkspaceBrandFilter } from "../../utils/workspace.js";

export default async function statsProductRoute(fastify: FastifyInstance) {
  fastify.get(
    "/products/stats",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          "Get aggregated product statistics for the dashboard. " +
          "Brand-scoped for non-ADMIN users.",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user;
      const brandFilter: Record<string, unknown> | null =
        buildWorkspaceBrandFilter(reply, user);

      if (!brandFilter) {
        return;
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Run all queries in parallel for performance
      const [
        statusCounts,
        verificationCount,
        recentEvents,
        productsLast7Days,
        verificationsLast7Days,
      ] = await Promise.all([
        // Product counts by status using groupBy
        fastify.prisma.product.groupBy({
          by: ["status"],
          where: brandFilter,
          _count: { status: true },
        }),

        // Total verification events
        fastify.prisma.productEvent.count({
          where: {
            type: EventType.VERIFIED,
            product: brandFilter,
          },
        }),

        // Recent 10 events for activity feed
        fastify.prisma.productEvent.findMany({
          where: {
            product: brandFilter,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            product: {
              select: { name: true, gtin: true },
            },
          },
        }),

        // Products created in the last 7 days (for sparkline)
        fastify.prisma.product.findMany({
          where: { ...brandFilter, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),

        // Verifications in the last 7 days (for sparkline)
        fastify.prisma.productEvent.findMany({
          where: {
            type: EventType.VERIFIED,
            product: brandFilter,
            createdAt: { gte: sevenDaysAgo },
          },
          select: { createdAt: true },
        }),
      ]);

      // Transform groupBy result into a flat object
      const byStatus: Record<string, number> = {};
      for (const row of statusCounts) {
        byStatus[row.status] = row._count.status;
      }

      // Aggregate daily counts for the last 7 days (index 0 = 6 days ago, index 6 = today)
      function aggregateByDay(records: { createdAt: Date }[]): number[] {
        const counts = Array<number>(7).fill(0);
        const now = Date.now();
        for (const { createdAt } of records) {
          const daysAgo = Math.floor(
            (now - createdAt.getTime()) / (24 * 60 * 60 * 1000),
          );
          if (daysAgo >= 0 && daysAgo < 7) {
            counts[6 - daysAgo]! += 1;
          }
        }
        return counts;
      }

      return reply.status(200).send({
        success: true,
        data: {
          byStatus,
          verificationCount,
          recentEvents,
          trends: {
            productsCreated: aggregateByDay(productsLast7Days),
            verifications: aggregateByDay(verificationsLast7Days),
          },
        },
      });
    },
  );
}
