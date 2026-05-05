import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:4000";

// The `request` fixture creates a fresh APIRequestContext without any cookies/storage,
// so all these tests are effectively unauthenticated regardless of storageState.

test.describe("API — Health endpoint", () => {
  test("GET /health returns 200", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
  });

  test("GET /health includes status, version and uptime fields", async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/health`);
    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });

  test("GET /health dependencies reports database, storage and chain", async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/health`);
    const body = await res.json();
    expect(body).toHaveProperty("dependencies");
    expect(["ok", "error"]).toContain(body.dependencies.database);
    expect(["ok", "local", "error"]).toContain(body.dependencies.storage);
    expect(["ok", "disabled", "error"]).toContain(body.dependencies.chain);
  });
});

test.describe("API — Resolver endpoint", () => {
  test("invalid GTIN check digit returns 400 VALIDATION_ERROR", async ({
    request,
  }) => {
    // 00012345678906 has wrong check digit (correct is 5, not 6)
    const res = await request.get(
      `${API_URL}/01/00012345678906/21/SN-HEALTH-TEST-001`,
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("valid GTIN but non-existent product returns 404 NOT_FOUND", async ({
    request,
  }) => {
    // 00012345678905 is a valid GTIN (check digit = 5)
    const res = await request.get(
      `${API_URL}/01/00012345678905/21/NONEXISTENT-SERIAL-ZZZZZ`,
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  test("GTIN shorter than 8 digits returns 400", async ({ request }) => {
    // 5-digit GTIN — below the minimum of 8 digits
    const res = await request.get(`${API_URL}/01/12345/21/SN001`);
    expect(res.status()).toBe(400);
  });

  test("resolver error response body is valid JSON with error code", async ({
    request,
  }) => {
    const res = await request.get(
      `${API_URL}/01/00012345678905/21/NONEXISTENT-JSON-TEST`,
    );
    const body = await res.json();
    expect(body).toHaveProperty("success", false);
    expect(body).toHaveProperty("error");
    expect(typeof body.error.code).toBe("string");
    expect(typeof body.error.message).toBe("string");
  });
});

test.describe("API — Authentication guard", () => {
  test("GET /auth/me without session returns 401", async () => {
    const res = await fetch(`${API_URL}/auth/me`);
    expect(res.status).toBe(401);
  });

  test("GET /products without session returns 401", async () => {
    const res = await fetch(`${API_URL}/products`);
    expect(res.status).toBe(401);
  });

  test("POST /products without auth returns 401", async () => {
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Client": "e2e-test",
      },
      body: JSON.stringify({
        name: "Unauthorized test product",
        gtin: "00012345678905",
        serialNumber: "UNAUTH-TEST-001",
        category: "Watches",
      }),
    });
    // Without auth cookie, the API must reject with 401 (or 403 for CSRF issues)
    expect([401, 403]).toContain(res.status);
  });
});
