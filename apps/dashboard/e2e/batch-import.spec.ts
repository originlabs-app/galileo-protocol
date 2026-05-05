import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const VALID_GTIN_13 = "4006381333931";

test.use({ storageState: "playwright/.auth/user.json" });

function createCsvFile(filename: string, rows: string[][]): string {
  return createCsvTextFile(
    filename,
    rows.map((row) => row.join(",")).join("\n"),
  );
}

function createCsvTextFile(filename: string, content: string): string {
  const dir = path.join(process.cwd(), "playwright/.tmp");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

test.describe("Batch CSV import", () => {
  test("shows validation review, commits accepted rows, and refreshes the products list", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const suffix = String(timestamp).slice(-6);
    const firstName = `E2E Bag ${timestamp}`;
    const secondName = `E2E Watch ${timestamp}`;
    const csvPath = createCsvFile("valid-import.csv", [
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      [
        firstName,
        VALID_GTIN_13,
        `IMP${suffix}A1`,
        "Leather Goods",
        "Pilot import",
        "leather",
      ],
      [
        secondName,
        VALID_GTIN_13,
        `IMP${suffix}B2`,
        "Watches",
        "Pilot import",
        "steel",
      ],
    ]);

    await page.goto("/dashboard/products");
    await expect(
      page.getByRole("main").getByRole("heading", {
        name: "Products",
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Import CSV" }).first().click();
    const dialog = page.getByRole("dialog", {
      name: "Import Products from CSV",
    });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"][accept=".csv"]').setInputFiles(csvPath);
    await expect(dialog.getByText(firstName)).toBeVisible({ timeout: 5_000 });

    await dialog.getByRole("button", { name: "Validate import" }).click();
    await expect(
      dialog.getByText("Validation passed. Ready to commit."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      dialog.getByText("Accepted rows ready for commit"),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Commit import" }).click();
    await expect(dialog.getByText("created successfully")).toBeVisible({
      timeout: 30_000,
    });
    await dialog.getByRole("button", { name: "Done" }).click();

    const firstRow = page.getByRole("row").filter({ hasText: firstName });
    const secondRow = page.getByRole("row").filter({ hasText: secondName });
    await expect(firstRow).toBeVisible({
      timeout: 15_000,
    });
    await expect(secondRow).toBeVisible();

    await firstRow.getByText(firstName, { exact: true }).click();
    await page.waitForURL(/\/dashboard\/products\/[a-zA-Z0-9-]+$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByText("Passport workspace", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Record status")).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: /^DRAFT$/ }).first(),
    ).toBeVisible();
    await expect(page.getByText("Linked media draft")).toBeVisible();
  });

  test("shows row-level validation feedback and blocks commit when dry-run finds errors", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const suffix = String(timestamp).slice(-6);
    const csvPath = createCsvFile("invalid-import.csv", [
      ["name", "gtin", "serialNumber", "category", "description", "materials"],
      [
        `Good Product ${timestamp}`,
        VALID_GTIN_13,
        `ERR${suffix}A1`,
        "Watches",
        "",
        "",
      ],
      [
        `Bad GTIN ${timestamp}`,
        "0000000000001",
        `ERR${suffix}B2`,
        "Watches",
        "",
        "",
      ],
    ]);

    await page.goto("/dashboard/products");
    await page.getByRole("button", { name: "Import CSV" }).first().click();
    const dialog = page.getByRole("dialog", {
      name: "Import Products from CSV",
    });

    await dialog.locator('input[type="file"][accept=".csv"]').setInputFiles(csvPath);
    await expect(dialog.getByText(`Good Product ${timestamp}`)).toBeVisible({
      timeout: 5_000,
    });

    await dialog.getByRole("button", { name: "Validate import" }).click();
    await expect(
      dialog.getByText("Validation blocked this import"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      dialog.getByText("Row-level validation issues"),
    ).toBeVisible();
    await expect(
      dialog.getByRole("cell", { name: "gtin", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Commit import" }),
    ).toBeDisabled();
  });

  test("preserves quoted multiline CSV fields in the local preview before server validation", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const suffix = String(timestamp).slice(-6);
    const firstLine = `Preview alpha ${timestamp}`;
    const secondLine = `Preview beta ${timestamp}`;
    const csvPath = createCsvTextFile(
      "multiline-import.csv",
      [
        'name,gtin,serialNumber,category,description,materials',
        `"Multiline Product ${timestamp}",${VALID_GTIN_13},"ML${suffix}A1","Leather Goods","${firstLine}`,
        `${secondLine}","leather"`,
      ].join("\n"),
    );

    await page.goto("/dashboard/products");
    await page.getByRole("button", { name: "Import CSV" }).first().click();
    const dialog = page.getByRole("dialog", {
      name: "Import Products from CSV",
    });

    await dialog.locator('input[type="file"][accept=".csv"]').setInputFiles(csvPath);
    await expect(dialog.getByText(firstLine)).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(secondLine)).toBeVisible();

    await dialog.getByRole("button", { name: "Validate import" }).click();
    await expect(
      dialog.getByText("Validation passed. Ready to commit."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      dialog.getByRole("cell", { name: `Multiline Product ${timestamp}` }),
    ).toBeVisible();
  });
});
