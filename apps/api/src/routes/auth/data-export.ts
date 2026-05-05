import type { FastifyInstance } from "fastify";

export default async function dataExportRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/me/data",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          "Export all personal data for the authenticated user (GDPR Art. 15). " +
          "Returns user profile, brand association, products, events, audit logs, and webhooks.",
        tags: ["Auth", "GDPR"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const { sub } = request.user;

      const user = await fastify.prisma.user.findUnique({
        where: { id: sub },
        include: { brand: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }

      // Run all parallel queries together
      const [products, webhooks, auditLogs, events] = await Promise.all([
        // Products owned by user's brand (if any)
        user.brandId
          ? fastify.prisma.product.findMany({
              where: { brandId: user.brandId },
              include: { passport: true },
            })
          : Promise.resolve([]),

        // Webhook subscriptions for the user's brand
        user.brandId
          ? fastify.prisma.webhookSubscription.findMany({
              where: { brandId: user.brandId },
              select: {
                id: true,
                url: true,
                events: true,
                active: true,
                createdAt: true,
                updatedAt: true,
                // exclude secret
              },
            })
          : Promise.resolve([]),

        // Audit log entries attributed to this user
        fastify.prisma.auditLog.findMany({
          where: { actor: sub },
          orderBy: { createdAt: "desc" },
          take: 1000,
        }),

        // Events performed by this user
        fastify.prisma.productEvent.findMany({
          where: { performedBy: sub },
          orderBy: { createdAt: "desc" },
          take: 1000,
        }),
      ]);

      // Build export -- explicitly exclude passwordHash and refreshToken
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        brand: user.brand
          ? {
              id: user.brand.id,
              name: user.brand.name,
              slug: user.brand.slug,
              did: user.brand.did,
              createdAt: user.brand.createdAt,
            }
          : null,
        products,
        webhooks,
        auditLogs,
        events,
      };

      const filename = `galileo-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      reply.header(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );

      return reply.status(200).send({
        success: true,
        data: exportData,
      });
    },
  );
}
