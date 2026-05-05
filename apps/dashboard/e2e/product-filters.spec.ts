import { test, expect } from "@playwright/test";

test.describe("Product List Controls", () => {
  test("category and sorting controls are visible on products page", async ({
    page,
  }) => {
    await page.goto("/dashboard/products");
    await expect(page).toHaveURL(/\/dashboard\/products/);

    await expect(
      page.getByRole("combobox").filter({ hasText: "All categories" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("combobox").filter({ hasText: "Date created" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Newest first" }),
    ).toBeVisible();
  });

  test("category dropdown shows options", async ({ page }) => {
    await page.goto("/dashboard/products");

    await page
      .getByRole("combobox")
      .filter({ hasText: "All categories" })
      .click();

    await expect(
      page.getByRole("option", { name: "Leather Goods" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Jewelry" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Watches" })).toBeVisible();
  });

  test("selecting a category filter exposes clear filters", async ({ page }) => {
    await page.goto("/dashboard/products");

    await page
      .getByRole("combobox")
      .filter({ hasText: "All categories" })
      .click();
    await page.getByRole("option", { name: "Watches" }).click();

    await expect(page.getByText("Clear filters")).toBeVisible();
  });

  test("clear filters resets the category filter", async ({ page }) => {
    await page.goto("/dashboard/products");

    await page
      .getByRole("combobox")
      .filter({ hasText: "All categories" })
      .click();
    await page.getByRole("option", { name: "Watches" }).click();

    await expect(page.getByText("Clear filters")).toBeVisible();
    await page.getByText("Clear filters").click();

    await expect(page.getByText("Clear filters")).not.toBeVisible();
    await expect(
      page.getByRole("combobox").filter({ hasText: "All categories" }),
    ).toBeVisible();
  });

  test("controls are usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard/products");

    const categoryControl = page
      .getByRole("combobox")
      .filter({ hasText: "All categories" });
    await expect(categoryControl).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: "Newest first" }),
    ).toBeVisible();

    await categoryControl.click();
    await expect(page.getByRole("option", { name: "Watches" })).toBeVisible();
  });
});
