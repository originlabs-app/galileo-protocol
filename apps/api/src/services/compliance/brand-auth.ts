/**
 * Brand authorization compliance module.
 *
 * Verifies that the transferring user is authorized to transfer products
 * of the given brand. ADMIN can transfer any brand's products.
 * BRAND_ADMIN can only transfer products belonging to their own brand.
 */

import type { ComplianceContext, ComplianceResult } from "./index.js";

export async function brandAuthCheck(
  ctx: ComplianceContext,
): Promise<ComplianceResult> {
  // ADMIN bypasses brand-auth check
  if (ctx.userRole === "ADMIN") {
    return { passed: true, module: "brand-auth" };
  }

  // Cross-brand transfer: user's brand does not match product's brand
  if (ctx.userBrandId !== ctx.productBrandId) {
    return {
      passed: false,
      module: "brand-auth",
      reason: "Cross-brand transfer not authorized for non-ADMIN users",
    };
  }

  return { passed: true, module: "brand-auth" };
}
