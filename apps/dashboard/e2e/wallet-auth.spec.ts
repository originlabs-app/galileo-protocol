import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:4000";

test.describe("Wallet Auth Flows (API)", () => {
  test("GET /auth/siwe/nonce returns a valid nonce", async ({ request }) => {
    const res = await request.get(`${API_URL}/auth/siwe/nonce`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.nonce).toBe("string");
    expect(body.data.nonce.length).toBeGreaterThan(0);
  });

  test("POST /auth/siwe/verify rejects empty body (400)", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/auth/siwe/verify`, {
      data: { message: "", signature: "" },
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Client": "dashboard",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /auth/siwe/verify rejects invalid nonce (401)", async ({
    request,
  }) => {
    const message = [
      "localhost wants you to sign in with your Ethereum account:",
      "0x1234567890123456789012345678901234567890",
      "",
      "Sign in to Galileo Protocol",
      "",
      "URI: http://localhost:3000",
      "Version: 1",
      "Chain ID: 84532",
      "Nonce: fake-nonce-does-not-exist",
      `Issued At: ${new Date().toISOString()}`,
    ].join("\n");

    const res = await request.post(`${API_URL}/auth/siwe/verify`, {
      data: { message, signature: "0xfakesig" },
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Client": "dashboard",
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_NONCE");
  });

  test("SIWE nonce is consumed after first use (replay rejected)", async ({
    request,
  }) => {
    // Get a nonce
    const nonceRes = await request.get(`${API_URL}/auth/siwe/nonce`);
    const nonce = (await nonceRes.json()).data.nonce;

    const message = [
      "localhost wants you to sign in with your Ethereum account:",
      "0x1234567890123456789012345678901234567890",
      "",
      "Sign in to Galileo Protocol",
      "",
      "URI: http://localhost:3000",
      "Version: 1",
      "Chain ID: 84532",
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join("\n");

    // First attempt - nonce consumed (will fail at signature step, but nonce is consumed)
    const res1 = await request.post(`${API_URL}/auth/siwe/verify`, {
      data: { message, signature: "0xfakesig" },
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Client": "dashboard",
      },
    });
    // First attempt either 401 (invalid sig) or some other error - but nonce consumed
    const status1 = res1.status();
    expect([401, 404]).toContain(status1);

    // Second attempt with same nonce - should be rejected as INVALID_NONCE
    const res2 = await request.post(`${API_URL}/auth/siwe/verify`, {
      data: { message, signature: "0xfakesig" },
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Client": "dashboard",
      },
    });
    expect(res2.status()).toBe(401);
    const body2 = await res2.json();
    expect(body2.error.code).toBe("INVALID_NONCE");
  });

  test("GET /auth/nonce requires authentication (401)", async () => {
    const res = await fetch(`${API_URL}/auth/nonce`);
    expect(res.status).toBe(401);
  });

  test("POST /auth/link-wallet requires authentication (401)", async () => {
    const res = await fetch(`${API_URL}/auth/link-wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Client": "dashboard",
      },
      body: JSON.stringify({
        address: "0x1234567890123456789012345678901234567890",
        signature: "0xfakesig",
        message: "test",
      }),
    });
    expect(res.status).toBe(401);
  });
});
