import fp from "fastify-plugin";
import * as Sentry from "@sentry/node";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    sentry: typeof Sentry | null;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  if (!config.SENTRY_DSN) {
    fastify.decorate("sentry", null);
    return;
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: config.NODE_ENV === "production" ? 0.1 : 1.0,
  });

  fastify.decorate("sentry", Sentry);

  // Capture unhandled errors
  fastify.addHook("onError", async (_request, _reply, error) => {
    Sentry.captureException(error);
  });

  // Flush on shutdown
  fastify.addHook("onClose", async () => {
    await Sentry.close(2000);
  });
});
