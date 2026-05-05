import type { FastifyInstance } from "fastify";
import type { ProductStatus } from "../../generated/prisma/enums.js";
import {
  padGtin14,
  productMaterialsSchema,
  readProductPassportAuthoringMetadata,
  validateGtin,
  type BlockchainVerification,
} from "@galileo/shared";
import { getPublicClient } from "../../services/blockchain/client.js";
import { verifyOnChain } from "../../services/blockchain/verify.js";

const CHAIN_NAMES: Record<number, string> = {
  8453: "Base",
  84532: "Base Sepolia",
};

const EXPLORER_BASE_URLS: Record<number, string> = {
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

/**
 * Maps internal product status to public-safe resolver values.
 * Only ACTIVE and RECALLED are exposed; other statuses are hidden behind 404.
 */
const STATUS_MAP: Partial<Record<ProductStatus, string>> = {
  ACTIVE: "verified",
  RECALLED: "recalled",
};

/** Prisma include for resolver queries — passport + brand + events relations. */
const RESOLVER_INCLUDE = {
  passport: true,
  brand: true,
  events: { orderBy: { createdAt: "asc" as const }, take: 50 },
} as const;

/**
 * JSON-LD @context array.
 * Order matters: later contexts override earlier ones for term collisions.
 * Galileo context is last so its mappings (e.g. "status") take precedence.
 */
export const JSONLD_CONTEXT = [
  "https://schema.org",
  "https://ref.gs1.org/voc/",
  "https://vocab.galileoprotocol.io/contexts/galileo.jsonld",
] as const;

export default async function resolveDigitalLinkRoute(
  fastify: FastifyInstance,
) {
  fastify.get<{ Params: { gtin: string; serial: string } }>(
    "/01/:gtin/21/:serial",
    {
      schema: {
        description:
          "Resolve a GS1 Digital Link to a JSON-LD product passport. " +
          "Public endpoint — no authentication required.",
        tags: ["Resolver"],
        params: {
          type: "object",
          properties: {
            gtin: { type: "string", description: "GS1 GTIN (8-14 digits)" },
            serial: { type: "string", description: "Product serial number" },
          },
          required: ["gtin", "serial"],
        },
      },
    },
    async (request, reply) => {
      const { gtin: rawGtin } = request.params;
      // URL-decode serial (Fastify already decodes params, but ensure it)
      const serial = decodeURIComponent(request.params.serial);

      // Validate GTIN check digit before DB lookup
      if (!validateGtin(rawGtin)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid GTIN check digit",
          },
        });
      }

      // DB stores the original GTIN length — try raw param first, then
      // try with leading zeros stripped (e.g., 14-digit "00012345678905" → 13-digit "0012345678905")
      // so that both padded and unpadded GTINs resolve correctly.
      let product = await fastify.prisma.product.findUnique({
        where: {
          gtin_serialNumber: { gtin: rawGtin, serialNumber: serial },
        },
        include: RESOLVER_INCLUDE,
      });

      if (!product) {
        // Strip leading zeros added by 14-digit padding to recover the stored form
        const strippedGtin = rawGtin.replace(/^0+/, "") || "0";
        // Re-pad to common lengths: try 13-digit form (most common stored form)
        const gtin13 = strippedGtin.padStart(13, "0");
        if (gtin13 !== rawGtin) {
          product = await fastify.prisma.product.findUnique({
            where: {
              gtin_serialNumber: { gtin: gtin13, serialNumber: serial },
            },
            include: RESOLVER_INCLUDE,
          });
        }
      }

      // Return 404 if not found or status not publicly resolvable
      if (!product || !STATUS_MAP[product.status]) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      // Pad GTIN to 14 digits for all URIs (GS1 canonical form)
      const gtin14 = padGtin14(rawGtin);
      const mappedStatus = STATUS_MAP[product.status];

      const authoringMetadata = readProductPassportAuthoringMetadata(
        product.passport?.metadata,
      );
      const rawMaterials = authoringMetadata.materials ?? [];
      const parsedMaterials = productMaterialsSchema.safeParse(rawMaterials);
      const materials = parsedMaterials.success ? parsedMaterials.data : [];

      // Read on-chain data when the product has a token address
      const onChainData =
        product.passport?.tokenAddress
          ? await verifyOnChain(
              getPublicClient(),
              product.passport.tokenAddress as `0x${string}`,
            )
          : null;

      // Build blockchain verification object when passport has been minted
      const blockchain: BlockchainVerification | null = product.passport?.txHash
        ? {
            verified:
              product.status === "ACTIVE" && (onChainData?.found ?? false),
            txHash: product.passport.txHash,
            tokenId: product.passport.tokenAddress ?? null,
            chain: product.passport.chainId
              ? (CHAIN_NAMES[product.passport.chainId] ??
                `Chain ${product.passport.chainId}`)
              : "Base Sepolia",
            explorerUrl: `${
              (product.passport.chainId &&
                EXPLORER_BASE_URLS[product.passport.chainId]) ??
              "https://sepolia.basescan.org"
            }/tx/${product.passport.txHash}`,
            onChainDID: onChainData?.productDID ?? null,
            onChainGtin: onChainData?.gtin ?? null,
            onChainSerial: onChainData?.serialNumber ?? null,
            onChainCategory: onChainData?.productCategory ?? null,
            isDecommissioned: onChainData?.isDecommissioned ?? false,
          }
        : null;

      // Build JSON-LD payload with @context array (C1: Galileo context, I1: canonical GS1 URL)
      const jsonLd = {
        "@context": JSONLD_CONTEXT,
        "@type": "IndividualProduct",
        "@id": `did:galileo:01:${gtin14}:21:${serial}`,
        name: product.name,
        description: product.description,
        gtin: gtin14,
        serialNumber: product.serialNumber,
        category: product.category,
        status: mappedStatus,
        brand: product.brand
          ? {
              "@type": "Brand",
              "@id": product.brand.did,
              name: product.brand.name,
            }
          : null,
        passport: product.passport
          ? {
              digitalLink: product.passport.digitalLink,
              txHash: product.passport.txHash,
              tokenAddress: product.passport.tokenAddress,
              chainId: product.passport.chainId,
              mintedAt: product.passport.mintedAt,
            }
          : null,
        blockchain,
        ...(materials.length > 0 ? { hasMaterialComposition: materials } : {}),
        provenance:
          product.events
            ?.filter((e) => e.type !== "UPDATED")
            .map((e) => ({
              "@type": "ProvenanceEvent",
              eventType: e.type,
              timestamp: e.createdAt,
              ...(e.type === "RECALLED" &&
              e.data &&
              typeof e.data === "object" &&
              "reason" in (e.data as Record<string, unknown>)
                ? {
                    description: (e.data as Record<string, unknown>).reason,
                  }
                : {}),
            })) ?? [],
      };

      return reply
        .status(200)
        .header("content-type", "application/ld+json")
        .send(jsonLd);
    },
  );
}
