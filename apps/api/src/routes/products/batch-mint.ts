import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { EventType, ProductStatus } from "@galileo/shared";
import { requireRole } from "../../middleware/rbac.js";
import { enqueueWebhookEvent } from "../../services/webhooks/outbox.js";
import { mintProduct } from "../../services/blockchain/mint.js";
import type { MintParams } from "../../services/blockchain/types.js";
import { publicSafeErrorReason } from "../../utils/public-safe-error.js";
import { getMintMode } from "./mint-mode.js";

const CHAIN_ID = 84532; // Base Sepolia

const batchMintBodySchema = z
  .object({
    productIds: z.array(z.string().min(1)).min(1).max(100),
  })
  .strict();

interface MintError {
  productId: string;
  message: string;
}

export default async function batchMintRoute(fastify: FastifyInstance) {
  fastify.post(
    "/products/batch-mint",
    {
      onRequest: [fastify.authenticate, requireRole("BRAND_ADMIN", "ADMIN")],
      schema: {
        description:
          "Batch mint an array of DRAFT products, transitioning them to ACTIVE status",
        tags: ["Products"],
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user;

      // Brand scoping guard
      if (user.role !== "ADMIN" && !user.brandId) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "User must belong to a brand" },
        });
      }

      const parsed = batchMintBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        });
      }

      const { productIds } = parsed.data;

      // Determine if real on-chain minting is possible
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

      // Fetch all products with brand relation (needed for MintParams)
      const products = await fastify.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { passport: true, brand: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Pre-validate: check existence, status, and brand scoping
      const errors: MintError[] = [];
      const toMint: string[] = [];

      for (const id of productIds) {
        const product = productMap.get(id);
        if (!product) {
          errors.push({ productId: id, message: "Product not found" });
          continue;
        }

        // Treat cross-brand products as not found (information hiding)
        if (user.role !== "ADMIN" && product.brandId !== user.brandId) {
          errors.push({ productId: id, message: "Product not found" });
          continue;
        }

        if (product.status === ProductStatus.ACTIVE) {
          errors.push({ productId: id, message: "Product already minted" });
          continue;
        }

        if (product.status === ProductStatus.RECALLED) {
          errors.push({
            productId: id,
            message: "Cannot mint recalled product",
          });
          continue;
        }

        if (product.status !== ProductStatus.DRAFT) {
          errors.push({
            productId: id,
            message: `Product is in ${product.status} status`,
          });
          continue;
        }

        toMint.push(id);
      }

      let minted = 0;
      const mintedProducts: Array<{
        id: string;
        txHash: string;
        tokenAddress: string;
      }> = [];

      if (toMint.length > 0) {
        // ── REAL CHAIN PATH ───────────────────────────────────────────────────
        if (mintMode === "real") {
          for (const id of toMint) {
            const product = productMap.get(id)!;

            // Atomically DRAFT → MINTING
            const setMinting = await fastify.prisma.product.updateMany({
              where: { id, status: ProductStatus.DRAFT },
              data: { status: ProductStatus.MINTING },
            });

            if (setMinting.count === 0) {
              errors.push({
                productId: id,
                message: "Product status changed concurrently",
              });
              continue;
            }

            const mintParams: MintParams = {
              admin: fastify.chain.walletClient!.account
                .address as `0x${string}`,
              identityRegistry: infra.identityRegistry as `0x${string}`,
              productDID: product.did,
              productCategory: product.category,
              brandDID: product.brand.did,
              productURI: product.passport?.digitalLink ?? "",
              gtin: product.gtin,
              serialNumber: product.serialNumber,
              initialOwner: (product.walletAddress ??
                fastify.chain.walletClient!.account.address) as `0x${string}`,
            };

            try {
              const result = await mintProduct(
                fastify.chain.walletClient!,
                fastify.chain.publicClient,
                mintParams,
              );

              const mintedAt = new Date();
              await fastify.prisma.$transaction(
                async (tx: import("../../plugins/prisma.js").TxClient) => {
                  await tx.product.update({
                    where: { id },
                    data: { status: ProductStatus.ACTIVE },
                  });
                  await tx.productPassport.update({
                    where: { productId: id },
                    data: {
                      txHash: result.txHash,
                      tokenAddress: result.tokenAddress,
                      chainId: result.chainId,
                      mintedAt,
                    },
                  });
                  await tx.productEvent.create({
                    data: {
                      productId: id,
                      type: EventType.MINTED,
                      data: {
                        txHash: result.txHash,
                        tokenAddress: result.tokenAddress,
                        chainId: result.chainId,
                      },
                      performedBy: user.sub,
                    },
                  });
                },
              );

              mintedProducts.push({
                id,
                txHash: result.txHash,
                tokenAddress: result.tokenAddress,
              });
              minted++;
            } catch (err) {
              // Revert this product to DRAFT; continue with the rest
              await fastify.prisma.product
                .update({ where: { id }, data: { status: ProductStatus.DRAFT } })
                .catch(() => {});

              fastify.log.error(
                {
                  productId: id,
                  brandId: product.brandId,
                  chainId: fastify.chain.deployment.chainId,
                  reason: publicSafeErrorReason(err),
                },
                "[batch-mint] Blockchain deployment failed for product",
              );
              errors.push({
                productId: id,
                message: "Blockchain minting failed",
              });
            }
          }
        } else if (mintMode === "unavailable") {
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
            "[batch-mint] Real blockchain minting unavailable",
          );
          return reply.status(503).send({
            success: false,
            error: {
              code: "BLOCKCHAIN_UNAVAILABLE",
              message: "Real blockchain minting is not available.",
            },
          });
        } else {
          // ── MOCK PATH ───────────────────────────────────────────────────────
          try {
            await fastify.prisma.$transaction(
              async (tx: import("../../plugins/prisma.js").TxClient) => {
                for (const id of toMint) {
                  const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
                  const tokenAddress = `0x${crypto.randomBytes(20).toString("hex")}`;
                  const mintedAt = new Date();

                  // Optimistic concurrency: only update if still DRAFT
                  const updated = await tx.product.updateMany({
                    where: { id, status: ProductStatus.DRAFT },
                    data: { status: ProductStatus.ACTIVE },
                  });

                  if (updated.count === 0) {
                    errors.push({
                      productId: id,
                      message: "Product status changed concurrently",
                    });
                    continue;
                  }

                  await tx.productPassport.update({
                    where: { productId: id },
                    data: { txHash, tokenAddress, chainId: CHAIN_ID, mintedAt },
                  });

                  await tx.productEvent.create({
                    data: {
                      productId: id,
                      type: EventType.MINTED,
                      data: { txHash, tokenAddress, chainId: CHAIN_ID },
                      performedBy: user.sub,
                    },
                  });

                  mintedProducts.push({ id, txHash, tokenAddress });
                  minted++;
                }
              },
            );
          } catch {
            // Transaction failed entirely
            minted = 0;
            mintedProducts.length = 0;
          }
        }
      }

      // Fire webhooks (non-blocking, R29)
      for (const mp of mintedProducts) {
        await enqueueWebhookEvent(fastify.prisma, EventType.MINTED, mp.id, {
          productId: mp.id,
          txHash: mp.txHash,
          tokenAddress: mp.tokenAddress,
        }).catch(() => {
          // Webhook enqueue failure must not break the request
        });
      }

      return reply.status(200).send({
        success: true,
        data: { minted, errors },
      });
    },
  );
}
