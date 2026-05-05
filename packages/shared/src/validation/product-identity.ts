import { z } from "zod";
import { padGtin14, validateGtin } from "./gtin.js";

export const PRODUCT_SERIAL_REGEX = /^[A-Za-z0-9.-]+$/;

export const productGtinSchema = z
  .string()
  .min(1, "GTIN is required")
  .refine(validateGtin, {
    message: "Invalid GTIN: check digit verification failed",
  });

export const productSerialSchema = z
  .string()
  .min(1, "Serial number is required")
  .max(20, "Serial number must be at most 20 characters")
  .regex(PRODUCT_SERIAL_REGEX, {
    message:
      "Serial number may contain only letters, numbers, hyphens, and periods",
  });

export const productIdentitySchema = z.object({
  gtin: productGtinSchema,
  serialNumber: productSerialSchema,
});

export type ProductIdentityInput = z.infer<typeof productIdentitySchema>;

export function parseProductIdentityInput(
  input: ProductIdentityInput,
): ProductIdentityInput {
  return productIdentitySchema.parse(input);
}

export function validateProductIdentity(
  input: ProductIdentityInput,
): boolean {
  return productIdentitySchema.safeParse(input).success;
}

export function validateProductSerial(serialNumber: string): boolean {
  return productSerialSchema.safeParse(serialNumber).success;
}

export function canonicalizeProductIdentity(
  input: ProductIdentityInput,
): ProductIdentityInput {
  const parsed = parseProductIdentityInput(input);

  return {
    gtin: padGtin14(parsed.gtin),
    serialNumber: parsed.serialNumber,
  };
}
