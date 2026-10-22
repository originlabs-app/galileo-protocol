export function capitalizeCategory(category: string): string {
  if (category === "dpia") return "Data protection impact assessment";
  if (category === "crypto") return "Cryptography";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
