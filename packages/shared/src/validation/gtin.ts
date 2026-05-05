/**
 * GTIN validation using the GS1 mod-10 check digit algorithm.
 *
 * Supports GTIN-13 (EAN-13) and GTIN-14 barcodes.
 *
 * @module validation/gtin
 */

const NUMERIC_REGEX = /^\d+$/;

/**
 * Computes the GS1 mod-10 check digit for a numeric string (without the check digit).
 *
 * Algorithm:
 * 1. Starting from the rightmost digit, alternate multipliers of 3 and 1.
 * 2. Sum all products.
 * 3. Check digit = (10 - (sum % 10)) % 10.
 *
 * @param digits - The numeric string WITHOUT the check digit (e.g., 12 digits for GTIN-13).
 * @returns The check digit (0–9).
 */
export function computeGtinCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = Number(digits[i]);
    // Position from the right (0-indexed): rightmost digit gets multiplier 3
    const positionFromRight = digits.length - 1 - i;
    const multiplier = positionFromRight % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Validates a GTIN-13 string (13 numeric digits with correct GS1 check digit).
 *
 * @param gtin - The GTIN-13 string to validate.
 * @returns `true` if valid, `false` otherwise.
 */
export function validateGtin13(gtin: string): boolean {
  if (gtin.length !== 13 || !NUMERIC_REGEX.test(gtin)) {
    return false;
  }
  const payload = gtin.slice(0, 12);
  const expectedCheckDigit = computeGtinCheckDigit(payload);
  return Number(gtin[12]) === expectedCheckDigit;
}

/**
 * Validates a GTIN-14 string (14 numeric digits with correct GS1 check digit).
 *
 * @param gtin - The GTIN-14 string to validate.
 * @returns `true` if valid, `false` otherwise.
 */
export function validateGtin14(gtin: string): boolean {
  if (gtin.length !== 14 || !NUMERIC_REGEX.test(gtin)) {
    return false;
  }
  const payload = gtin.slice(0, 13);
  const expectedCheckDigit = computeGtinCheckDigit(payload);
  return Number(gtin[13]) === expectedCheckDigit;
}

/**
 * Validates a GTIN string of either 13 or 14 digits.
 *
 * @param gtin - The GTIN string to validate.
 * @returns `true` if valid GTIN-13 or GTIN-14, `false` otherwise.
 */
export function validateGtin(gtin: string): boolean {
  if (gtin.length === 13) return validateGtin13(gtin);
  if (gtin.length === 14) return validateGtin14(gtin);
  return false;
}

/**
 * Pads a GTIN to 14 digits with leading zeros (GS1 GTIN-14 canonical form).
 *
 * Accepts GTIN-13 or GTIN-14 inputs. Shorter inputs are left-padded with zeros.
 *
 * @param gtin - The GTIN string (13 or 14 digits).
 * @returns The 14-digit padded GTIN string.
 */
export function padGtin14(gtin: string): string {
  return gtin.padStart(14, "0");
}
