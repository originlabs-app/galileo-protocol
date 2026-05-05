import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://localhost:5432/galileo_test",
  JWT_SECRET: "x".repeat(32),
  JWT_REFRESH_SECRET: "y".repeat(32),
  NODE_ENV: "test",
};

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      ...REQUIRED_ENV,
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.resetModules();
  });

  it("accepts a comma-separated CORS_ORIGIN list", async () => {
    process.env.CORS_ORIGIN =
      "https://galileo-dashboard.vercel.app,https://galileoprotocol.io";

    const { config } = await import("../src/config.js");

    expect(config.CORS_ORIGIN).toBe(
      "https://galileo-dashboard.vercel.app,https://galileoprotocol.io",
    );
  });

  it("rejects invalid entries in the CORS_ORIGIN list", async () => {
    process.env.CORS_ORIGIN =
      "https://galileo-dashboard.vercel.app,not-a-url";

    await expect(import("../src/config.js")).rejects.toThrow(
      "Invalid environment configuration",
    );
  });
});
