import { test, expect } from "@playwright/test";

test.describe("Dashboard auth persistence", () => {
  test("retries one protected request after refresh and stays signed in after reload", async ({
    page,
  }) => {
    let forcedUnauthorized = false;

    await page.route("**/products/stats", async (route) => {
      if (!forcedUnauthorized) {
        forcedUnauthorized = true;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Forced browser-side auth expiry for refresh test",
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    const refreshResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/auth/refresh") &&
        response.request().method() === "POST",
    );
    const retriedStatsPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/products/stats") && response.status() === 200,
    );

    await page.goto("/dashboard");

    const refreshResponse = await refreshResponsePromise;
    const retriedStatsResponse = await retriedStatsPromise;

    expect(forcedUnauthorized).toBe(true);
    expect(refreshResponse.ok()).toBe(true);
    expect(retriedStatsResponse.ok()).toBe(true);

    const statValue = page.locator(".text-4xl.font-semibold").first();
    await expect(
      page.locator(".text-4xl.font-semibold").first(),
    ).not.toHaveText("\u2014", { timeout: 10_000 });
    await expect(page.getByText("Welcome back, admin@galileo.test")).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Total Products")).toBeVisible();
    await expect(statValue).not.toHaveText("\u2014", { timeout: 10_000 });
    await expect(page.getByText("Welcome back, admin@galileo.test")).toBeVisible();
  });
});
