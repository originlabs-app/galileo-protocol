import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { readProductPassportAuthoringMetadata } from "@galileo/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/galileo_dev";

const DEMO_BRAND = {
  name: "Maison Aurum",
  slug: "maison-aurum-demo",
  did: "did:galileo:brand:maison-aurum-demo",
};

const DEMO_OPERATOR_EMAIL =
  process.env.DEMO_OPERATOR_EMAIL ?? "operator@maison-aurum.example";

const EXPECTED_PRODUCTS = [
  {
    gtin: "3760401230013",
    serialNumber: "AUR-WATCH-001",
    name: "Aurum Chronographe Abyssal",
    category: "Watches",
  },
  {
    gtin: "3760401230020",
    serialNumber: "AUR-BAG-018",
    name: "Aurum Sac Meridian",
    category: "Leather Goods",
  },
  {
    gtin: "3760401230037",
    serialNumber: "AUR-RING-104",
    name: "Aurum Bague Celeste",
    category: "Jewelry",
  },
  {
    gtin: "3760401230044",
    serialNumber: "AUR-SCENT-07",
    name: "Aurum Nuit Marine",
    category: "Fragrances",
  },
  {
    gtin: "3760401230051",
    serialNumber: "AUR-EYE-221",
    name: "Aurum Lunettes Horizon",
    category: "Eyewear",
  },
];

function fail(message: string) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const brand = await prisma.brand.findUnique({
      where: { slug: DEMO_BRAND.slug },
    });

    if (!brand) {
      fail(`brand ${DEMO_BRAND.slug} is missing.`);
      return;
    }

    if (brand.name !== DEMO_BRAND.name) {
      fail(`brand name expected ${DEMO_BRAND.name}, got ${brand.name}.`);
    }

    if (brand.did !== DEMO_BRAND.did) {
      fail(`brand DID expected ${DEMO_BRAND.did}, got ${brand.did}.`);
    }

    const operator = await prisma.user.findUnique({
      where: { email: DEMO_OPERATOR_EMAIL },
    });

    if (!operator) {
      fail(`demo operator ${DEMO_OPERATOR_EMAIL} is missing.`);
    } else {
      if (operator.role !== "BRAND_ADMIN") {
        fail(`demo operator role expected BRAND_ADMIN, got ${operator.role}.`);
      }

      if (operator.brandId !== brand.id) {
        fail("demo operator is not scoped to Maison Aurum.");
      }
    }

    const products = await prisma.product.findMany({
      where: { brandId: brand.id },
      include: { passport: true },
      orderBy: { gtin: "asc" },
    });

    const expectedKeys = new Set(
      EXPECTED_PRODUCTS.map(
        (product) => `${product.gtin}:${product.serialNumber}`,
      ),
    );
    const demoProducts = products.filter((product) =>
      expectedKeys.has(`${product.gtin}:${product.serialNumber}`),
    );

    if (demoProducts.length !== EXPECTED_PRODUCTS.length) {
      fail(
        `expected ${EXPECTED_PRODUCTS.length} demo products, found ${demoProducts.length}.`,
      );
    }

    for (const expected of EXPECTED_PRODUCTS) {
      const product = demoProducts.find(
        (candidate) =>
          candidate.gtin === expected.gtin &&
          candidate.serialNumber === expected.serialNumber,
      );

      if (!product) {
        fail(`${expected.name} is missing.`);
        continue;
      }

      if (product.name !== expected.name) {
        fail(`${expected.gtin} name expected ${expected.name}, got ${product.name}.`);
      }

      if (product.category !== expected.category) {
        fail(
          `${expected.name} category expected ${expected.category}, got ${product.category}.`,
        );
      }

      if (product.status !== "DRAFT") {
        fail(`${expected.name} should remain DRAFT for live mint demos.`);
      }

      if (!isNonEmptyString(product.description)) {
        fail(`${expected.name} is missing description.`);
      }

      if (!isNonEmptyString(product.imageUrl)) {
        fail(`${expected.name} is missing primary imageUrl.`);
      }

      if (!product.passport) {
        fail(`${expected.name} is missing product passport.`);
        continue;
      }

      if (!isNonEmptyString(product.passport.digitalLink)) {
        fail(`${expected.name} is missing GS1 Digital Link.`);
      }

      const authoringMetadata = readProductPassportAuthoringMetadata(
        product.passport.metadata,
      );

      if (authoringMetadata.materials.length === 0) {
        fail(`${expected.name} is missing materials metadata.`);
      }

      const primaryImage = authoringMetadata.media.find(
        (media) => media.kind === "image" && media.position === 0,
      );

      if (!primaryImage) {
        fail(`${expected.name} is missing primary image media metadata.`);
      } else if (primaryImage.url !== product.imageUrl) {
        fail(`${expected.name} imageUrl does not match primary media URL.`);
      }
    }

    console.log(
      JSON.stringify(
        {
          success: process.exitCode !== 1,
          brand: {
            name: brand.name,
            slug: brand.slug,
            did: brand.did,
          },
          operator: {
            email: DEMO_OPERATOR_EMAIL,
            role: operator?.role ?? null,
          },
          products: {
            expected: EXPECTED_PRODUCTS.length,
            found: demoProducts.length,
            categories: EXPECTED_PRODUCTS.map((product) => product.category),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Demo dataset check failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
