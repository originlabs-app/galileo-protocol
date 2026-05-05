import {
  getSpecCategories,
  getSpecifications,
} from "@/lib/specifications";
import { getTotalSpecCount } from "@/lib/specs-navigation";
import { FilterableSpecGrid } from "@/components/specifications/FilterableSpecGrid";

// ============================================================================
// Page Component
// ============================================================================

export const metadata = {
  title: "Technical Specifications",
  description:
    "Browse all Galileo Protocol technical specifications across identity, token, data, infrastructure, and compliance domains. Includes schemas and implementation guides.",
};

export default async function SpecificationsPage() {
  const categories = await getSpecCategories();
  const totalSpecs = await getTotalSpecCount();

  // Get all specs for each category (for filter + preview)
  const categoriesWithSpecs = await Promise.all(
    categories.map(async (category) => {
      const specs = await getSpecifications(category);
      return {
        name: category,
        allSpecs: specs.map((s) => ({
          title: s.title,
          status: s.status,
        })),
      };
    }),
  );

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--platinum)] mb-4">
          Technical Specifications
        </h1>
        <p className="text-lg text-[var(--platinum-dim)] leading-relaxed">
          Browse {totalSpecs} technical specifications across{" "}
          {categories.length} categories. Each specification includes detailed
          technical requirements, schemas, and implementation guidance for the
          Galileo Luxury Standard protocol.
        </p>
      </div>

      {/* Filterable grid (client component handles filter state + rendering) */}
      <FilterableSpecGrid categories={categoriesWithSpecs} />

      {/* Footer note */}
      <div className="mt-12 pt-8 border-t border-[var(--platinum)]/10">
        <p className="text-sm text-[var(--platinum-dim)]">
          These specifications define the technical foundation of the Galileo
          Luxury Standard. They are organized by domain and include JSON
          schemas, protocol definitions, and integration guides. All
          specifications follow semantic versioning.
        </p>
      </div>
    </div>
  );
}
