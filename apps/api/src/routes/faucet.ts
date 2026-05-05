import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isAddress, parseEther, formatEther } from "viem";
import {
  getPublicClient,
  getWalletClient,
} from "../services/blockchain/client.js";

/** In-memory rate limiter: normalized address → timestamp of last successful drip */
const rateLimitMap = new Map<string, number>();

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const DRIP_AMOUNT = parseEther("0.001");
const MIN_BALANCE = parseEther("0.002");

let totalDrips = 0;

const DripBodySchema = z.object({
  address: z
    .string()
    .refine((v) => isAddress(v), { message: "Invalid Ethereum address" }),
});

export default async function faucetRoutes(fastify: FastifyInstance) {
  const faucetEnabled = process.env.FAUCET_ENABLED !== "false";

  // POST /faucet/drip — send 0.001 ETH to the provided address
  fastify.post(
    "/faucet/drip",
    {
      schema: {
        description: "Request 0.001 ETH from the Galileo testnet faucet",
        tags: ["Faucet"],
      },
    },
    async (request, reply) => {
      if (!faucetEnabled) {
        return reply.status(503).send({
          success: false,
          error: { code: "FAUCET_DISABLED", message: "Faucet is currently disabled" },
        });
      }

      const parsed = DripBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_ADDRESS",
            message: parsed.error.issues[0]?.message ?? "Invalid address",
          },
        });
      }

      const { address } = parsed.data;
      const key = address.toLowerCase();

      // Rate limit: one drip per wallet per 24h
      const lastDrip = rateLimitMap.get(key);
      if (lastDrip !== undefined && Date.now() - lastDrip < RATE_LIMIT_MS) {
        const remainingMs = lastDrip + RATE_LIMIT_MS - Date.now();
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return reply.status(429).send({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Already claimed in the last 24h. Try again in ${remainingHours}h.`,
          },
        });
      }

      const walletClient = getWalletClient();
      if (!walletClient?.account) {
        return reply.status(503).send({
          success: false,
          error: {
            code: "FAUCET_NOT_CONFIGURED",
            message: "Faucet wallet not configured",
          },
        });
      }

      // Check balance before sending
      const publicClient = getPublicClient();
      const balance = await publicClient.getBalance({
        address: walletClient.account.address,
      });

      if (balance < MIN_BALANCE) {
        return reply.status(503).send({
          success: false,
          error: {
            code: "FAUCET_EMPTY",
            message: "Faucet balance is too low. Please check back later.",
          },
        });
      }

      try {
        const txHash = await walletClient.sendTransaction({
          account: walletClient.account,
          to: address as `0x${string}`,
          value: DRIP_AMOUNT,
          chain: null,
        });

        rateLimitMap.set(key, Date.now());
        totalDrips++;

        return reply.status(200).send({
          success: true,
          data: {
            txHash,
            amount: "0.001",
            message: "0.001 ETH sent to your wallet on Base Sepolia",
            explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transaction failed";
        request.log.error({ err }, "[faucet] drip failed");
        return reply.status(502).send({
          success: false,
          error: { code: "TX_FAILED", message: `Transaction failed: ${message}` },
        });
      }
    },
  );

  // GET /faucet/status — balance, drip count, active flag
  fastify.get(
    "/faucet/status",
    {
      schema: {
        description: "Get faucet balance, drip count, and active status",
        tags: ["Faucet"],
      },
    },
    async (_request, reply) => {
      const walletClient = getWalletClient();

      if (!walletClient?.account) {
        return reply.status(200).send({
          success: true,
          data: {
            active: false,
            balance: "0",
            totalDrips,
            dripAmount: "0.001",
            message: "Faucet wallet not configured",
          },
        });
      }

      const publicClient = getPublicClient();
      const balance = await publicClient.getBalance({
        address: walletClient.account.address,
      });

      const active = faucetEnabled && balance >= MIN_BALANCE;

      return reply.status(200).send({
        success: true,
        data: {
          active,
          balance: formatEther(balance),
          totalDrips,
          dripAmount: "0.001",
          address: walletClient.account.address,
          message: active
            ? "Faucet is active"
            : balance < MIN_BALANCE
              ? "Faucet balance too low — please refill"
              : "Faucet is disabled",
        },
      });
    },
  );
}
