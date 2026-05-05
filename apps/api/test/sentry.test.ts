import { describe, it, expect } from "vitest";
import Fastify from "fastify";

describe("Sentry plugin", () => {
  it("decorates fastify with sentry: null when no DSN configured", async () => {
    const app = Fastify();
    const { default: sentryPlugin } = await import("../src/plugins/sentry.js");
    await app.register(sentryPlugin);
    await app.ready();

    expect(app.sentry).toBeNull();

    await app.close();
  });

  it("does not throw when sentry is null and an error occurs", async () => {
    const app = Fastify();
    const { default: sentryPlugin } = await import("../src/plugins/sentry.js");
    await app.register(sentryPlugin);

    // Add a route that throws
    app.get("/error-test", async () => {
      throw new Error("Test error");
    });

    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/error-test",
    });

    // Fastify returns 500 for unhandled errors
    expect(response.statusCode).toBe(500);

    await app.close();
  });

  it("sentry decorator is accessible on the fastify instance", async () => {
    const app = Fastify();
    const { default: sentryPlugin } = await import("../src/plugins/sentry.js");
    await app.register(sentryPlugin);
    await app.ready();

    // Without DSN, sentry should be null but the decorator should exist
    expect(app.hasDecorator("sentry")).toBe(true);

    await app.close();
  });
});
