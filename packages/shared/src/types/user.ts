/** RBAC roles matching the Prisma schema Role enum */
export enum Role {
  ADMIN = "ADMIN",
  BRAND_ADMIN = "BRAND_ADMIN",
  OPERATOR = "OPERATOR",
  VIEWER = "VIEWER",
}

/** Safe user representation without sensitive fields (frontend-safe) */
export interface UserPublic {
  id: string;
  email: string;
  role: Role;
  brandId: string | null;
  walletAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Full user entity with sensitive fields (backend only) */
export interface UserInternal extends UserPublic {
  passwordHash: string;
  refreshToken: string | null;
}

/**
 * User type — alias for UserInternal for backward compatibility.
 * New code should use UserInternal (backend) or UserPublic (frontend) explicitly.
 */
export type User = UserInternal;
