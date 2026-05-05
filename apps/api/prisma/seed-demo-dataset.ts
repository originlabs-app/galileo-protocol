import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  generateDid,
  generateDigitalLinkUrl,
  writeProductPassportAuthoringMetadata,
  type ProductMaterial,
  type ProductMediaDescriptor,
} from "@galileo/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Prisma } from "../src/generated/prisma/client.js";
import { hashPassword } from "../src/utils/password.js";

type DemoProduct = {
  gtin: string;
  serialNumber: string;
  name: string;
  description: string;
  category: string;
  materials: ProductMaterial[];
  media?: ProductMediaDescriptor[];
  story: string;
};

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/galileo_dev";
const DEMO_ASSET_BASE_URL = (
  process.env.DEMO_ASSET_BASE_URL ??
  process.env.API_URL ??
  "http://localhost:4000"
).replace(/\/+$/, "");

function demoAssetUrl(fileName: string) {
  return `${DEMO_ASSET_BASE_URL}/demo-assets/${fileName}`;
}

const DEMO_BRAND = {
  name: "Maison Aurum",
  slug: "maison-aurum-demo",
  did: "did:galileo:brand:maison-aurum-demo",
  cpoEmail: "cpo@maison-aurum.example",
};

const DEMO_OPERATOR_EMAIL =
  process.env.DEMO_OPERATOR_EMAIL ?? "operator@maison-aurum.example";
const DEMO_OPERATOR_PASSWORD =
  process.env.DEMO_OPERATOR_PASSWORD ?? "demo-operator-password-change-me";

const demoProducts: DemoProduct[] = [
  {
    gtin: "3760401230013",
    serialNumber: "AUR-WATCH-001",
    name: "Aurum Chronographe Abyssal",
    description:
      "Limited mechanical chronograph with a black enamel dial, platinum bezel, and service-ready digital product passport.",
    category: "Watches",
    materials: [
      { name: "Recycled platinum", percentage: 62 },
      { name: "Sapphire crystal", percentage: 18 },
      { name: "Black enamel", percentage: 12 },
      { name: "Alligator-free technical strap", percentage: 8 },
    ],
    media: [
      {
        kind: "image",
        url: demoAssetUrl("aurum-chronographe-abyssal.svg"),
        alt: "Aurum Chronographe Abyssal on a dark ocean-inspired surface",
        position: 0,
      },
    ],
    story:
      "Flagship investor demo product: provenance starts at atelier assembly and continues through servicing, resale, and scanner verification.",
  },
  {
    gtin: "3760401230020",
    serialNumber: "AUR-BAG-018",
    name: "Aurum Sac Meridian",
    description:
      "Structured top-handle handbag in traceable calf leather with gold-plated hardware and NFC-ready passport workflow.",
    category: "Leather Goods",
    materials: [
      { name: "Traceable calf leather", percentage: 78 },
      { name: "Recycled cotton lining", percentage: 14 },
      { name: "Gold-plated brass", percentage: 8 },
    ],
    media: [
      {
        kind: "image",
        url: demoAssetUrl("aurum-sac-meridian.svg"),
        alt: "Aurum Sac Meridian leather handbag with gold hardware",
        position: 0,
      },
    ],
    story:
      "Demonstrates how high-value leather goods can expose immutable identity while keeping editorial brand storytelling in the passport layer.",
  },
  {
    gtin: "3760401230037",
    serialNumber: "AUR-RING-104",
    name: "Aurum Bague Celeste",
    description:
      "White-gold ring set with lab-grown diamonds and an auditable certificate trail for secondary-market trust.",
    category: "Jewelry",
    materials: [
      { name: "Recycled white gold", percentage: 74 },
      { name: "Lab-grown diamonds", percentage: 21 },
      { name: "Rhodium finish", percentage: 5 },
    ],
    media: [
      {
        kind: "image",
        url: demoAssetUrl("aurum-bague-celeste.svg"),
        alt: "Aurum Bague Celeste white-gold ring with lab-grown diamonds",
        position: 0,
      },
      {
        kind: "certificate",
        url: "https://www.galileoprotocol.io/demo-assets/aurum-celeste-certificate.pdf",
        alt: "Aurum Bague Celeste gemstone and metal certificate placeholder",
        position: 1,
      },
    ],
    story:
      "Useful for investor conversations about certificates, claims, and jewelry resale assurance.",
  },
  {
    gtin: "3760401230044",
    serialNumber: "AUR-SCENT-07",
    name: "Aurum Nuit Marine",
    description:
      "Numbered extrait de parfum with refill eligibility, batch provenance, and consumer-facing authenticity scan.",
    category: "Fragrances",
    materials: [
      { name: "Glass bottle", percentage: 55 },
      { name: "Fragrance concentrate", percentage: 28 },
      { name: "Aluminum cap", percentage: 10 },
      { name: "Paper label", percentage: 7 },
    ],
    media: [
      {
        kind: "image",
        url: demoAssetUrl("aurum-nuit-marine.svg"),
        alt: "Aurum Nuit Marine numbered fragrance bottle",
        position: 0,
      },
    ],
    story:
      "Shows a lower-ticket luxury category where refill, batch, and authenticity signals matter more than ownership transfer.",
  },
  {
    gtin: "3760401230051",
    serialNumber: "AUR-EYE-221",
    name: "Aurum Lunettes Horizon",
    description:
      "Titanium eyewear with serialized temple engraving and service-center passport events.",
    category: "Eyewear",
    materials: [
      { name: "Titanium", percentage: 58 },
      { name: "Bio-acetate", percentage: 24 },
      { name: "Mineral lenses", percentage: 18 },
    ],
    media: [
      {
        kind: "image",
        url: demoAssetUrl("aurum-lunettes-horizon.svg"),
        alt: "Aurum Lunettes Horizon titanium eyewear",
        position: 0,
      },
    ],
    story:
      "Demonstrates compact product identity, repair lifecycle, and scanner verification for accessories.",
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const brand = await prisma.brand.upsert({
      where: { slug: DEMO_BRAND.slug },
      update: {
        name: DEMO_BRAND.name,
        did: DEMO_BRAND.did,
        cpoEmail: DEMO_BRAND.cpoEmail,
      },
      create: DEMO_BRAND,
    });
    const demoOperatorPasswordHash = await hashPassword(DEMO_OPERATOR_PASSWORD);
    const demoOperator = await prisma.user.upsert({
      where: { email: DEMO_OPERATOR_EMAIL },
      update: {
        role: "BRAND_ADMIN",
        brandId: brand.id,
        passwordHash: demoOperatorPasswordHash,
      },
      create: {
        email: DEMO_OPERATOR_EMAIL,
        role: "BRAND_ADMIN",
        brandId: brand.id,
        passwordHash: demoOperatorPasswordHash,
      },
    });

    let created = 0;
    let updated = 0;

    for (const demoProduct of demoProducts) {
      const did = generateDid(demoProduct.gtin, demoProduct.serialNumber);
      const digitalLink = generateDigitalLinkUrl(
        demoProduct.gtin,
        demoProduct.serialNumber,
      );
      const metadata = writeProductPassportAuthoringMetadata(undefined, {
        materials: demoProduct.materials,
        media: demoProduct.media,
      });
      const primaryImageUrl =
        demoProduct.media?.find(
          (media) => media.kind === "image" && media.position === 0,
        )?.url ?? null;
      const existing = await prisma.product.findUnique({
        where: {
          gtin_serialNumber: {
            gtin: demoProduct.gtin,
            serialNumber: demoProduct.serialNumber,
          },
        },
      });

      const product = await prisma.product.upsert({
        where: {
          gtin_serialNumber: {
            gtin: demoProduct.gtin,
            serialNumber: demoProduct.serialNumber,
          },
        },
        update: {
          did,
          name: demoProduct.name,
          description: demoProduct.description,
          category: demoProduct.category,
          brandId: brand.id,
          imageUrl: primaryImageUrl,
        },
        create: {
          gtin: demoProduct.gtin,
          serialNumber: demoProduct.serialNumber,
          did,
          name: demoProduct.name,
          description: demoProduct.description,
          category: demoProduct.category,
          brandId: brand.id,
          imageUrl: primaryImageUrl,
        },
      });

      await prisma.productPassport.upsert({
        where: { productId: product.id },
        update: {
          digitalLink,
          metadata: {
            ...metadata,
            demo: {
              story: demoProduct.story,
              collection: "Pilot Demo Room",
            },
          } as Prisma.InputJsonValue,
        },
        create: {
          productId: product.id,
          digitalLink,
          metadata: {
            ...metadata,
            demo: {
              story: demoProduct.story,
              collection: "Pilot Demo Room",
            },
          } as Prisma.InputJsonValue,
        },
      });

      if (!existing) {
        await prisma.productEvent.create({
          data: {
            productId: product.id,
            type: "CREATED",
            data: {
              source: "demo-dataset",
              name: demoProduct.name,
              gtin: demoProduct.gtin,
              serialNumber: demoProduct.serialNumber,
              category: demoProduct.category,
            },
          },
        });
        created += 1;
      } else {
        updated += 1;
      }
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          brand: {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            did: brand.did,
          },
          operator: {
            id: demoOperator.id,
            email: demoOperator.email,
            role: demoOperator.role,
          },
          products: {
            created,
            updated,
            total: demoProducts.length,
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
  console.error("Demo dataset seed failed:", error);
  process.exit(1);
});
