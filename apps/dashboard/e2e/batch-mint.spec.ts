import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const VALID_GTIN_13 = "4006381333931";

type CreateProductResponse = {
  success: true;
  data: {
    product: {
      id: string;
      name: string;
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

async function getCurrentBrandId(page: Page): Promise<string> {
  const response = await page.context().request.get("http://localhost:4000/auth/me");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as AuthMeResponse;
  expect(body.data.user.brandId).toBeTruthy();
  return body.data.user.brandId!;
}

async function createDraftProduct(
  page: Page,
  name: string,
  serialNumber: string,
) {
  const brandId = await getCurrentBrandId(page);
  const response = await page.context().request.post("http://localhost:4000/products", {
    data: {
      name,
      gtin: VALID_GTIN_13,
      serialNumber,
      category: "Watches",
      brandId,
    },
    headers: { "X-Galileo-Client": "test" },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as CreateProductResponse;
  return body.data.product;
}

test.describe("Batch mint dashboard flow", () => {
  test("selects draft products from the list and batch mints them", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const suffix = String(timestamp).slice(-10);
    const firstName = `Batch Mint E2E A ${timestamp}`;
    const secondName = `Batch Mint E2E B ${timestamp}`;

    await createDraftProduct(page, firstName, `BMA${suffix}`);
    await createDraftProduct(page, secondName, `BMB${suffix}`);

    await page.goto("/dashboard/products");
    await expect(page.getByRole("row").filter({ hasText: firstName })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("row").filter({ hasText: secondName }),
    ).toBeVisible();

    await page
      .getByLabel(`Select ${firstName} for batch minting`)
      .check();
    await page
      .getByLabel(`Select ${secondName} for batch minting`)
      .check();

    await page.getByRole("button", { name: "Mint selected (2)" }).click();
    await expect(
      page.getByText("Batch mint complete: 2 products minted."),
    ).toBeVisible({ timeout: 30_000 });

    const firstRow = page.getByRole("row").filter({ hasText: firstName });
    const secondRow = page.getByRole("row").filter({ hasText: secondName });
    await expect(firstRow.getByText("Identity active")).toBeVisible();
    await expect(secondRow.getByText("Identity active")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mint selected (0)" })).toBeDisabled();
  });
});
