import type { FastifyInstance } from "fastify";
import resolveDigitalLinkRoute from "./resolve.js";

export default async function resolverRoutes(fastify: FastifyInstance) {
  await fastify.register(resolveDigitalLinkRoute);
}
