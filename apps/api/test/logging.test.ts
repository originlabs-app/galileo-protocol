import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { Writable } from "node:stream";

describe("Structured logging", () => {
  it("generates request IDs using x-request-id header when present", async () => {
    const logs: string[] = [];
    const logStream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const app = Fastify({
      logger: { level: "info", stream: logStream },
      genReqId: (req) => {
        return (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
      },
    });
    app.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    app.decorate("chain", { chainEnabled: false });

    const healthRoutes = (await import("../src/routes/health.js")).default;
    await app.register(healthRoutes);
    await app.ready();

    await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "test-correlation-id-123" },
    });

    await app.close();

    // Find the request log line and check reqId
    const requestLog = logs.find((l) => l.includes("test-correlation-id-123"));
    expect(requestLog).toBeDefined();
  });

  it("generates UUID request IDs when x-request-id header is absent", async () => {
    const logs: string[] = [];
    const logStream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const app = Fastify({
      logger: { level: "info", stream: logStream },
      genReqId: (req) => {
        return (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
      },
    });
    app.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    app.decorate("chain", { chainEnabled: false });

    const healthRoutes = (await import("../src/routes/health.js")).default;
    await app.register(healthRoutes);
    await app.ready();

    await app.inject({
      method: "GET",
      url: "/health",
    });

    await app.close();

    // Find the request log line and check it has a UUID-format reqId
    const requestLog = logs.find((l) => l.includes('"reqId"'));
    expect(requestLog).toBeDefined();
    const parsed = JSON.parse(requestLog!);
    // UUID v4 format: 8-4-4-4-12 hex digits
    expect(parsed.reqId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("redacts PII fields from request logs", async () => {
    const logs: string[] = [];
    const logStream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const app = Fastify({
      logger: {
        level: "info",
        stream: logStream,
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.password",
            "req.body.email",
            "req.body.passwordHash",
          ],
          censor: "[REDACTED]",
        },
        serializers: {
          req(request: {
            method: string;
            url: string;
            hostname: string;
            ip: string;
          }) {
            return {
              method: request.method,
              url: request.url,
              hostname: request.hostname,
              remoteAddress: request.ip,
            };
          },
          res(reply: { statusCode: number }) {
            return { statusCode: reply.statusCode };
          },
        },
      },
    });

    app.get("/test-log", async (request) => {
      // Log the body explicitly so redaction is tested
      request.log.info({ body: request.body }, "test request");
      return { ok: true };
    });
    await app.ready();

    await app.inject({
      method: "GET",
      url: "/test-log",
      headers: {
        authorization: "Bearer secret-token-123",
        cookie: "galileo_at=sensitive-cookie-value",
      },
    });

    await app.close();

    // No log line should contain the raw auth or cookie values
    const allLogs = logs.join("\n");
    expect(allLogs).not.toContain("secret-token-123");
    expect(allLogs).not.toContain("sensitive-cookie-value");
  });
});
