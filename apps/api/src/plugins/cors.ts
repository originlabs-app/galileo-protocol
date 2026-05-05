import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export default fp(async (fastify: FastifyInstance) => {
  // CORS_ORIGIN supports comma-separated list for multiple allowed origins
  // e.g. "http://localhost:3000,https://galileoprotocol.io"
  const rawOrigin = config.CORS_ORIGIN;
  const origin: string | string[] = rawOrigin.includes(",")
    ? rawOrigin.split(",").map((s) => s.trim()).filter(Boolean)
    : rawOrigin;

  await fastify.register(fastifyCors, {
    origin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Galileo-Client"],
    credentials: true,
  });
});
