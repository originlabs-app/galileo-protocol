import fp from "fastify-plugin";
import fastifyCookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

const isProduction = config.NODE_ENV === "production";

export default fp(async (fastify: FastifyInstance) => {
  const secret = config.COOKIE_SECRET;

  if (!secret && !isProduction) {
    fastify.log.warn(
      "COOKIE_SECRET not set — cookies are unsigned. Set COOKIE_SECRET for signed cookies.",
    );
  }

  await fastify.register(fastifyCookie, {
    secret: secret || undefined,
  });
});
