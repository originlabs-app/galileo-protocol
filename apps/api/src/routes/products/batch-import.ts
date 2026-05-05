import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/rbac.js";
import { resolveWorkspaceMutationBrandId } from "../../utils/workspace.js";
import {
  commitCatalogCsvImport,
  preflightCatalogCsvImport,
} from "../../services/products/import-csv.js";

const MAX_ROWS = 500;
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export default async function batchImportRoute(fastify: FastifyInstance) {
  fastify.post<{ Querystring: { dryRun?: string; brandId?: string } }>(
    "/products/batch-import",
    {
      onRequest: [
        fastify.authenticate,
        requireRole("BRAND_ADMIN", "OPERATOR", "ADMIN"),
      ],
      schema: {
        description:
          "Dry-run or commit a product CSV import (multipart/form-data). Max 500 rows, 1MB.",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            dryRun: {
              type: "string",
              description: "Defaults to 'true'. Set to 'false' to commit rows.",
            },
            brandId: {
              type: "string",
              description: "Brand ID (required for ADMIN)",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      const dryRun = request.query.dryRun !== "false";
      const brandId = resolveWorkspaceMutationBrandId(
        reply,
        user,
        request.query.brandId,
        {
          membershipMessage: "User must belong to a brand",
          missingAdminBrandMessage: "ADMIN must provide brandId query parameter",
        },
      );

      if (!brandId) {
        return;
      }

      // Parse multipart file
      let file;
      try {
        file = await request.file();
      } catch {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Invalid multipart request" },
        });
      }

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "No file provided" },
        });
      }

      const buffer = await file.toBuffer();
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "File exceeds 1 MB limit" },
        });
      }

      const content = buffer.toString("utf-8");
      if (dryRun) {
        const result = await preflightCatalogCsvImport({
          brandId,
          content,
          maxRows: MAX_ROWS,
          prisma: fastify.prisma,
        });

        if (!result.ok) {
          return reply.status(400).send({
            success: false,
            error: { code: "BAD_REQUEST", message: result.message },
          });
        }

        return reply.status(200).send({
          success: true,
          data: {
            dryRun: true,
            created: 0,
            errors: result.errors,
            rows: result.rows,
            summary: result.summary,
          },
        });
      }

      const result = await commitCatalogCsvImport({
        brandId,
        content,
        maxRows: MAX_ROWS,
        performedBy: user.sub,
        prisma: fastify.prisma,
      });

      if (!result.ok) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: result.message },
        });
      }

      const hasCommitErrors = result.errors.length > 0;

      return reply.status(hasCommitErrors ? 400 : 201).send({
        success: !hasCommitErrors,
        ...(!hasCommitErrors
          ? {}
          : {
              error: {
                code: "VALIDATION_ERROR",
                message: "Import commit blocked by validation errors",
                details: { errors: result.errors },
              },
            }),
        data: {
          dryRun: false,
          created: result.created,
          errors: result.errors,
          rows: result.rows,
          summary: result.summary,
        },
      });
    },
  );
}
