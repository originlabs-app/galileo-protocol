import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import { privateKeyToAccount } from "viem/accounts";

const SIWE_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const siweAccount = privateKeyToAccount(SIWE_PRIVATE_KEY);
const API_URL = "http://localhost:4000";
const SEEDED_ADMIN_EMAIL = "admin@galileo.test";

test.use({ storageState: { cookies: [], origins: [] } });

function readAuthCookie() {
  const storageState = JSON.parse(
    fs.readFileSync("playwright/.auth/user.json", "utf8"),
  ) as { cookies: Array<{ name: string; value: string }> };

  return storageState.cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function linkSiweWallet(request: APIRequestContext) {
  const authHeaders = { Cookie: readAuthCookie() };

  const nonceResponse = await request.get(`${API_URL}/auth/nonce`, {
    headers: authHeaders,
  });
  expect(nonceResponse.status(), await nonceResponse.text()).toBe(200);

  const nonceBody = (await nonceResponse.json()) as {
    data: { nonce: string };
  };
  const timestamp = Date.now();
  const message = [
    `Link wallet to Galileo: ${SEEDED_ADMIN_EMAIL}`,
    `Nonce: ${nonceBody.data.nonce}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
  const signature = await siweAccount.signMessage({ message });

  const linkResponse = await request.post(`${API_URL}/auth/link-wallet`, {
    data: {
      address: siweAccount.address,
      signature,
      message,
    },
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
      "X-Galileo-Client": "test",
    },
  });
  expect(linkResponse.status(), await linkResponse.text()).toBe(200);
}

test.describe("SIWE Wallet Login", () => {
  test("linked-wallet SIWE lands on the setup-check screen", async ({
    page,
    request,
  }) => {
    await linkSiweWallet(request);

    await page.exposeFunction("galileoSignSiweMessage", async (message: string) =>
      siweAccount.signMessage({ message }),
    );

    await page.addInitScript((address) => {
      window.__GALILEO_E2E_SIWE__ = {
        connect: async () => address,
        signMessage: async (message: string) =>
          window.galileoSignSiweMessage(message),
      };
    }, siweAccount.address);

    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Sign in with Wallet" }),
    ).toBeVisible();

    const setupUrl = page.waitForURL(/\/dashboard\/setup$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Sign in with Wallet" }).click();
    await setupUrl;

    await expect(page).toHaveURL(/\/dashboard\/setup$/);
    await expect(
      page.getByRole("heading", { name: "Workspace readiness" }),
    ).toBeVisible();
    await expect(page.getByText("Workspace ready").first()).toBeVisible();
    await expect(page.getByText("Galileo Luxe").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open dashboard" }),
    ).toBeVisible();
  });
});
