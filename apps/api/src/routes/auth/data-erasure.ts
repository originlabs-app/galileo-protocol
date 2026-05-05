import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { TxClient } from "../../plugins/prisma.js";
import { clearAuthCookies } from "../../utils/cookies.js";
import { requireCsrfHeader } from "../../middleware/csrf.js";

const dataErasureBody = z.object({
  confirm: z.literal("DELETE_MY_ACCOUNT"),
});

export default async function dataErasureRoute(fastify: FastifyInstance) {
  fastify.delete(
    "/auth/me/data",
    {
      onRequest: [requireCsrfHeader, fastify.authenticate],
      schema: {
        description:
          "Delete all personal data for the authenticated user (GDPR Art. 17). " +
          "Requires body { confirm: 'DELETE_MY_ACCOUNT' }. " +
          "Anonymizes event references, removes user record, and clears auth cookies. " +
          "Products and images belong to the brand and are NOT deleted.",
        tags: ["Auth", "GDPR"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const parsed = dataErasureBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "CONFIRMATION_REQUIRED",
            message:
              'Send { "confirm": "DELETE_MY_ACCOUNT" } to confirm account deletion.',
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const { sub } = request.user;

      const user = await fastify.prisma.user.findUnique({
        where: { id: sub },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }

      await fastify.prisma.$transaction(async (tx: TxClient) => {
        // 1. Anonymize events performed by this user (set performedBy to null)
        await tx.productEvent.updateMany({
          where: { performedBy: sub },
          data: { performedBy: null },
        });

        // 2. Delete the user record (cascades brand membership via brandId nullification)
        await tx.user.delete({
          where: { id: sub },
        });
      });

      // 3. Clear auth cookies
      clearAuthCookies(reply);

      return reply.status(200).send({
        success: true,
        data: {
          message: "All personal data has been deleted",
          deletedAt: new Date().toISOString(),
        },
      });
    },
  );
}
