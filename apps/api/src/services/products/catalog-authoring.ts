import {
  generateDid,
  generateDigitalLinkUrl,
  productAuthoringSchema,
  productIdentitySchema,
  writeProductPassportAuthoringMetadata,
} from "@galileo/shared";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import type { TxClient } from "../../plugins/prisma.js";

export const catalogAuthoringDraftSchema =
  productIdentitySchema.merge(productAuthoringSchema);

export type CatalogAuthoringDraftInput = z.infer<
  typeof catalogAuthoringDraftSchema
>;

interface CreateCatalogProductDraftParams {
  brandId: string;
  performedBy: string;
  input: CatalogAuthoringDraftInput;
}

export async function createCatalogProductDraft(
  tx: TxClient,
  params: CreateCatalogProductDraftParams,
) {
  const { brandId, performedBy, input } = params;
  const did = generateDid(input.gtin, input.serialNumber);
  const digitalLink = generateDigitalLinkUrl(input.gtin, input.serialNumber);
  const passportMetadata = writeProductPassportAuthoringMetadata(undefined, {
    materials: input.materials,
    media: input.media,
  });

  const product = await tx.product.create({
    data: {
      gtin: input.gtin,
      serialNumber: input.serialNumber,
      did,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      brandId,
    },
  });

  const passport = await tx.productPassport.create({
    data: {
      productId: product.id,
      digitalLink,
      ...(Object.keys(passportMetadata).length > 0
        ? {
            metadata: passportMetadata as Prisma.InputJsonValue,
          }
        : {}),
    },
  });

  await tx.productEvent.create({
    data: {
      productId: product.id,
      type: "CREATED",
      data: {
        name: input.name,
        gtin: input.gtin,
        serialNumber: input.serialNumber,
        category: input.category,
      },
      performedBy,
    },
  });

  return { product, passport };
}
