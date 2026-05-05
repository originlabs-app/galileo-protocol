import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command:
        "cd ../api && pnpm build && GALILEO_DISABLE_RATE_LIMIT=true NODE_ENV=test PORT=4000 npx tsx dist/main.js",
      url: "http://localhost:4000/health",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm build && pnpm exec next start --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "cd ../scanner && pnpm build && pnpm exec next start --port 3001",
      url: "http://localhost:3001",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
