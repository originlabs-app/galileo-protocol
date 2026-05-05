import { test, expect } from "@playwright/test";

test.describe("Dashboard Home", () => {
  test("setup-check keeps pilot brand context before workspace entry", async ({
    page,
  }) => {
    await page.goto("/dashboard/setup");
    await expect(page).toHaveURL(/\/dashboard\/setup/);
    await expect(page.getByText("Galileo Luxe").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open dashboard" }),
    ).toBeVisible();
  });

  test("shell only exposes the mono-brand pilot navigation", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(
      page.getByRole("link", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Products", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /transfers/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Webhooks", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Settings", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Audit log", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Galileo Luxe").first()).toBeVisible();
    await expect(page.getByText("admin").first()).toBeVisible();
  });

  test("displays stat cards with correct labels", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify all 4 stat cards are present
    await expect(
      page.getByText("Total Products", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Active Passports", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Transferred", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]').filter({
        hasText: "Verifications",
      }),
    ).toBeVisible();
  });

  test("stat cards show numeric values after loading", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for loading to finish (em dashes should disappear)
    // Stats should show numbers (at least 0)
    const statValues = page.locator('[data-slot="card-content"] .text-4xl');
    await expect(statValues.first()).not.toHaveText("\u2014", {
      timeout: 10_000,
    });

    // Verify at least one stat card has a numeric value
    const firstValue = await statValues.first().textContent();
    expect(firstValue).toMatch(/^\d+$/);
  });

  test("shows activity feed section", async ({ page }) => {
    await page.goto("/dashboard");

    // The activity feed header should be visible
    await expect(page.getByText("Recent Activity", { exact: true })).toBeVisible();

    // Should show either events or the empty state message
    await expect
      .poll(async () => {
        const hasEvents = (await page.getByRole("listitem").count()) > 0;
        const hasEmptyState = await page
          .getByText("No recent activity")
          .isVisible()
          .catch(() => false);

        return hasEvents || hasEmptyState;
      })
      .toBe(true);
  });

  test("stat cards are responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");

    // Verify stat cards are still visible on mobile
    await expect(
      page.getByText("Total Products", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Active Passports", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Transferred", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]').filter({
        hasText: "Verifications",
      }),
    ).toBeVisible();
  });

  test("CTA button links to products page", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for stats to load
    await expect(
      page.locator(".text-4xl.font-semibold").first(),
    ).not.toHaveText("\u2014", { timeout: 10_000 });

    // CTA should link to products
    const cta = page.getByRole("link", {
      name: /(view products|create your first product)/i,
    });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/dashboard\/products/);
  });

  test("setup-check continues into the dashboard workspace", async ({ page }) => {
    await page.goto("/dashboard/setup");
    await page.getByRole("link", { name: "Open dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Total Products")).toBeVisible();
  });
});
