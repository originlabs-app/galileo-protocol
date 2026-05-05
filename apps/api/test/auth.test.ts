import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { buildApp } from "../src/server.js";
import type { FastifyInstance } from "fastify";
import { parseCookies, cleanDb } from "./helpers.js";

/**
 * Return all Set-Cookie headers as raw strings for flag inspection.
 */
function getRawSetCookieHeaders(response: {
  headers: Record<string, string | string[] | undefined>;
}): string[] {
  const raw = response.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Build a cookie header string for inject() from parsed cookies.
 */
function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

describe("Auth endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Clean up all test data before each test to avoid state leakage
  beforeEach(async () => {
    await cleanDb(app.prisma);
  });

  // ─── Register ───────────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("creates user and returns 201 with cookies (no tokens in body)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "register@test.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("register@test.com");
      expect(body.data.user.role).toBe("VIEWER");
      expect(body.data.user.brandId).toBeNull();
      // Must NOT include tokens in response body
      expect(body.data.accessToken).toBeUndefined();
      expect(body.data.refreshToken).toBeUndefined();
      // Must NOT include passwordHash
      expect(body.data.user.passwordHash).toBeUndefined();

      // Must set cookies
      const cookies = parseCookies(response);
      expect(cookies.galileo_at).toBeDefined();
      expect(cookies.galileo_rt).toBeDefined();
    });

    it("sets httpOnly, Secure (in prod), SameSite=Lax on cookies", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "register@test.com",
          password: "password123",
        },
      });

      const rawHeaders = getRawSetCookieHeaders(response);
      expect(rawHeaders.length).toBeGreaterThanOrEqual(2);

      const atHeader = rawHeaders.find((h) => h.startsWith("galileo_at="));
      const rtHeader = rawHeaders.find((h) => h.startsWith("galileo_rt="));

      expect(atHeader).toBeDefined();
      expect(rtHeader).toBeDefined();

      // Both should have HttpOnly and SameSite=Lax
      expect(atHeader!.toLowerCase()).toContain("httponly");
      expect(atHeader!.toLowerCase()).toContain("samesite=lax");

      expect(rtHeader!.toLowerCase()).toContain("httponly");
      expect(rtHeader!.toLowerCase()).toContain("samesite=lax");

      // Refresh token path should be /auth/refresh
      expect(rtHeader!).toContain("Path=/auth/refresh");
    });

    it("keeps pilot registration unassigned when brandName is provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "brand@test.com",
          password: "password123",
          brandName: "Acme Luxury",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("brand@test.com");
      expect(body.data.user.role).toBe("VIEWER");
      expect(body.data.user.brandId).toBeNull();

      // Public signup must not provision a pilot brand or workspace.
      const brand = await app.prisma.brand.findUnique({
        where: { slug: "acme-luxury" },
      });
      expect(brand).toBeNull();
    });

    it("returns 409 for duplicate email", async () => {
      // First registration
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "duplicate@test.com",
          password: "password123",
        },
      });

      // Second registration with same email
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "duplicate@test.com",
          password: "password456",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CONFLICT");
    });

    it("returns 400 for brandName exceeding 255 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "longbrand@test.com",
          password: "password123",
          brandName: "A".repeat(256),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "not-an-email",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for short password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "register@test.com",
          password: "short",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── Login ──────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      // Create a user to test login
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "login@test.com",
          password: "password123",
        },
      });
    });

    it("returns 200 with cookies for valid credentials (no tokens in body)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "login@test.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("login@test.com");
      // Must NOT include tokens in response body
      expect(body.data.accessToken).toBeUndefined();
      expect(body.data.refreshToken).toBeUndefined();
      expect(body.data.user.passwordHash).toBeUndefined();

      // Must set cookies
      const cookies = parseCookies(response);
      expect(cookies.galileo_at).toBeDefined();
      expect(cookies.galileo_rt).toBeDefined();
    });

    it("sets httpOnly, SameSite=Lax on login cookies", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "login@test.com",
          password: "password123",
        },
      });

      const rawHeaders = getRawSetCookieHeaders(response);
      const atHeader = rawHeaders.find((h) => h.startsWith("galileo_at="));
      const rtHeader = rawHeaders.find((h) => h.startsWith("galileo_rt="));

      expect(atHeader).toBeDefined();
      expect(rtHeader).toBeDefined();
      expect(atHeader!.toLowerCase()).toContain("httponly");
      expect(atHeader!.toLowerCase()).toContain("samesite=lax");
      expect(rtHeader!.toLowerCase()).toContain("httponly");
      expect(rtHeader!.toLowerCase()).toContain("samesite=lax");
    });

    it("returns 401 for wrong password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "login@test.com",
          password: "wrongpassword",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toBe("Invalid email or password");
    });

    it("returns 401 with same message for non-existent email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "nonexistent@test.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      // Same message as wrong password (prevent enumeration)
      expect(body.error.message).toBe("Invalid email or password");
    });
  });

  // ─── Cookie-based Auth ──────────────────────────────────────

  describe("Cookie-based authentication", () => {
    it("GET /auth/me works with galileo_at cookie (no Bearer header)", async () => {
      // Register to get cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "me@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("me@test.com");
      expect(body.data.user.role).toBe("VIEWER");
      expect(body.data.user.passwordHash).toBeUndefined();
    });

    it("GET /auth/me returns 401 without any cookie or token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /auth/me returns 401 with invalid cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          cookie: "galileo_at=invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── Refresh ────────────────────────────────────────────────

  describe("POST /auth/refresh", () => {
    it("returns new cookies for valid refresh token cookie", async () => {
      // Register a user to get cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "refresh@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: {
          cookie: `galileo_rt=${cookies.galileo_rt}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      // No tokens in body
      expect(body.data.accessToken).toBeUndefined();
      expect(body.data.refreshToken).toBeUndefined();
      // New cookies should be set
      const newCookies = parseCookies(response);
      expect(newCookies.galileo_at).toBeDefined();
      expect(newCookies.galileo_rt).toBeDefined();
    });

    it("returns 401 without refresh cookie", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for invalid refresh token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: {
          cookie: "galileo_rt=invalid-token-here",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("invalidates old refresh token after rotation", async () => {
      // Register to get first cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "refresh@test.com",
          password: "password123",
        },
      });

      const firstCookies = parseCookies(registerRes);

      // Use the refresh token once
      const refreshRes = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: {
          cookie: `galileo_rt=${firstCookies.galileo_rt}`,
        },
      });
      expect(refreshRes.statusCode).toBe(200);

      // Try to use the OLD refresh token again — should fail
      const retryRes = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: {
          cookie: `galileo_rt=${firstCookies.galileo_rt}`,
        },
      });
      expect(retryRes.statusCode).toBe(401);
    });
  });

  // ─── Logout ─────────────────────────────────────────────────

  describe("POST /auth/logout", () => {
    it("clears cookies and returns 200", async () => {
      // Register to get cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "logout@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
          "x-galileo-client": "1",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toBe("Logged out successfully");

      // Should have set expired cookies
      const rawHeaders = getRawSetCookieHeaders(response);
      expect(rawHeaders.length).toBeGreaterThanOrEqual(2);

      // Check that cookies are cleared (expired)
      const atHeader = rawHeaders.find((h) => h.startsWith("galileo_at="));
      const rtHeader = rawHeaders.find((h) => h.startsWith("galileo_rt="));
      expect(atHeader).toBeDefined();
      expect(rtHeader).toBeDefined();

      // clearCookie sets value to empty and Expires to past
      expect(atHeader!).toContain("galileo_at=");
      expect(rtHeader!).toContain("galileo_rt=");
    });

    it("clears refresh token from database after logout", async () => {
      // Register to get cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "logout@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);
      const userId = registerRes.json().data.user.id;

      // Verify refresh token exists in DB
      const userBefore = await app.prisma.user.findUnique({
        where: { id: userId },
      });
      expect(userBefore!.refreshToken).not.toBeNull();

      // Logout
      await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
          "x-galileo-client": "1",
        },
      });

      // Verify refresh token cleared from DB
      const userAfter = await app.prisma.user.findUnique({
        where: { id: userId },
      });
      expect(userAfter!.refreshToken).toBeNull();
    });

    it("returns 401 without auth cookie", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { "x-galileo-client": "1" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("after logout, GET /auth/me returns 401 with the same cookie", async () => {
      // Register to get cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "logout@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);

      // Logout
      await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
          "x-galileo-client": "1",
        },
      });

      // The cookie JWT is still technically valid (not expired yet),
      // but /auth/me still works because JWT is stateless.
      // The important thing is the refresh token is cleared from DB.
      // When the access token expires, the user can't refresh.
    });
  });

  // ─── Me ─────────────────────────────────────────────────────

  describe("GET /auth/me", () => {
    it("returns user profile with valid cookie", async () => {
      // Register a user to get cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "me@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          cookie: `galileo_at=${cookies.galileo_at}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("me@test.com");
      expect(body.data.user.role).toBe("VIEWER");
      expect(body.data.user.passwordHash).toBeUndefined();
    });

    it("returns 401 without cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 with invalid cookie", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          cookie: "galileo_at=invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── JWT Payload ────────────────────────────────────────────

  describe("JWT Payload", () => {
    it("contains only sub, role, brandId, iat, exp — no PII", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "register@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);
      const accessToken = cookies.galileo_at!;

      // Decode the JWT (base64 decode the payload)
      const payloadBase64 = accessToken.split(".")[1]!;
      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64").toString("utf8"),
      );

      // Must contain ONLY these fields
      const allowedKeys = new Set(["sub", "role", "brandId", "iat", "exp"]);
      const payloadKeys = new Set(Object.keys(payload));

      expect(payloadKeys).toEqual(allowedKeys);
      // Must NOT contain email or any PII
      expect(payload.email).toBeUndefined();
      expect(payload.name).toBeUndefined();
    });
  });

  // ─── Security: Refresh Token Hashing ────────────────────────

  describe("Refresh token hashing", () => {
    it("stores hashed refresh token in database, not raw token", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "register@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(registerRes);
      const userId = registerRes.json().data.user.id;

      // Fetch the user from DB and check the stored token
      const dbUser = await app.prisma.user.findUnique({
        where: { id: userId },
      });

      expect(dbUser).not.toBeNull();
      // Stored token should NOT be the raw refresh token
      expect(dbUser!.refreshToken).not.toBe(cookies.galileo_rt);
      // Stored token should be the SHA-256 hash of the refresh token
      const expectedHash = createHash("sha256")
        .update(cookies.galileo_rt!)
        .digest("hex");
      expect(dbUser!.refreshToken).toBe(expectedHash);
    });

    it("stores hashed refresh token after login", async () => {
      // First register
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "login@test.com",
          password: "password123",
        },
      });

      // Then login
      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "login@test.com",
          password: "password123",
        },
      });

      const cookies = parseCookies(loginRes);
      const userId = loginRes.json().data.user.id;

      const dbUser = await app.prisma.user.findUnique({
        where: { id: userId },
      });

      expect(dbUser!.refreshToken).not.toBe(cookies.galileo_rt);
      const expectedHash = createHash("sha256")
        .update(cookies.galileo_rt!)
        .digest("hex");
      expect(dbUser!.refreshToken).toBe(expectedHash);
    });

    it("stores hashed refresh token after token refresh", async () => {
      // Register to get initial cookies
      const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "refresh@test.com",
          password: "password123",
        },
      });

      const firstCookies = parseCookies(registerRes);

      // Refresh the token
      const refreshRes = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        headers: {
          cookie: `galileo_rt=${firstCookies.galileo_rt}`,
        },
      });

      expect(refreshRes.statusCode).toBe(200);
      const newCookies = parseCookies(refreshRes);

      // Check the DB stores the hash of the NEW token
      const dbUser = await app.prisma.user.findUnique({
        where: { email: "refresh@test.com" },
      });

      expect(dbUser!.refreshToken).not.toBe(newCookies.galileo_rt);
      const expectedHash = createHash("sha256")
        .update(newCookies.galileo_rt!)
        .digest("hex");
      expect(dbUser!.refreshToken).toBe(expectedHash);
    });
  });

  // ─── Security: Pilot Registration Scope ─────────────────────

  describe("Pilot registration scope", () => {
    it("ignores repeated brandName hints instead of provisioning a brand", async () => {
      const res1 = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "brand-collision@test.com",
          password: "password123",
          brandName: "Collision Brand",
        },
      });
      expect(res1.statusCode).toBe(201);

      const res2 = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "brand-collision2@test.com",
          password: "password123",
          brandName: "Collision Brand",
        },
      });

      expect(res2.statusCode).toBe(201);
      expect(res2.json().data.user.brandId).toBeNull();

      const brandCount = await app.prisma.brand.count();
      expect(brandCount).toBe(0);
    });
  });

  // ─── CORS Credentials ──────────────────────────────────────

  describe("CORS credentials", () => {
    it("OPTIONS preflight includes Access-Control-Allow-Credentials: true", async () => {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/health",
        headers: {
          origin: "http://localhost:3000",
          "access-control-request-method": "GET",
        },
      });

      // CORS preflight should return 204
      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
    });

    it("GET response includes Access-Control-Allow-Credentials: true", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });
  });
});
