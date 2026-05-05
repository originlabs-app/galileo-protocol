import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "../src/utils/password.js";

// Determine admin seed password from environment
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (process.env.NODE_ENV === "production" && !SEED_ADMIN_PASSWORD) {
  console.error(
    "❌ SEED_ADMIN_PASSWORD environment variable is required when NODE_ENV=production. " +
      "Set SEED_ADMIN_PASSWORD to the desired admin password.",
  );
  process.exit(1);
}

const adminPassword = SEED_ADMIN_PASSWORD || "dev-seed-password-change-me";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/galileo_dev";

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // Create test brand
    const brand = await prisma.brand.upsert({
      where: { slug: "galileo-luxe" },
      update: {},
      create: {
        name: "Galileo Luxe",
        slug: "galileo-luxe",
        did: "did:galileo:brand:galileo-luxe",
      },
    });

    console.log(`Brand created: ${brand.id}`);

    // Create test admin user
    const passwordHash = await hashPassword(adminPassword);

    const admin = await prisma.user.upsert({
      where: { email: "admin@galileo.test" },
      update: { role: "ADMIN", passwordHash },
      create: {
        email: "admin@galileo.test",
        passwordHash,
        role: "ADMIN",
        brandId: brand.id,
      },
    });

    console.log(`Admin user created: ${admin.id}`);

    console.log("Seed completed successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
