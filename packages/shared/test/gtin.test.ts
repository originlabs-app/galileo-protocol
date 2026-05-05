import { describe, it, expect } from "vitest";
import {
  validateGtin13,
  validateGtin14,
  validateGtin,
  computeGtinCheckDigit,
  padGtin14,
} from "../src/validation/gtin.js";

describe("GTIN-13 validation", () => {
  it("accepts a valid GTIN-13 (4006381333931)", () => {
    expect(validateGtin13("4006381333931")).toBe(true);
  });

  it("accepts a valid GTIN-13 (0614141007349)", () => {
    expect(validateGtin13("0614141007349")).toBe(true);
  });

  it("accepts a valid GTIN-13 with all zeros except check digit (0000000000000)", () => {
    expect(validateGtin13("0000000000000")).toBe(true);
  });

  it("rejects GTIN-13 with wrong check digit", () => {
    expect(validateGtin13("4006381333932")).toBe(false);
  });

  it("rejects GTIN-13 with too few digits (12 digits)", () => {
    expect(validateGtin13("400638133393")).toBe(false);
  });

  it("rejects GTIN-13 with too many digits (14 digits)", () => {
    expect(validateGtin13("40063813339310")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(validateGtin13("400638133393a")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateGtin13("")).toBe(false);
  });
});

describe("GTIN-14 validation", () => {
  it("accepts a valid GTIN-14 (10614141007346)", () => {
    expect(validateGtin14("10614141007346")).toBe(true);
  });

  it("accepts a valid GTIN-14 (00000000000000)", () => {
    expect(validateGtin14("00000000000000")).toBe(true);
  });

  it("rejects GTIN-14 with wrong check digit", () => {
    expect(validateGtin14("10614141007347")).toBe(false);
  });

  it("rejects GTIN-14 with too few digits (13 digits)", () => {
    expect(validateGtin14("1061414100734")).toBe(false);
  });

  it("rejects GTIN-14 with too many digits (15 digits)", () => {
    expect(validateGtin14("106141410073460")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(validateGtin14("1061414100734x")).toBe(false);
  });
});

describe("computeGtinCheckDigit", () => {
  it("computes correct check digit for GTIN-13 (400638133393 → 1)", () => {
    expect(computeGtinCheckDigit("400638133393")).toBe(1);
  });

  it("computes correct check digit for GTIN-14 (1061414100734 → 6)", () => {
    expect(computeGtinCheckDigit("1061414100734")).toBe(6);
  });

  it("computes check digit 0 for all-zeros prefix", () => {
    expect(computeGtinCheckDigit("000000000000")).toBe(0);
  });
});

describe("validateGtin (unified)", () => {
  it("validates GTIN-13 through unified function", () => {
    expect(validateGtin("4006381333931")).toBe(true);
  });

  it("validates GTIN-14 through unified function", () => {
    expect(validateGtin("10614141007346")).toBe(true);
  });

  it("rejects invalid-length GTIN through unified function", () => {
    expect(validateGtin("12345")).toBe(false);
  });
});

describe("padGtin14", () => {
  it("pads 13-digit GTIN to 14 digits with leading zero", () => {
    expect(padGtin14("4006381333931")).toBe("04006381333931");
  });

  it("pads 13-digit GTIN starting with zero", () => {
    expect(padGtin14("0012345678905")).toBe("00012345678905");
  });

  it("leaves 14-digit GTIN unchanged", () => {
    expect(padGtin14("10614141007346")).toBe("10614141007346");
  });

  it("pads shorter strings to 14 digits", () => {
    expect(padGtin14("12345")).toBe("00000000012345");
  });
});
