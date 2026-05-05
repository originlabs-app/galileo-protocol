/** Reusable Fastify JSON Schema fragments for route definitions. */

export const errorResponseSchema = {
  type: "object" as const,
  properties: {
    success: { type: "boolean" as const },
    error: {
      type: "object" as const,
      properties: {
        code: { type: "string" as const },
        message: { type: "string" as const },
      },
    },
  },
};
