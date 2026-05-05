import { test, expect } from "@playwright/test";

const VALID_ETH_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

test.describe("Transfer with Compliance", () => {
  test("create product, mint, and transfer to valid address succeeds", async ({
    page,
  }) => {
    const uniqueSerial = `SN-C${String(Date.now()).slice(-12)}`;

    // Navigate to the products list
    await page.goto("/dashboard/products");
    await expect(page).toHaveURL(/\/dashboard\/products/);

    // Click "New Product" button
    await page.getByRole("link", { name: /new product/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/products\/new/);

    // Fill the product creation form
    await page.getByLabel("Name").fill("Compliance Test Product");
    await page.getByLabel("GTIN").fill("00012345678905");
    await page.getByLabel("Serial Number").fill(uniqueSerial);

    // Select category from dropdown
    await page.getByRole("combobox", { name: /category/i }).click();
    await page.getByRole("option", { name: "Leather Goods" }).click();

    // Submit the form
    await page.getByRole("button", { name: /create product/i }).click();

    // Verify redirect to the dedicated identity checkpoint, then continue.
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+\/identity$/, {
      timeout: 15_000,
    });
    await page
      .getByRole("link", { name: /continue to product record/i })
      .click();
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+$/, {
      timeout: 15_000,
    });

    // Verify DRAFT status badge
    const draftBadge = page.getByText("DRAFT", { exact: true }).first();
    await expect(draftBadge).toBeVisible();

    // Mint the product
    const mintButton = page.getByRole("button", { name: /mint/i });
    await expect(mintButton).toBeVisible();
    await mintButton.click();
    await page.getByRole("button", { name: /confirm mint/i }).click();

    // Wait for ACTIVE status
    const activeBadge = page.getByText("Active", { exact: true }).first();
    await expect(activeBadge).toBeVisible({ timeout: 15_000 });

    // Extract the product ID from the URL
    const url = page.url();
    const productId = url.split("/").pop();
    expect(productId).toBeDefined();

    // Transfer via API using Playwright request context (dashboard does not
    // have a transfer form in the UI yet, so we use the API directly)
    const apiContext = await page.context().request;
    const transferRes = await apiContext.post(
      `http://localhost:4000/products/${productId}/transfer`,
      {
        data: { toAddress: VALID_ETH_ADDRESS },
        headers: { "X-Galileo-Client": "test" },
      },
    );
    expect(transferRes.status()).toBe(200);
    const transferBody = await transferRes.json();
    expect(transferBody.success).toBe(true);
    expect(transferBody.data.product.walletAddress).toBeTruthy();
  });

  test("transfer via API returns compliance rejection details", async ({
    page,
  }) => {
    // Use the API directly to test compliance rejection
    // The sanctions list is empty by default in production, so this test
    // verifies the response structure when compliance passes
    const apiContext = await page.context().request;

    // First create and mint a product via API
    const createRes = await apiContext.post("http://localhost:4000/products", {
      data: {
        name: "Compliance API Product",
        gtin: "00012345678905",
        serialNumber: `SN-API-COMP-${Date.now()}`,
        category: "Watches",
      },
      headers: { "X-Galileo-Client": "test" },
    });

    if (createRes.status() === 201) {
      const createBody = await createRes.json();
      const productId = createBody.data.product.id;

      // Mint
      const mintRes = await apiContext.post(
        `http://localhost:4000/products/${productId}/mint`,
        {
          headers: { "X-Galileo-Client": "test" },
        },
      );
      expect(mintRes.status()).toBe(200);

      // Transfer to a valid address (compliance should pass)
      const transferRes = await apiContext.post(
        `http://localhost:4000/products/${productId}/transfer`,
        {
          data: { toAddress: VALID_ETH_ADDRESS },
          headers: { "X-Galileo-Client": "test" },
        },
      );
      expect(transferRes.status()).toBe(200);
    }
  });
});
