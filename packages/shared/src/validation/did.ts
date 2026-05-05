/**
 * DID generation and validation for Galileo product identifiers.
 *
 * DID format: did:galileo:01:{gtin}:21:{serial}
 * GS1 Digital Link: https://id.galileoprotocol.io/01/{gtin}/21/{serial}
 *
 * @module validation/did
 */

import {
  canonicalizeProductIdentity,
  productIdentitySchema,
} from "./product-identity.js";

const DID_REGEX = /^did:galileo:01:(\d{13,14}):21:([^:]+)$/;

/**
 * Generates a Galileo DID from a GTIN and serial number.
 * The GTIN is padded to 14 digits with leading zeros (GS1 canonical form).
 *
 * @param gtin - The GTIN (13 or 14 digits).
 * @param serial - The serial number.
 * @returns The DID string in format `did:galileo:01:{gtin14}:21:{serial}`.
 */
export function generateDid(gtin: string, serial: string): string {
  const identity = canonicalizeProductIdentity({
    gtin,
    serialNumber: serial,
  });

  return `did:galileo:01:${identity.gtin}:21:${identity.serialNumber}`;
}

/**
 * Generates a GS1 Digital Link URL from a GTIN and serial number.
 * The GTIN is padded to 14 digits with leading zeros (GS1 canonical form).
 * The serial number component is URL-encoded to handle special characters.
 *
 * @param gtin - The GTIN (13 or 14 digits).
 * @param serial - The serial number.
 * @returns The URL string in format `https://id.galileoprotocol.io/01/{gtin14}/21/{encodedSerial}`.
 */
export function generateDigitalLinkUrl(gtin: string, serial: string): string {
  const identity = canonicalizeProductIdentity({
    gtin,
    serialNumber: serial,
  });

  return `https://id.galileoprotocol.io/01/${identity.gtin}/21/${encodeURIComponent(identity.serialNumber)}`;
}

/**
 * Validates a Galileo DID string format and GTIN check digit.
 *
 * Expected format: did:galileo:01:{gtin}:21:{serial}
 * where {gtin} is 13 or 14 numeric digits with a valid GS1 check digit,
 * and {serial} is 1-20 characters of [A-Za-z0-9\-\.] per DID-METHOD.md ABNF.
 *
 * @param did - The DID string to validate.
 * @returns `true` if the DID matches the expected format and GTIN is valid, `false` otherwise.
 */
export function validateDid(did: string): boolean {
  const match = DID_REGEX.exec(did);
  if (!match || !match[1] || !match[2]) return false;

  return productIdentitySchema.safeParse({
    gtin: match[1],
    serialNumber: match[2],
  }).success;
}
