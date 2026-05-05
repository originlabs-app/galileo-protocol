import { z } from "zod";
import {
  CATEGORIES,
  CATEGORY_VALIDATION_MESSAGE,
} from "../constants/categories.js";

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_MATERIALS = 20;
const MAX_MEDIA = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withDefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

export const productAuthoringNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`);

export const productAuthoringDescriptionSchema = z
  .string()
  .max(
    MAX_DESCRIPTION_LENGTH,
    `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
  );

export const productCategorySchema = z.enum(CATEGORIES, {
  message: CATEGORY_VALIDATION_MESSAGE,
});

export const productMaterialSchema = z.object({
  name: z
    .string()
    .min(1, "Material name is required")
    .max(100, "Material name must be at most 100 characters"),
  percentage: z
    .number()
    .min(0, "Material percentage must be at least 0")
    .max(100, "Material percentage must be at most 100"),
});

export const productMaterialsSchema = z
  .array(productMaterialSchema)
  .max(MAX_MATERIALS, `Materials must contain at most ${MAX_MATERIALS} entries`);

export const productMediaKindSchema = z.enum(["image", "certificate"], {
  message: "Media kind must be one of: image, certificate",
});

export const productMediaDescriptorSchema = z.object({
  kind: productMediaKindSchema,
  url: z
    .string()
    .min(1, "Media URL is required")
    .max(2048, "Media URL must be at most 2048 characters"),
  cid: z
    .string()
    .max(255, "Media CID must be at most 255 characters")
    .optional(),
  alt: z
    .string()
    .min(1, "Media alt text is required")
    .max(255, "Media alt text must be at most 255 characters"),
  position: z
    .number()
    .int("Media position must be an integer")
    .min(0, "Media position must be at least 0"),
});

export const productMediaDescriptorsSchema = z
  .array(productMediaDescriptorSchema)
  .max(MAX_MEDIA, `Media must contain at most ${MAX_MEDIA} entries`);

export const productAuthoringSchema = z
  .object({
    name: productAuthoringNameSchema,
    description: productAuthoringDescriptionSchema.optional(),
    category: productCategorySchema,
    materials: productMaterialsSchema.optional(),
    media: productMediaDescriptorsSchema.optional(),
  })
  .strict();

export const productAuthoringPatchSchema = z
  .object({
    name: productAuthoringNameSchema.optional(),
    description: productAuthoringDescriptionSchema.optional(),
    category: productCategorySchema.optional(),
    materials: productMaterialsSchema.optional(),
    media: productMediaDescriptorsSchema.optional(),
  })
  .strict();

const productPassportAuthoringFieldsSchema = z
  .object({
    materials: productMaterialsSchema.optional(),
    media: productMediaDescriptorsSchema.optional(),
  })
  .strict();

export const PRODUCT_PASSPORT_AUTHORING_VERSION = 1 as const;

export const productPassportAuthoringMetadataSchema =
  productPassportAuthoringFieldsSchema.extend({
    version: z.literal(PRODUCT_PASSPORT_AUTHORING_VERSION),
  });

export const productPassportMetadataEnvelopeSchema = z
  .object({
    authoring: productPassportAuthoringMetadataSchema.optional(),
  })
  .passthrough();

export type ProductAuthoringInput = z.infer<typeof productAuthoringSchema>;
export type ProductAuthoringPatchInput = z.infer<
  typeof productAuthoringPatchSchema
>;
export type ProductMaterial = z.infer<typeof productMaterialSchema>;
export type ProductMediaDescriptor = z.infer<typeof productMediaDescriptorSchema>;
export type ProductPassportAuthoringMetadata = z.infer<
  typeof productPassportAuthoringMetadataSchema
>;
export type ProductPassportAuthoringMetadataInput = z.input<
  typeof productPassportAuthoringFieldsSchema
>;

function parseLegacyAuthoringMetadata(
  metadata: Record<string, unknown>,
): ProductPassportAuthoringMetadata | null {
  const legacyParsed = productPassportAuthoringFieldsSchema.safeParse(metadata);

  if (!legacyParsed.success) {
    return null;
  }

  return {
    version: PRODUCT_PASSPORT_AUTHORING_VERSION,
    ...legacyParsed.data,
  };
}

export function readProductPassportAuthoringMetadata(
  metadata: unknown,
): ProductPassportAuthoringMetadata {
  if (isRecord(metadata)) {
    const envelopeParsed = productPassportMetadataEnvelopeSchema.safeParse(
      metadata,
    );

    if (envelopeParsed.success && envelopeParsed.data.authoring) {
      return envelopeParsed.data.authoring;
    }

    const legacyAuthoring = parseLegacyAuthoringMetadata(metadata);
    if (legacyAuthoring) {
      return legacyAuthoring;
    }
  }

  return { version: PRODUCT_PASSPORT_AUTHORING_VERSION };
}

export function writeProductPassportAuthoringMetadata(
  metadata: unknown,
  input: ProductPassportAuthoringMetadataInput,
): Record<string, unknown> {
  const existingMetadata = isRecord(metadata) ? { ...metadata } : {};
  const currentAuthoring = readProductPassportAuthoringMetadata(existingMetadata);
  const nextFields = productPassportAuthoringFieldsSchema.parse(input);

  const nextAuthoringFields = withDefinedFields({
    materials:
      nextFields.materials !== undefined
        ? nextFields.materials
        : currentAuthoring.materials,
    media: nextFields.media !== undefined ? nextFields.media : currentAuthoring.media,
  });

  delete existingMetadata.materials;
  delete existingMetadata.media;
  delete existingMetadata.authoring;

  if (Object.keys(nextAuthoringFields).length === 0) {
    return existingMetadata;
  }

  return {
    ...existingMetadata,
    authoring: {
      version: PRODUCT_PASSPORT_AUTHORING_VERSION,
      ...nextAuthoringFields,
    },
  };
}
