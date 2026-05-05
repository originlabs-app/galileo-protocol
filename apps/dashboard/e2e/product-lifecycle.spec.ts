import { test, expect } from "@playwright/test";

test.describe("Product Lifecycle", () => {
  test("create product → verify identity checkpoint → edit DRAFT passport without changing identity", async ({
    page,
  }) => {
    const uniqueSerial = `SN-E2E-${Date.now()}`;

    // Navigate directly to the product creation flow
    await page.goto("/dashboard/products/new");
    await expect(page).toHaveURL(/\/dashboard\/products\/new/);

    // Fill the product creation form
    await page.getByLabel("Name").fill("E2E Test Product");
    await page.getByLabel("GTIN").fill("00012345678905");
    await page.getByLabel("Serial Number").fill(uniqueSerial);

    // Select category from dropdown
    await page.getByRole("combobox", { name: /category/i }).click();
    await page.getByRole("option", { name: "Leather Goods" }).click();

    // Submit the form
    await page.getByRole("button", { name: /create product/i }).click();

    // Verify redirect to the dedicated identity checkpoint
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+\/identity$/, {
      timeout: 15_000,
    });

    await expect(
      page.getByText("Identity locked in", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(uniqueSerial, { exact: true })).toBeVisible();
    await expect(page.getByText("did:galileo:", { exact: false })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /copy gs1 digital link/i }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /continue to product record/i })
      .click();
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+$/, {
      timeout: 15_000,
    });

    // Verify the product record stays centered on identity plus editable metadata
    await expect(
      page.getByRole("heading", { name: "E2E Test Product" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Passport draft authoring stays available only while status remains DRAFT.",
      ),
    ).toBeVisible();
    await expect(page.getByText("DRAFT", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Identity baseline", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /view identity checkpoint/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /edit passport draft/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /mint to blockchain/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /transfer/i }),
    ).not.toBeVisible();
    await expect(page.getByRole("button", { name: /recall/i })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /download qr/i }),
    ).not.toBeVisible();

    await page.getByRole("button", { name: /edit passport draft/i }).click();
    await page.getByLabel("Description").fill(
      "Manual authoring proves the DRAFT passport can evolve without changing immutable identity.",
    );
    await page.getByRole("button", { name: /add material/i }).click();
    await page.getByLabel("Material name 1").fill("Lambskin");
    await page.getByLabel("Material percentage 1").fill("100");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(
      page.getByText(
        "Manual authoring proves the DRAFT passport can evolve without changing immutable identity.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Lambskin - 100%")).toBeVisible();
    await expect(page.getByText(uniqueSerial, { exact: true })).toBeVisible();
    await expect(page.getByText("did:galileo:", { exact: false })).toBeVisible();

    await page.getByRole("link", { name: /view identity checkpoint/i }).click();
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+\/identity$/, {
      timeout: 15_000,
    });
    await expect(page.getByText(uniqueSerial, { exact: true })).toBeVisible();
    await expect(page.getByText("did:galileo:", { exact: false })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /copy gs1 digital link/i }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /continue to product record/i })
      .click();
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+$/, {
      timeout: 15_000,
    });

    // Verify the products index stays focused on identity work and Phase 2 import
    await page.getByRole("link", { name: "Products" }).click();
    await page.waitForURL(/\/dashboard\/products$/, { timeout: 15_000 });
    await expect(page.getByText("Track the permanent identifiers created for each item before any downstream lifecycle workflows enter scope.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import CSV" }).first(),
    ).toBeVisible();
  });
});
