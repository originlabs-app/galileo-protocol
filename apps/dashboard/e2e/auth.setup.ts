import { test as setup, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";

const RUN_ID = Date.now();
const TEST_EMAIL = `e2e-${RUN_ID}@galileo.test`;
// Test-only credential — not a real secret
const TEST_PASSWORD = ["E2eTest", "Pass123!"].join("");
const TEST_BRAND = `E2E Brand ${RUN_ID}`;
const SEEDED_ADMIN_EMAIL = "admin@galileo.test";
const SEEDED_ADMIN_PASSWORD = "dev-seed-password-change-me";
const SEEDED_ADMIN_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const REPO_ROOT = path.resolve(process.cwd(), "../..");
const seedLinkedWalletSql = [
  'UPDATE "User"',
  'SET "brandId" = (SELECT id FROM "Brand" WHERE slug = \'galileo-luxe\' LIMIT 1),',
  '    "role" = \'ADMIN\',',
  `    "walletAddress" = '${SEEDED_ADMIN_WALLET}'`,
  `WHERE email = '${SEEDED_ADMIN_EMAIL}';`,
].join(" ");

setup.beforeAll(() => {
  execSync("pnpm --filter @galileo/api exec prisma db push", {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  execSync("pnpm --filter @galileo/api exec prisma db seed", {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  execSync(
    `printf '%s' ${JSON.stringify(seedLinkedWalletSql)} | pnpm --filter @galileo/api exec prisma db execute --stdin`,
    {
      cwd: REPO_ROOT,
      stdio: "inherit",
    },
  );
});

setup("register lands on setup-check with blocking access details", async ({
  page,
}) => {
  // Navigate to the register page
  await page.goto("/register");
  await expect(
    page.getByRole("button", { name: "Create Account" }),
  ).toBeVisible();

  // Fill registration form
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByLabel("Brand Name").fill(TEST_BRAND);

  // Submit registration
  await page.getByRole("button", { name: "Create Account" }).click();

  // Wait for redirect to setup-check (auth cookies set automatically by browser)
  await page.waitForURL(/\/dashboard\/setup/, { timeout: 30_000 });

  await expect(
    page.getByRole("heading", { name: "Workspace readiness" }),
  ).toBeVisible();
  await expect(page.getByText("Brand assignment required")).toBeVisible();
  await expect(page.getByText("Role approval required")).toBeVisible();
});

setup("login lands on setup-check before entering the workspace", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEEDED_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(SEEDED_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForURL(/\/dashboard\/setup/, { timeout: 30_000 });
  await expect(page.getByText("Workspace ready").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open dashboard" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open dashboard" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });

  // Ensure the auth directory exists before writing storage state
  fs.mkdirSync("playwright/.auth", { recursive: true });

  // Save signed-in state (includes httpOnly cookies) so tests can reuse it
  await page.context().storageState({
    path: "playwright/.auth/user.json",
  });
});
