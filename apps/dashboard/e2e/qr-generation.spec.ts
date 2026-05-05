import { expect, test } from "@playwright/test";

const VALID_GTIN_13 = "4006381333931";

type ProductLifecycleResponse = {
  success: true;
  data: {
    product: {
      id: string;
      name: string;
      gtin: string;
      serialNumber: string;
    };
  };
};

type AuthMeResponse = {
  success: true;
  data: {
    user: {
      brandId: string | null;
    };
  };
};

test.describe("QR generation dashboard flow", () => {
  test("downloads a QR PNG for an active product from the product detail page", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const suffix = String(timestamp).slice(-10);
    const productName = `QR E2E Product ${timestamp}`;
    const serialNumber = `QR${suffix}`;
    const meResponse = await page.context().request.get(
      "http://localhost:4000/auth/me",
    );
    expect(meResponse.status()).toBe(200);
    const meBody = (await meResponse.json()) as AuthMeResponse;
    expect(meBody.data.user.brandId).toBeTruthy();

    const createResponse = await page.context().request.post(
      "http://localhost:4000/products",
      {
        data: {
          name: productName,
          gtin: VALID_GTIN_13,
          serialNumber,
          category: "Leather Goods",
          brandId: meBody.data.user.brandId,
        },
        headers: { "X-Galileo-Client": "test" },
      },
    );
    expect(createResponse.status()).toBe(201);
    const createBody = (await createResponse.json()) as ProductLifecycleResponse;
    const { id } = createBody.data.product;

    const mintResponse = await page.context().request.post(
      `http://localhost:4000/products/${id}/mint`,
      { headers: { "X-Galileo-Client": "test" } },
    );
    expect(mintResponse.status()).toBe(200);

    await page.goto(`/dashboard/products/${id}`);
    await expect(
      page.getByRole("heading", { name: productName }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download QR" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      `galileo-qr-${VALID_GTIN_13}-${serialNumber}.png`,
    );
  });
});
