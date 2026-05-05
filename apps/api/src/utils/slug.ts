/**
 * Convert a string to kebab-case slug.
 * Removes special characters and replaces spaces/separators with hyphens.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
