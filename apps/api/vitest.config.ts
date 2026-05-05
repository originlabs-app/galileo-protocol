import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  `postgresql://${process.env.USER ?? "postgres"}@localhost:5432/galileo_test`;

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: "./test/global-setup.ts",
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
    },
  },
});
