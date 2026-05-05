import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client.js";

/** Transaction client type for use in $transaction callbacks */
export type TxClient = Prisma.TransactionClient;
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
