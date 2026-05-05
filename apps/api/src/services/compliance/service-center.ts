/**
 * Authorized service center compliance module.
 *
 * Verifies the transferring user is authorized to act as a service center
 * for the product's brand. Authorization rules:
 *
 *   1. ADMIN — always authorized (global admin bypasses all brand scoping)
 *   2. Same brand — a user whose brandId matches productBrandId is authorized
 *      (brand can always service its own products)
 *   3. Cross-brand — requires an explicit entry in the in-memory authorization
 *      registry (see `authorizedServiceCenters`). This registry can be seeded
 *      via `authorizeServiceCenter(serviceBrandId, productBrandId)` for third-party
 *      repair partnerships. Extend to a DB-backed ServiceCenter model for production.
 */

import type { ComplianceContext, ComplianceResult } from "./index.js";

/**
 * In-memory registry of cross-brand service center authorizations.
 * Key format: `${serviceBrandId}:${productBrandId}`
 *
 * Seeded at startup or via admin tooling. Replace with a DB-backed model
 * (ServiceCenter table) when the registry grows beyond a handful of entries.
 */
export const authorizedServiceCenters = new Set<string>();

/**
 * Grant cross-brand service center authorization.
 * `serviceBrandId` can service products belonging to `productBrandId`.
 */
export function authorizeServiceCenter(
  serviceBrandId: string,
  productBrandId: string,
): void {
  authorizedServiceCenters.add(`${serviceBrandId}:${productBrandId}`);
}

/**
 * Revoke a cross-brand service center authorization.
 */
export function revokeServiceCenter(
  serviceBrandId: string,
  productBrandId: string,
): void {
  authorizedServiceCenters.delete(`${serviceBrandId}:${productBrandId}`);
}

export async function serviceCenterCheck(
  ctx: ComplianceContext,
): Promise<ComplianceResult> {
  // ADMIN bypasses all service center restrictions
  if (ctx.userRole === "ADMIN") {
    return { passed: true, module: "service-center" };
  }

  // Same brand — authorized by default
  if (ctx.userBrandId === ctx.productBrandId) {
    return { passed: true, module: "service-center" };
  }

  // Cross-brand: check explicit authorization registry
  if (
    ctx.userBrandId &&
    authorizedServiceCenters.has(`${ctx.userBrandId}:${ctx.productBrandId}`)
  ) {
    return { passed: true, module: "service-center" };
  }

  return {
    passed: false,
    module: "service-center",
    reason:
      "Requesting entity is not an authorized service center for this product's brand",
  };
}
