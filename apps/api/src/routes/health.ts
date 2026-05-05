import type { FastifyInstance } from "fastify";
import { createRequire } from "node:module";
import { formatEther } from "viem";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };
const DEMO_MINIMUM_WALLET_BALANCE_WEI = 10_000_000_000_000_000n; // 0.01 ETH
const DEMO_MINIMUM_WALLET_BALANCE_ETH = "0.01";

export default async function healthRoutes(fastify: FastifyInstance) {
  // Liveness probe — always 200, no external checks
  fastify.get(
    "/health/live",
    { schema: { description: "Liveness probe — always 200", tags: ["Health"] } },
    async (_request, reply) => {
      return reply.status(200).send({ status: "ok" });
    },
  );

  // Readiness probe — 503 if the database is unavailable
  fastify.get(
    "/health/ready",
    { schema: { description: "Readiness probe — 503 if DB is down", tags: ["Health"] } },
    async (_request, reply) => {
      try {
        await fastify.prisma.$queryRawUnsafe("SELECT 1");
        return reply.status(200).send({ status: "ready" });
      } catch {
        return reply
          .status(503)
          .send({ status: "not_ready", reason: "database_unavailable" });
      }
    },
  );

  fastify.get(
    "/health",
    {
      schema: {
        description: "Health check endpoint with dependency status",
        tags: ["Health"],
      },
    },
    async (_request, reply) => {
      // Database check
      let dbStatus: "ok" | "error";
      try {
        await fastify.prisma.$queryRawUnsafe("SELECT 1");
        dbStatus = "ok";
      } catch {
        dbStatus = "error";
      }

      // Storage check
      const storageStatus: "ok" | "local" = fastify.storage.isCloudStorage
        ? "ok"
        : "local";

      // Chain RPC check
      let chainStatus: "ok" | "disabled" | "error" = "disabled";
      if (fastify.chain.chainEnabled) {
        try {
          await fastify.chain.publicClient.getChainId();
          chainStatus = "ok";
        } catch {
          chainStatus = "error";
        }
      }

      let walletStatus: "ok" | "low_balance" | "disabled" | "error" =
        "disabled";
      let walletBalanceEth: string | null = null;
      const walletAddress = fastify.chain.walletClient?.account?.address ?? null;

      if (fastify.chain.chainEnabled && walletAddress) {
        try {
          const walletBalance = await fastify.chain.publicClient.getBalance({
            address: walletAddress,
          });
          walletBalanceEth = formatEther(walletBalance);
          walletStatus =
            walletBalance >= DEMO_MINIMUM_WALLET_BALANCE_WEI
              ? "ok"
              : "low_balance";
        } catch {
          walletStatus = "error";
        }
      }

      const status = dbStatus === "ok" ? "ok" : "degraded";
      const statusCode = status === "ok" ? 200 : 503;
      const contracts = Object.fromEntries(
        Object.entries(fastify.chain.deployment.infrastructure).map(
          ([name, address]) => [
            name,
            {
              address,
              explorerUrl: address
                ? fastify.chain.explorer.addressUrl(address)
                : null,
            },
          ],
        ),
      );
      const deployedContractCount = Object.values(
        fastify.chain.deployment.infrastructure,
      ).filter(Boolean).length;

      const mem = process.memoryUsage();

      return reply.status(statusCode).send({
        status,
        version: pkg.version,
        uptime: process.uptime(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
        },
        deployment: {
          environment: fastify.chain.deployment.environment,
          network: fastify.chain.deployment.network,
          chainId: fastify.chain.deployment.chainId,
          status: fastify.chain.deployment.status,
          explorer: {
            name: fastify.chain.deployment.explorer.name,
            baseUrl: fastify.chain.explorer.baseUrl,
            txBaseUrl: `${fastify.chain.explorer.baseUrl}${fastify.chain.deployment.explorer.txPath}`,
            addressBaseUrl: `${fastify.chain.explorer.baseUrl}${fastify.chain.deployment.explorer.addressPath}`,
          },
          issuance: fastify.chain.issuance,
          contracts,
          contractCount: deployedContractCount,
          rpcConfigured: fastify.chain.rpcConfigured,
          writeEnabled: fastify.chain.chainEnabled,
          writeMode: fastify.chain.chainEnabled ? "enabled" : "read-only",
          writeCredentialsConfigured: fastify.chain.writeCredentialsConfigured,
          basescanConfigured: fastify.chain.writeVerificationConfigured,
          wallet: {
            address: walletAddress,
            balanceEth: walletBalanceEth,
            minimumBalanceEth: DEMO_MINIMUM_WALLET_BALANCE_ETH,
            balanceStatus: walletStatus,
          },
        },
        dependencies: {
          database: dbStatus,
          storage: storageStatus,
          chain: chainStatus,
          wallet: walletStatus,
        },
      });
    },
  );
}
