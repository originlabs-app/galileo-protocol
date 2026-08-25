import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getSpecCategories, getSpecifications } from "@/lib/specifications";

const baseUrl = "https://www.galileoprotocol.io";

type SitemapEntry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  options: { lastModified?: Date; changeFrequency?: SitemapEntry["changeFrequency"]; priority?: number } = {}
): SitemapEntry {
  return {
    url: `${baseUrl}${path}`,
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency ?? "monthly",
    priority: options.priority ?? 0.5,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = getAllPosts().map((post) =>
    entry(`/blog/${post.slug}`, {
      lastModified: new Date(post.frontmatter.modified),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  // Specification pages: category pages + individual spec pages
  const specEntries: SitemapEntry[] = [];
  const categories = await getSpecCategories();
  for (const category of categories) {
    specEntries.push(entry(`/specifications/${category}`, { priority: 0.7 }));
    const specs = await getSpecifications(category);
    for (const spec of specs) {
      const slugPath = spec.subcategory
        ? `${spec.subcategory}/${spec.slug}`
        : spec.slug;
      specEntries.push(
        entry(`/specifications/${category}/${slugPath}`, {
          lastModified: spec.lastUpdated ? new Date(spec.lastUpdated) : undefined,
          priority: 0.5,
        })
      );
    }
  }

  return [
    entry("", { changeFrequency: "monthly", priority: 1 }),
    // Documentation
    entry("/docs", { priority: 0.8 }),
    entry("/docs/quick-start", { priority: 0.8 }),
    entry("/docs/concepts", { priority: 0.7 }),
    entry("/docs/architecture", { priority: 0.7 }),
    entry("/docs/token", { priority: 0.6 }),
    entry("/docs/token/ownership-transfer", { priority: 0.5 }),
    entry("/docs/identity", { priority: 0.6 }),
    entry("/docs/identity/did-method", { priority: 0.5 }),
    entry("/docs/identity/verifiable-credentials", { priority: 0.5 }),
    entry("/docs/identity/onchainid", { priority: 0.5 }),
    entry("/docs/compliance", { priority: 0.7 }),
    entry("/docs/compliance/espr", { priority: 0.7 }),
    entry("/docs/compliance/gdpr", { priority: 0.6 }),
    entry("/docs/compliance/mica", { priority: 0.6 }),
    entry("/docs/governance/charter", { priority: 0.5 }),
    entry("/docs/contributing", { priority: 0.5 }),
    entry("/docs/versioning", { priority: 0.5 }),
    entry("/docs/code-of-conduct", { priority: 0.5 }),
    entry("/docs/rfc-process", { priority: 0.5 }),
    entry("/docs/license", { priority: 0.5 }),
    // Specifications
    entry("/specifications", { priority: 0.8 }),
    ...specEntries,
    // Governance
    entry("/governance", { priority: 0.7 }),
    entry("/governance/tsc", { priority: 0.5 }),
    // Ecosystem
    entry("/maison", { priority: 0.6 }),
    entry("/blog", { changeFrequency: "weekly", priority: 0.7 }),
    entry("/changelog", { changeFrequency: "weekly", priority: 0.6 }),
    entry("/roadmap", { priority: 0.6 }),
    entry("/tools", { priority: 0.6 }),
    entry("/tools/faucet", { priority: 0.5 }),
    entry("/tools/gas-estimator", { priority: 0.5 }),
    // Legal
    entry("/privacy", { changeFrequency: "yearly", priority: 0.3 }),
    entry("/terms", { changeFrequency: "yearly", priority: 0.3 }),
    entry("/legal", { changeFrequency: "yearly", priority: 0.3 }),
    ...blogPosts,
  ];
}
