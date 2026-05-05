import type { FastifyInstance } from "fastify";

export default async function gdprStatusRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/me/gdpr-status",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          "Return GDPR compliance status for the authenticated user: " +
          "data retention policy, available rights, and account state.",
        tags: ["Auth", "GDPR"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const { sub } = request.user;

      const user = await fastify.prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, email: true, createdAt: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          userId: user.id,
          accountCreatedAt: user.createdAt,
          // No soft-delete model — deletion is immediate and irreversible
          hasPendingDeletion: false,
          dataRetentionPolicy: {
            personalData:
              "Retained until account deletion request (GDPR Art. 17). " +
              "Deletion is immediate and irreversible.",
            auditLogs:
              "Audit trail entries are anonymised (actor reference removed) " +
              "on account deletion and retained for legal compliance.",
            productData:
              "Products and Digital Product Passports belong to your brand " +
              "and are not affected by account deletion.",
          },
          rights: {
            portability: {
              description: "Export a copy of all your personal data (GDPR Art. 15)",
              endpoint: "GET /auth/me/data",
            },
            erasure: {
              description:
                "Permanently delete your account and anonymise personal references (GDPR Art. 17)",
              endpoint: "DELETE /auth/me/data",
              confirmationRequired: true,
            },
          },
        },
      });
    },
  );
}
