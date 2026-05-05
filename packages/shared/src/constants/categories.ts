/**
 * Luxury product category constants.
 *
 * Values use Title Case to match the API enum exactly.
 *
 * @module constants/categories
 */

export const CATEGORIES = [
  "Leather Goods",
  "Jewelry",
  "Watches",
  "Fashion",
  "Accessories",
  "Fragrances",
  "Eyewear",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_VALIDATION_MESSAGE = `Category must be one of: ${CATEGORIES.join(", ")}`;
