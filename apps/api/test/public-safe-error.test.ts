import { describe, expect, it } from "vitest";
import { publicSafeErrorReason } from "../src/utils/public-safe-error.js";

describe("publicSafeErrorReason", () => {
  it("redacts RPC URLs, 32-byte hex values, and obvious secret assignments", () => {
    const fakeRpcUrl = "https://base-sepolia.g.alchemy.com/v2/demo-key";
    const fakeHex = `0x${"a".repeat(64)}`;
    const reason = publicSafeErrorReason(
      new Error(
        `RPC ${fakeRpcUrl} failed with private_key=${fakeHex} and token=abc123`,
      ),
    );

    expect(reason).toContain("[redacted-url]");
    expect(reason).toContain("private_key=[redacted]");
    expect(reason).toContain("token=[redacted]");
    expect(reason).not.toContain("demo-key");
    expect(reason).not.toContain(fakeHex);
    expect(reason).not.toContain("abc123");
  });

  it("returns a bounded generic reason for non-error values", () => {
    expect(publicSafeErrorReason({ code: "E_RPC" })).toBe("Unknown error");
  });
});
