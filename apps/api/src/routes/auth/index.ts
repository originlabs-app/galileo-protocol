import type { FastifyInstance } from "fastify";
import registerRoute from "./register.js";
import loginRoute from "./login.js";
import refreshRoute from "./refresh.js";
import meRoute from "./me.js";
import logoutRoute from "./logout.js";
import linkWalletRoute from "./link-wallet.js";
import nonceRoute from "./nonce.js";
import dataExportRoute from "./data-export.js";
import dataErasureRoute from "./data-erasure.js";
import gdprStatusRoute from "./gdpr-status.js";
import siweRoute from "./siwe.js";

export default async function authRoutes(fastify: FastifyInstance) {
  await fastify.register(registerRoute);
  await fastify.register(loginRoute);
  await fastify.register(refreshRoute);
  await fastify.register(meRoute);
  await fastify.register(logoutRoute);
  await fastify.register(nonceRoute);
  await fastify.register(linkWalletRoute);
  await fastify.register(dataExportRoute);
  await fastify.register(dataErasureRoute);
  await fastify.register(gdprStatusRoute);
  await fastify.register(siweRoute);
}
