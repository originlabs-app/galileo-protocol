import { test, expect } from "@playwright/test";

// Sort controls are only visible after the API responds and we exit the loading skeleton.
// These tests require the full stack (API + DB) to be running.
test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Product sorting controls", () => {
  test("products page shows direction toggle button 'Newest first' by default", async ({
    page,
  }) => {
    await page.goto("/dashboard/products");
    // The direction toggle only renders after the API responds (past the skeleton)
    await expect(
      page.getByRole("button", { name: "Newest first" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("direction toggle switches between 'Newest first' and 'Oldest first'", async ({
    page,
  }) => {
    await page.goto("/dashboard/products");
    const dirBtn = page.getByRole("button", { name: "Newest first" });
    await expect(dirBtn).toBeVisible({ timeout: 10_000 });
    await dirBtn.click();
    await expect(
      page.getByRole("button", { name: "Oldest first" }),
    ).toBeVisible({ timeout: 5_000 });
    // Toggle back
    await page.getByRole("button", { name: "Oldest first" }).click();
    await expect(
      page.getByRole("button", { name: "Newest first" }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("sort field Select opens to show all sort options", async ({ page }) => {
    await page.goto("/dashboard/products");
    await expect(
      page.getByRole("button", { name: "Newest first" }),
    ).toBeVisible({ timeout: 10_000 });
    // The sort Select trigger shows the current sort field ("Date created" by default)
    await page
      .getByRole("combobox")
      .filter({ hasText: "Date created" })
      .click();
    await expect(
      page.getByRole("option", { name: "Date created" }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Last updated" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Status" })).toBeVisible();
  });

  test("selecting 'Name' sort updates the sort Select display value", async ({
    page,
  }) => {
    await page.goto("/dashboard/products");
    await expect(
      page.getByRole("button", { name: "Newest first" }),
    ).toBeVisible({ timeout: 10_000 });
    // Open sort Select and choose Name
    await page
      .getByRole("combobox")
      .filter({ hasText: "Date created" })
      .click();
    await page.getByRole("option", { name: "Name" }).click();
    // Sort trigger should now display "Name"
    await expect(
      page.getByRole("combobox").filter({ hasText: "Name" }),
    ).toBeVisible({ timeout: 5_000 });
    // Direction button should still be visible
    await expect(
      page.getByRole("button", { name: /newest first|oldest first/i }),
    ).toBeVisible();
  });
});
