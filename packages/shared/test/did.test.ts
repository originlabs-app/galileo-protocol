import { describe, it, expect } from "vitest";
import {
  generateDid,
  generateDigitalLinkUrl,
  validateDid,
} from "../src/validation/did.js";
import {
  canonicalizeProductIdentity,
  productIdentitySchema,
  productSerialSchema,
  validateProductIdentity,
  validateProductSerial,
} from "../src/validation/product-identity.js";

describe("DID generation", () => {
  it("generates correct DID format with 14-digit padded GTIN", () => {
    expect(generateDid("4006381333931", "ABC123")).toBe(
      "did:galileo:01:04006381333931:21:ABC123",
    );
  });

  it("generates DID with numeric serial and pads 13-digit GTIN", () => {
    expect(generateDid("0614141007349", "001")).toBe(
      "did:galileo:01:00614141007349:21:001",
    );
  });

  it("generates DID with GTIN-14 (no extra padding needed)", () => {
    expect(generateDid("10614141007346", "SN-2024")).toBe(
      "did:galileo:01:10614141007346:21:SN-2024",
    );
  });
});

describe("GS1 Digital Link URL generation", () => {
  it("generates correct URL format with 14-digit padded GTIN", () => {
    expect(generateDigitalLinkUrl("4006381333931", "ABC123")).toBe(
      "https://id.galileoprotocol.io/01/04006381333931/21/ABC123",
    );
  });

  it("generates URL with GTIN-14 (no extra padding needed)", () => {
    expect(generateDigitalLinkUrl("10614141007346", "SN-2024")).toBe(
      "https://id.galileoprotocol.io/01/10614141007346/21/SN-2024",
    );
  });

  it("rejects serial with hash (#)", () => {
    expect(() => generateDigitalLinkUrl("0012345678905", "SN#1")).toThrow(
      /Serial number/i,
    );
  });

  it("rejects serial with question mark (?)", () => {
    expect(() => generateDigitalLinkUrl("0012345678905", "SN?1")).toThrow(
      /Serial number/i,
    );
  });

  it("rejects serial with slash (/)", () => {
    expect(() => generateDigitalLinkUrl("0012345678905", "SN/1")).toThrow(
      /Serial number/i,
    );
  });

  it("rejects serial with space", () => {
    expect(() => generateDigitalLinkUrl("0012345678905", "SN 1")).toThrow(
      /Serial number/i,
    );
  });

  it("rejects serial with multiple special chars", () => {
    expect(() => generateDigitalLinkUrl("0012345678905", "SN#1/2")).toThrow(
      /Serial number/i,
    );
  });

  it("does not double-encode already safe characters", () => {
    expect(generateDigitalLinkUrl("0012345678905", "SN-001")).toBe(
      "https://id.galileoprotocol.io/01/00012345678905/21/SN-001",
    );
  });
});

describe("Product identity validation", () => {
  it("accepts the same GTIN and serial pair used by DID generation", () => {
    expect(
      validateProductIdentity({
        gtin: "4006381333931",
        serialNumber: "SN-001.v2",
      }),
    ).toBe(true);
  });

  it("rejects serials outside the Galileo DID character set", () => {
    expect(validateProductSerial("SN/001")).toBe(false);
    expect(validateProductSerial("SN 001")).toBe(false);
    expect(validateProductSerial("SN#001")).toBe(false);
  });

  it("exposes serial schema errors before DID helpers are called", () => {
    const result = productSerialSchema.safeParse("SN/001");

    expect(result.success).toBe(false);
    expect(result.error.issues[0]?.message).toContain(
      "letters, numbers, hyphens, and periods",
    );
  });

  it("pads valid GTINs to canonical GTIN-14 form", () => {
    expect(
      canonicalizeProductIdentity({
        gtin: "4006381333931",
        serialNumber: "SN-001",
      }),
    ).toEqual({
      gtin: "04006381333931",
      serialNumber: "SN-001",
    });
  });

  it("keeps the shared schema aligned with DID validation requirements", () => {
    const result = productIdentitySchema.safeParse({
      gtin: "4006381333931",
      serialNumber: "123456789012345678901",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0]?.path).toEqual(["serialNumber"]);
  });
});

describe("DID validation", () => {
  it("validates correct DID format with valid GTIN-13 check digit", () => {
    // 4006381333931 is a valid GTIN-13
    expect(validateDid("did:galileo:01:4006381333931:21:ABC123")).toBe(true);
  });

  it("validates DID with valid GTIN-14 check digit", () => {
    // 10614141007346 is a valid GTIN-14
    expect(validateDid("did:galileo:01:10614141007346:21:SN-2024")).toBe(true);
  });

  it("validates DID with valid GTIN (0012345678905)", () => {
    // 0012345678905 has valid check digit 5
    expect(validateDid("did:galileo:01:0012345678905:21:SN001")).toBe(true);
  });

  it("rejects DID with invalid GTIN check digit (0012345678999)", () => {
    // 0012345678999 has wrong check digit (should be 8, not 9)
    expect(validateDid("did:galileo:01:0012345678999:21:SN001")).toBe(false);
  });

  it("rejects DID with GTIN-13 bad check digit (4006381333932)", () => {
    // Last digit should be 1, not 2
    expect(validateDid("did:galileo:01:4006381333932:21:ABC123")).toBe(false);
  });

  it("rejects DID with GTIN-14 bad check digit (10614141007347)", () => {
    // Last digit should be 6, not 7
    expect(validateDid("did:galileo:01:10614141007347:21:SN-2024")).toBe(false);
  });

  it("rejects DID with wrong prefix", () => {
    expect(validateDid("did:other:01:4006381333931:21:ABC123")).toBe(false);
  });

  it("rejects DID with missing serial", () => {
    expect(validateDid("did:galileo:01:4006381333931")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateDid("")).toBe(false);
  });

  it("rejects DID with non-numeric GTIN part", () => {
    expect(validateDid("did:galileo:01:abc:21:SN")).toBe(false);
  });

  it("rejects DID with serial containing slash", () => {
    expect(validateDid("did:galileo:01:4006381333931:21:SN/001")).toBe(false);
  });

  it("rejects DID with serial containing space", () => {
    expect(validateDid("did:galileo:01:4006381333931:21:SN 001")).toBe(false);
  });

  it("rejects DID with serial containing hash", () => {
    expect(validateDid("did:galileo:01:4006381333931:21:SN#001")).toBe(false);
  });

  it("rejects DID with serial exceeding 20 characters", () => {
    expect(
      validateDid("did:galileo:01:4006381333931:21:A23456789012345678901"),
    ).toBe(false);
  });

  it("validates DID with serial containing dots and hyphens", () => {
    expect(validateDid("did:galileo:01:4006381333931:21:SN-001.v2")).toBe(true);
  });

  it("validates DID with serial at max length (20 chars)", () => {
    expect(
      validateDid("did:galileo:01:4006381333931:21:12345678901234567890"),
    ).toBe(true);
  });
});
