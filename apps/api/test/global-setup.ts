/**
 * Vitest global setup for API tests.
 *
 * Ensures all tests run against the galileo_test database, never galileo_dev.
 * – Sets DATABASE_URL to galileo_test before any test imports.
 * – Pushes the Prisma schema to galileo_test so tables exist.
 * – Truncates all application tables after the test run via the returned
 *   teardown function.
 */

import { execSync } from "node:child_process";
import path from "node:path";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  `postgresql://${process.env.USER ?? "postgres"}@localhost:5432/galileo_test`;

export default async function globalSetup() {
  // 1. Point every subsequent import at the test database
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.NODE_ENV = "test";

  // 2. Push the Prisma schema so galileo_test has up-to-date tables
  //    Prisma 7 uses --url to override the datasource URL from prisma.config.ts
  const apiRoot = path.resolve(import.meta.dirname, "..");
  execSync(
    `pnpm prisma db push --url "${TEST_DATABASE_URL}" --accept-data-loss`,
    {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    },
  );

  // 3. Return a teardown that truncates all application tables after all tests
  return async () => {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query(`
        TRUNCATE TABLE "AuditLog", "ProductEvent", "ProductPassport", "Product", "User", "Brand"
        CASCADE
      `);
    } finally {
      await client.end();
    }
  };
}
