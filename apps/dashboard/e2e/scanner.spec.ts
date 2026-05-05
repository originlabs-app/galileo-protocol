import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import fs from "node:fs";

// Scanner runs on a separate port (3001). All scanner tests target it directly.
// The scanner is a public app so no auth is required.
test.use({ storageState: { cookies: [], origins: [] } });

const SCANNER_URL = "http://localhost:3001";
const API_URL = "http://localhost:4000";
const VALID_GTIN_13 = "4006381333931";
const scannerHeading = /^(Galileo )?Verify$/;

type ProductLifecycleResponse = {
  success: true;
  data: {
    product: {
      id: string;
      name: string;
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

function readAuthCookie() {
  const storageState = JSON.parse(
    fs.readFileSync("playwright/.auth/user.json", "utf8"),
  ) as { cookies: Array<{ name: string; value: string }> };

  return storageState.cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function createActiveProduct(
  request: APIRequestContext,
  name: string,
  serialNumber: string,
) {
  const authHeaders = { Cookie: readAuthCookie() };

  const meResponse = await request.get(`${API_URL}/auth/me`, {
    headers: authHeaders,
  });
  expect(meResponse.status(), await meResponse.text()).toBe(200);
  const meBody = (await meResponse.json()) as AuthMeResponse;
  expect(meBody.data.user.brandId).toBeTruthy();

  const createResponse = await request.post(`${API_URL}/products`, {
    data: {
      name,
      gtin: VALID_GTIN_13,
      serialNumber,
      category: "Watches",
      brandId: meBody.data.user.brandId,
    },
    headers: { ...authHeaders, "X-Galileo-Client": "test" },
  });
  expect(createResponse.status()).toBe(201);
  const createBody = (await createResponse.json()) as ProductLifecycleResponse;

  const mintResponse = await request.post(
    `${API_URL}/products/${createBody.data.product.id}/mint`,
    { headers: { ...authHeaders, "X-Galileo-Client": "test" } },
  );
  expect(mintResponse.status()).toBe(200);

  return createBody.data.product;
}

test.describe("Scanner — Home page", () => {
  test("home page renders with Verify heading", async ({ page }) => {
    await page.goto(SCANNER_URL);
    await expect(
      page.getByRole("heading", { name: scannerHeading }),
    ).toBeVisible();
  });

  test("home page has Scan QR Code link pointing to /scan", async ({
    page,
  }) => {
    await page.goto(SCANNER_URL);
    const scanLink = page.getByRole("link", { name: /scan qr code/i });
    await expect(scanLink).toBeVisible();
    await expect(scanLink).toHaveAttribute("href", "/scan");
  });

  test("home page has Digital Link textarea and Verify link button", async ({
    page,
  }) => {
    await page.goto(SCANNER_URL);
    await expect(
      page.getByText("Digital Link or DID", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("textarea[name='link']")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Verify link" }),
    ).toBeVisible();
  });

  test("home page shows verification model section", async ({ page }) => {
    await page.goto(SCANNER_URL);
    await expect(page.getByText("Verification model")).toBeVisible();
  });
});

test.describe("Scanner — Invalid barcode input", () => {
  test("malformed DID shows 'Unable to verify' with DID format error", async ({
    page,
  }) => {
    // "did:invalid-format" starts with "did:" but doesn't match the galileo DID pattern.
    // normalizeResolverInput returns error without making any API call — works offline.
    await page.goto(
      `${SCANNER_URL}/?link=${encodeURIComponent("did:invalid-format")}`,
    );
    await expect(
      page.getByRole("heading", { name: "Unable to verify" }),
    ).toBeVisible();
    await expect(page.getByText(/DID format not recognized/i)).toBeVisible();
  });

  test("DID with invalid GTIN check digit shows GTIN error", async ({
    page,
  }) => {
    // 00012345678906 has the wrong check digit (should be 5, not 6).
    // normalizeResolverInput validates the check digit before any API call.
    const badDid = "did:galileo:01:00012345678906:21:SN001";
    await page.goto(
      `${SCANNER_URL}/?link=${encodeURIComponent(badDid)}`,
    );
    await expect(
      page.getByRole("heading", { name: "Unable to verify" }),
    ).toBeVisible();
    await expect(page.getByText(/GTIN check digit invalid/i)).toBeVisible();
  });

  test("unrecognized URL format shows URL format error", async ({ page }) => {
    // A string that looks like a URL but doesn't have the /01/{gtin}/21/{serial} path.
    const badUrl = "https://example.com/products/12345";
    await page.goto(
      `${SCANNER_URL}/?link=${encodeURIComponent(badUrl)}`,
    );
    await expect(
      page.getByRole("heading", { name: "Unable to verify" }),
    ).toBeVisible();
    await expect(page.getByText(/URL format not recognized/i)).toBeVisible();
  });
});

test.describe("Scanner — Active product verification", () => {
  test("resolves an ACTIVE product with blockchain context and provenance", async ({
    page,
    request,
  }) => {
    const suffix = String(Date.now()).slice(-10);
    const productName = `Scanner Chain E2E ${suffix}`;
    const serialNumber = `SCN${suffix}`;
    await createActiveProduct(request, productName, serialNumber);

    const digitalLink = `https://id.galileoprotocol.io/01/${VALID_GTIN_13}/21/${serialNumber}`;
    await page.goto(`${SCANNER_URL}/?link=${encodeURIComponent(digitalLink)}`);

    await expect(
      page.getByRole("heading", { name: productName }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator("span").filter({ hasText: /^verified$/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Verified on blockchain|Blockchain mismatch/),
    ).toBeVisible();
    await expect(page.getByText("Base Sepolia").first()).toBeVisible();
    await expect(page.getByText("Provenance Timeline")).toBeVisible();
    await expect(page.getByText("Passport minted")).toBeVisible();
  });
});

test.describe("Scanner — Offline cache", () => {
  test("replays a previously loaded verification page while offline", async ({
    page,
    request,
  }) => {
    const suffix = String(Date.now()).slice(-10);
    const productName = `Scanner Offline E2E ${suffix}`;
    const serialNumber = `OFF${suffix}`;
    await createActiveProduct(request, productName, serialNumber);

    const verificationUrl = `${SCANNER_URL}/01/${VALID_GTIN_13}/21/${serialNumber}`;
    await page.goto(verificationUrl);
    await expect(
      page.getByRole("heading", { name: productName }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator("span").filter({ hasText: /^verified$/i }),
    ).toBeVisible();

    const hasController = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are unavailable");
      }

      await navigator.serviceWorker.ready;
      return navigator.serviceWorker.controller !== null;
    });

    if (!hasController) {
      await page.reload();
      await expect(
        page.getByRole("heading", { name: productName }),
      ).toBeVisible({ timeout: 15_000 });
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
    }

    await page.context().setOffline(true);
    try {
      await expect(
        page.getByRole("heading", { name: productName }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.locator("span").filter({ hasText: /^verified$/i }),
      ).toBeVisible();
      await expect(
        page.getByText(/Verified on blockchain|Blockchain mismatch/),
      ).toBeVisible();
      await expect(page.getByText("Provenance Timeline")).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  });

  test("serves the scanner app shell and scan page while offline", async ({
    page,
  }) => {
    await page.goto(SCANNER_URL);
    await expect(
      page.getByRole("heading", { name: scannerHeading }),
    ).toBeVisible();

    const hasController = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are unavailable");
      }

      await navigator.serviceWorker.ready;
      return navigator.serviceWorker.controller !== null;
    });

    if (!hasController) {
      await page.reload();
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
    }

    await page.context().setOffline(true);
    try {
      await page.goto(SCANNER_URL);
      await expect(
        page.getByRole("heading", { name: scannerHeading }),
      ).toBeVisible();

      await page.goto(`${SCANNER_URL}/scan`);
      await expect(
        page.getByRole("heading", { name: scannerHeading }),
      ).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
  });
});

test.describe("Scanner — Camera scan page", () => {
  test("scan page shows camera error state when permission is denied", async ({
    page,
  }) => {
    // Mock getUserMedia to immediately reject with NotAllowedError,
    // simulating camera permission denial before the page loads its own scripts.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        get: () => ({
          getUserMedia: () =>
            Promise.reject(
              new DOMException("Permission denied", "NotAllowedError"),
            ),
        }),
        configurable: true,
      });
    });

    await page.goto(`${SCANNER_URL}/scan`);
    await expect(
      page.getByText("Camera access blocked"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("camera permission denial shows re-enable instructions", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        get: () => ({
          getUserMedia: () =>
            Promise.reject(
              new DOMException("Permission denied", "NotAllowedError"),
            ),
        }),
        configurable: true,
      });
    });

    await page.goto(`${SCANNER_URL}/scan`);
    await expect(
      page.getByText("Camera access blocked"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/How to re-enable camera access/i),
    ).toBeVisible();
    // Instructions cover iOS Safari, Android Chrome, and Desktop
    await expect(page.getByText(/iOS Safari/i)).toBeVisible();
    await expect(page.getByText(/Android Chrome/i)).toBeVisible();
    await expect(page.getByText(/Desktop/i)).toBeVisible();
  });

  test("camera error state shows Retry and Go back buttons", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        get: () => ({
          getUserMedia: () =>
            Promise.reject(
              new DOMException("Permission denied", "NotAllowedError"),
            ),
        }),
        configurable: true,
      });
    });

    await page.goto(`${SCANNER_URL}/scan`);
    await expect(
      page.getByText("Camera access blocked"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
  });
});
