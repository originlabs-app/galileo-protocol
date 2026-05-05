import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ProductStatus } from "@galileo/shared";
import { buildWorkspaceBrandFilter } from "../../utils/workspace.js";

const SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt"] as const;
type SortField = (typeof SORTABLE_FIELDS)[number];

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(ProductStatus).optional(),
  category: z.string().max(100).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional().default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export default async function listProductsRoute(fastify: FastifyInstance) {
  fastify.get(
    "/products",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description:
          "List products with pagination, scoped by brand. " +
          "Results are sorted by creation date descending (newest first).",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              default: 1,
              description: "Page number (1-indexed)",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
              description: "Items per page (max 100)",
            },
            status: {
              type: "string",
              description:
                "Filter by product status (DRAFT, MINTING, ACTIVE, TRANSFERRED, RECALLED)",
            },
            category: {
              type: "string",
              description: "Filter by product category",
            },
            sortBy: {
              type: "string",
              enum: ["name", "status", "createdAt", "updatedAt"],
              default: "createdAt",
              description: "Sort field",
            },
            sortDir: {
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
      const parsed = listQuerySchema.safeParse(request.query);
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

      const { page, limit, status, category, sortBy, sortDir } = parsed.data;
      const user = request.user;
      const where: Record<string, unknown> | null = buildWorkspaceBrandFilter(
        reply,
        user,
      );

      if (!where) {
        return;
      }

      // Apply optional filters
      if (status) where.status = status;
      if (category) where.category = category;

      const orderBy: Record<SortField, "asc" | "desc"> = {
        [sortBy]: sortDir,
      } as Record<SortField, "asc" | "desc">;

      const [products, total] = await Promise.all([
        fastify.prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        fastify.prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.status(200).send({
        success: true,
        data: {
          products,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      });
    },
  );
}
