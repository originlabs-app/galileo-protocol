/**
 * Parse Set-Cookie headers and return a map of cookie name → value.
 */
export function parseCookies(response: {
  headers: Record<string, string | string[] | undefined>;
}): Record<string, string> {
  const raw = response.headers["set-cookie"];
  if (!raw) return {};
  const arr = Array.isArray(raw) ? raw : [raw];
  const result: Record<string, string> = {};
  for (const header of arr) {
    const [pair] = header.split(";");
    const [name, ...rest] = pair!.split("=");
    result[name!.trim()] = rest.join("=").trim();
  }
  return result;
}

/**
 * Truncate all application tables using raw SQL.
 *
 * Replaces cascading deleteMany chains that caused lock contention and
 * flaky timeouts. A single TRUNCATE ... CASCADE statement releases locks
 * faster than 5 sequential Prisma deleteMany calls.
 */
export async function cleanDb(prisma: {
  $executeRawUnsafe: (query: string) => Promise<number>;
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "AuditLog", "ProductEvent", "ProductPassport", "Product", "User", "Brand" CASCADE`,
  );
}

let fixtureSequence = 0;

export function nextFixtureId(scope: string): string {
  fixtureSequence += 1;
  return `${scope}-${String(fixtureSequence).padStart(4, "0")}`;
}
