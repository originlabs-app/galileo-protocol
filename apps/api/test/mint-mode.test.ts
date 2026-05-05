import { describe, expect, it } from "vitest";
import { getMintMode } from "../src/routes/products/mint-mode.js";

describe("getMintMode", () => {
  it("uses the real chain path when available", () => {
    expect(
      getMintMode({
        nodeEnv: "production",
        chainEnabled: true,
        canUseRealChain: true,
      }),
    ).toBe("real");
  });

  it("allows mock minting only outside production when chain writes are disabled", () => {
    expect(
      getMintMode({
        nodeEnv: "development",
        chainEnabled: false,
        canUseRealChain: false,
      }),
    ).toBe("mock");
  });

  it("blocks mock minting in production when chain writes are unavailable", () => {
    expect(
      getMintMode({
        nodeEnv: "production",
        chainEnabled: false,
        canUseRealChain: false,
      }),
    ).toBe("unavailable");
  });

  it("blocks mock minting when chain is enabled but infrastructure is incomplete", () => {
    expect(
      getMintMode({
        nodeEnv: "development",
        chainEnabled: true,
        canUseRealChain: false,
      }),
    ).toBe("unavailable");
  });
});
