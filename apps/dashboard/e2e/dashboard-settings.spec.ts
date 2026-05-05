import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  // No auth for these tests — we're verifying the unauthenticated login UI
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page renders with email, password and sign-in button", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In", exact: true }),
    ).toBeVisible();
  });

  test("invalid credentials stay on login without navigating to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.invalid");
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    // Must not redirect to dashboard on bad credentials
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 8_000 });
  });
});

test.describe("Settings page — GDPR", () => {
  // These tests use the default project storageState (authenticated admin)

  test("settings page renders with Settings heading", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("settings page shows account card with signed-in email", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Account", { exact: true })).toBeVisible();
    // The seeded admin email used in auth.setup.ts
    await expect(page.getByText(/admin@galileo\.test/i)).toBeVisible();
  });

  test("settings page shows Your data (GDPR) card", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Your data (GDPR)")).toBeVisible();
  });

  test("Download button is visible in GDPR card", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  });

  test("Download exports the signed-in user's GDPR JSON", async ({ page }) => {
    await page.goto("/dashboard/settings");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^galileo-data-export-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });

  test("Delete account button opens confirmation dialog", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    await expect(
      page.getByRole("dialog", { name: "Delete your account?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Yes, delete permanently" }),
    ).toBeVisible();
  });

  test("Cancel in delete dialog closes it without navigating away", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });
});
