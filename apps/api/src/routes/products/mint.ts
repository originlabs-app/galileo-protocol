import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { EventType } from "@galileo/shared";
import { requireRole } from "../../middleware/rbac.js";
import { RouteError } from "../../utils/route-error.js";
import { enqueueWebhookEvent } from "../../services/webhooks/outbox.js";
import { mintProduct } from "../../services/blockchain/mint.js";
import type { MintParams } from "../../services/blockchain/types.js";
import { publicSafeErrorReason } from "../../utils/public-safe-error.js";
import { getMintMode } from "./mint-mode.js";

export default async function mintProductRoute(fastify: FastifyInstance) {
  fastify.post<{ Params: { id: string } }>(
    "/products/:id/mint",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description:
          "Mint a DRAFT product on-chain, transitioning it to ACTIVE status",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Product ID" },
          },
          required: ["id"],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user;

      // brandId null guard: non-ADMIN users without a brandId cannot access product routes
      if (user.role !== "ADMIN" && !user.brandId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User must belong to a brand",
          },
        });
      }

      // Determine if real on-chain minting is possible:
      // chain plugin must be enabled AND infrastructure contracts must be deployed.
      const infra = fastify.chain.deployment.infrastructure;
      const canUseRealChain =
        fastify.chain.chainEnabled &&
        infra.identityRegistry !== null &&
        infra.compliance !== null &&
        fastify.chain.walletClient !== undefined;

      const mintMode = getMintMode({
        nodeEnv: process.env.NODE_ENV,
        chainEnabled: fastify.chain.chainEnabled,
        canUseRealChain,
      });

      // ── REAL CHAIN PATH ─────────────────────────────────────────────────────
      if (mintMode === "real") {
        // Pre-fetch product to build MintParams (outside transaction — blockchain
        // call may take several seconds, so we don't hold a DB transaction open).
        const product = await fastify.prisma.product.findUnique({
          where: { id },
          include: { passport: true, brand: true },
        });

        if (!product) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Product not found" },
          });
        }

        if (user.role !== "ADMIN" && product.brandId !== user.brandId) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Product not found" },
          });
        }

        if (product.status !== "DRAFT") {
          return reply.status(409).send({
            success: false,
            error: {
              code: "CONFLICT",
              message: "Product is not in DRAFT status",
            },
          });
        }

        // Atomically transition DRAFT → MINTING to claim the slot and prevent
        // concurrent requests from double-minting the same product.
        const setMinting = await fastify.prisma.product.updateMany({
          where: { id, status: "DRAFT" },
          data: { status: "MINTING" },
        });

        if (setMinting.count === 0) {
          return reply.status(409).send({
            success: false,
            error: {
              code: "CONFLICT",
              message: "Product is not in DRAFT status",
            },
          });
        }

        // Deploy GalileoCompliance + GalileoToken on Base Sepolia.
        // GalileoCompliance is deployed per-product by mintProduct() — no shared compliance needed.
        const mintParams: MintParams = {
          admin: fastify.chain.walletClient.account.address as `0x${string}`,
          identityRegistry: infra.identityRegistry as `0x${string}`,
          productDID: product.did,
          productCategory: product.category,
          brandDID: product.brand.did,
          productURI: product.passport?.digitalLink ?? "",
          gtin: product.gtin,
          serialNumber: product.serialNumber,
          initialOwner: (product.walletAddress ??
            fastify.chain.walletClient.account.address) as `0x${string}`,
        };

        let txHash: `0x${string}`;
        let tokenAddress: `0x${string}`;
        let complianceAddress: `0x${string}`;
        let chainId: number;

        try {
          const result = await mintProduct(
            fastify.chain.walletClient,
            fastify.chain.publicClient,
            mintParams,
          );
          txHash = result.txHash;
          tokenAddress = result.tokenAddress;
          complianceAddress = result.complianceAddress;
          chainId = result.chainId;
        } catch (err) {
          const reason = publicSafeErrorReason(err);
          const chainId = fastify.chain.deployment.chainId;

          // Blockchain deployment failed — revert product to DRAFT (best effort)
          await fastify.prisma.product
            .update({ where: { id }, data: { status: "DRAFT" } })
            .catch((rollbackErr: unknown) => {
              fastify.log.error(
                {
                  productId: id,
                  brandId: product.brandId,
                  chainId,
                  reason: publicSafeErrorReason(rollbackErr),
                },
                "[mint] Failed to revert product to DRAFT after blockchain error",
              );
            });

          fastify.log.error(
            {
              productId: id,
              brandId: product.brandId,
              chainId,
              reason,
            },
            "[mint] Blockchain deployment failed",
          );
          return reply.status(502).send({
            success: false,
            error: {
              code: "BLOCKCHAIN_ERROR",
              message: "Blockchain minting failed",
            },
          });
        }

        // Commit on-chain data to DB and transition MINTING → ACTIVE.
        const mintedAt = new Date();
        await fastify.prisma.$transaction(
          async (tx: import("../../plugins/prisma.js").TxClient) => {
            await tx.product.update({
              where: { id },
              data: { status: "ACTIVE" },
            });

            await tx.productPassport.update({
              where: { productId: id },
              data: { txHash, tokenAddress, chainId, mintedAt },
            });

            await tx.productEvent.create({
              data: {
                productId: id,
                type: "MINTED",
                data: { txHash, tokenAddress, complianceAddress, chainId },
                performedBy: user.sub,
              },
            });
          },
        );

        const fullProduct = await fastify.prisma.product.findUnique({
          where: { id },
          include: {
            passport: true,
            events: { orderBy: { createdAt: "desc" }, take: 50 },
          },
        });

        if (!fullProduct) {
          return reply.status(500).send({
            success: false,
            error: {
              code: "INTERNAL_ERROR",
              message: "Product not found after mint — this should not happen",
            },
          });
        }

        await enqueueWebhookEvent(fastify.prisma, EventType.MINTED, id, {
          productId: id,
          txHash,
          tokenAddress,
        }).catch(() => {});

        return reply.status(200).send({
          success: true,
          data: { product: fullProduct },
        });
      }

      if (mintMode === "unavailable") {
        fastify.log.error(
          {
            chainId: fastify.chain.deployment.chainId,
            chainEnabled: fastify.chain.chainEnabled,
            rpcConfigured: fastify.chain.rpcConfigured,
            writeCredentialsConfigured:
              fastify.chain.writeCredentialsConfigured,
            identityRegistryConfigured: infra.identityRegistry !== null,
            complianceConfigured: infra.compliance !== null,
          },
          "[mint] Real blockchain minting unavailable",
        );
        return reply.status(503).send({
          success: false,
          error: {
            code: "BLOCKCHAIN_UNAVAILABLE",
            message: "Real blockchain minting is not available.",
          },
        });
      }

      // ── MOCK PATH ───────────────────────────────────────────────────────────
      // Used only in local development/test when chain writes are disabled.
      // Generates synthetic on-chain data deterministically for dev/test.

      const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
      const tokenAddress = `0x${crypto.randomBytes(20).toString("hex")}`;
      const chainId = 84532; // Base Sepolia
      const mintedAt = new Date();

      // Optimistic concurrency control: lookup product, verify DRAFT status, then
      // use updateMany WHERE status=DRAFT to atomically flip to ACTIVE.
      // If a concurrent request already changed the status, updateMany returns count=0
      // and we return 409 — preventing TOCTOU race conditions without row-level locks.
      try {
        await fastify.prisma.$transaction(
          async (tx: import("../../plugins/prisma.js").TxClient) => {
            const product = await tx.product.findUnique({
              where: { id },
              include: { passport: true },
            });

            if (!product) {
              throw new RouteError(404, "NOT_FOUND", "Product not found");
            }

            // Brand scoping: BRAND_ADMIN can only mint their own brand's products; ADMIN can mint any
            if (user.role !== "ADMIN" && product.brandId !== user.brandId) {
              throw new RouteError(404, "NOT_FOUND", "Product not found");
            }

            // Product must be in DRAFT status
            if (product.status !== "DRAFT") {
              throw new RouteError(
                409,
                "CONFLICT",
                "Product is not in DRAFT status",
              );
            }

            // Use conditional update to prevent race: only update if status is still DRAFT
            const updated = await tx.product.updateMany({
              where: { id, status: "DRAFT" },
              data: { status: "ACTIVE" },
            });

            if (updated.count === 0) {
              throw new RouteError(
                409,
                "CONFLICT",
                "Product is not in DRAFT status",
              );
            }

            await tx.productPassport.update({
              where: { productId: id },
              data: {
                txHash,
                tokenAddress,
                chainId,
                mintedAt,
              },
            });

            await tx.productEvent.create({
              data: {
                productId: id,
                type: "MINTED",
                data: { txHash, tokenAddress, chainId },
                performedBy: user.sub,
              },
            });
          },
        );
      } catch (err) {
        if (err instanceof RouteError) {
          return reply.status(err.statusCode).send({
            success: false,
            error: {
              code: err.code,
              message: err.message,
            },
          });
        }
        throw err;
      }

      // Re-fetch with all relations for complete response
      const fullProduct = await fastify.prisma.product.findUnique({
        where: { id },
        include: {
          passport: true,
          events: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });

      if (!fullProduct) {
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Product not found after mint — this should not happen",
          },
        });
      }

      // Fire webhook (non-blocking, R29 — cross-cutting hooks fail silently)
      await enqueueWebhookEvent(fastify.prisma, EventType.MINTED, id, {
        productId: id,
        txHash,
        tokenAddress,
      }).catch(() => {
        // Webhook enqueue failure must not break the request
      });

      return reply.status(200).send({
        success: true,
        data: { product: fullProduct },
      });
    },
  );
}
