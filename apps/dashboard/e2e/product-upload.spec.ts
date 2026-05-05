import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";

// Create a small image fixture for testing.
function createFixture(filePath: string, bytes: number[]): void {
  const buffer = Buffer.from(bytes);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

async function createDraftProduct(page: import("@playwright/test").Page, name: string, serialNumber: string) {
  await page.goto("/dashboard/products/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("GTIN").fill("00012345678905");
  await page.getByLabel("Serial Number").fill(serialNumber);
  await page.getByRole("combobox", { name: /category/i }).click();
  await page.getByRole("option", { name: "Watches" }).click();
  await page.getByRole("button", { name: /add material/i }).click();
  await page.getByLabel("Material name 1").fill("Calfskin");
  await page.getByLabel("Material percentage 1").fill("100");
  await page.getByRole("button", { name: /create product/i }).click();

  await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+\/identity$/, {
    timeout: 15_000,
  });
  await page.getByRole("link", { name: /continue to product record/i }).click();
  await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+$/, {
    timeout: 15_000,
  });
}

test.describe("Product Image Upload", () => {
  const testPngPath = path.join(
    __dirname,
    "..",
    "playwright",
    "test-image.png",
  );
  const testJpegPath = path.join(
    __dirname,
    "..",
    "playwright",
    "test-image.jpg",
  );

  test.beforeAll(() => {
    createFixture(testPngPath, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    createFixture(testJpegPath, [
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
      0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb,
      0xdf, 0xbd, 0x17, 0xff, 0xd9,
    ]);
  });

  test.afterAll(() => {
    for (const fixturePath of [testPngPath, testJpegPath]) {
      if (fs.existsSync(fixturePath)) {
        fs.unlinkSync(fixturePath);
      }
    }
  });

  test("image upload component is visible on product detail page", async ({
    page,
  }) => {
    const uniqueSerial = `SN-UP-${Date.now()}`;
    await createDraftProduct(page, "Upload Test Product", uniqueSerial);

    await expect(page.getByLabel("Media alt text")).toBeVisible();
    await expect(page.getByText("Upload linked image")).toBeVisible();
  });

  test("uploading and replacing an image persists the draft media descriptor", async ({
    page,
  }) => {
    const uniqueSerial = `SN-UP2-${Date.now()}`;
    await createDraftProduct(page, "Upload Preview Product", uniqueSerial);
    await page.getByLabel("Media alt text").fill("Front-facing dial image");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPngPath);
    await page.getByRole("button", { name: "Upload" }).click();

    await expect(page.getByAltText("Product")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("Linked image saved to the DRAFT passport."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Media alt text")).toHaveValue(
      "Front-facing dial image",
    );
    await expect(
      page.getByText("Front-facing dial image (image)"),
    ).toBeVisible();
    const firstCid = await page
      .getByText("Current linked CID:")
      .textContent();
    expect(firstCid).toBeTruthy();

    await page.getByLabel("Media alt text").fill("Updated hero image");
    await fileInput.setInputFiles(testJpegPath);
    await page.getByRole("button", { name: "Upload" }).click();

    await expect(
      page.getByText("Linked image replaced for this DRAFT passport."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Updated hero image (image)")).toBeVisible();
    await expect(page.getByText("Replace linked image")).toBeVisible();

    const secondCid = await page
      .getByText("Current linked CID:")
      .textContent();
    expect(secondCid).toBeTruthy();
    expect(secondCid).not.toBe(firstCid);
    await expect(page.getByText("Record status")).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: /^DRAFT$/ }).first(),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByAltText("Product")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Updated hero image (image)")).toBeVisible();
    await expect(page.getByAltText("Product")).toHaveAttribute(
      "src",
      /http:\/\/localhost:4000\/uploads\//,
    );
  });

  test("image upload component is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const uniqueSerial = `SN-UP3-${Date.now()}`;
    await createDraftProduct(page, "Upload Mobile Product", uniqueSerial);

    await expect(page.getByLabel("Media alt text")).toBeVisible();
    await expect(page.getByText("Upload linked image")).toBeVisible();
  });
});
