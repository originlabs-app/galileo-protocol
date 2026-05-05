import {
  getSpecCategories,
  getSpecifications,
  capitalizeCategory,
  type SpecFile,
} from './specifications';

// ============================================================================
// Types
// ============================================================================

export interface SpecNavItem {
  title: string;
  href: string;
  status: 'Draft' | 'Active' | 'Standard';
}

export interface SpecNavSection {
  title: string;
  category: string;
  items: SpecNavItem[];
}

// ============================================================================
// Navigation Builder
// ============================================================================

/**
 * Build the complete navigation structure for the specifications sidebar.
 * Reads all categories and their specs dynamically from the filesystem.
 */
export async function buildSpecsNavigation(): Promise<SpecNavSection[]> {
  const categories = await getSpecCategories();

  const navigation = await Promise.all(
    categories.map(async (category) => {
      const specs = await getSpecifications(category);

      const items: SpecNavItem[] = specs.map((spec) => ({
        title: spec.title,
        href: buildSpecHref(spec),
        status: spec.status,
      }));

      return {
        title: capitalizeCategory(category),
        category,
        items,
      };
    })
  );

  // Sort sections alphabetically by title
  return navigation.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Build the href for a specification based on its category and location.
 */
function buildSpecHref(spec: SpecFile): string {
  if (spec.subcategory) {
    return `/specifications/${spec.category}/${spec.subcategory}/${spec.slug}`;
  }
  return `/specifications/${spec.category}/${spec.slug}`;
}

/**
 * Get navigation for a single category.
 * Useful for category-specific pages.
 */
export async function getCategoryNavigation(
  category: string
): Promise<SpecNavSection | null> {
  const specs = await getSpecifications(category);

  if (specs.length === 0) {
    return null;
  }

  const items: SpecNavItem[] = specs.map((spec) => ({
    title: spec.title,
    href: buildSpecHref(spec),
    status: spec.status,
  }));

  return {
    title: capitalizeCategory(category),
    category,
    items,
  };
}

/**
 * Get total spec count across all categories.
 */
export async function getTotalSpecCount(): Promise<number> {
  const categories = await getSpecCategories();

  const counts = await Promise.all(
    categories.map(async (category) => {
      const specs = await getSpecifications(category);
      return specs.length;
    })
  );

  return counts.reduce((sum, count) => sum + count, 0);
}
