/**
 * RBAC role constants matching the Prisma Role enum.
 *
 * @module constants/roles
 */

export const ROLES = {
  ADMIN: "ADMIN",
  BRAND_ADMIN: "BRAND_ADMIN",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER",
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[RoleKey];
