import { expect, test } from "@playwright/test";

test.describe("Webhook monitoring dashboard", () => {
  test("creates a webhook subscription and opens its delivery queue", async ({
    page,
  }) => {
    const endpointUrl = `https://example.com/galileo/e2e-${Date.now()}`;

    await page.goto("/dashboard/webhooks");
    await expect(
      page.getByRole("heading", { name: "Webhooks" }),
    ).toBeVisible();
    await expect(page.getByText("Subscriptions").first()).toBeVisible();
    await expect(page.getByText("In flight")).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText("Failing")).toBeVisible();

    await page.getByRole("button", { name: "New webhook" }).click();
    const dialog = page.getByRole("dialog", { name: "New webhook" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Endpoint URL").fill(endpointUrl);
    await dialog.getByRole("button", { name: "MINTED" }).click();
    await dialog.getByRole("button", { name: "TRANSFERRED" }).click();
    await dialog.getByRole("button", { name: "Create webhook" }).click();

    const createdDialog = page.getByRole("dialog", {
      name: "Webhook created",
    });
    await expect(createdDialog).toBeVisible({ timeout: 15_000 });
    await expect(
      createdDialog.getByText("X-Galileo-Signature"),
    ).toBeVisible();
    await createdDialog.getByRole("button", { name: "Done" }).click();

    await expect(page.getByRole("link", { name: endpointUrl })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("MINTED").first()).toBeVisible();
    await expect(page.getByText("TRANSFERRED").first()).toBeVisible();

    await page.getByRole("link", { name: endpointUrl }).click();
    await page.waitForURL(/\/dashboard\/webhooks\/[^/]+$/, {
      timeout: 15_000,
    });
    await expect(page.getByText(endpointUrl)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry all" })).toBeVisible();
    await expect(page.getByText("Deliveries", { exact: true })).toBeVisible();
    await expect(page.getByText(/No deliveries\s+in queue\./)).toBeVisible();
  });
});
