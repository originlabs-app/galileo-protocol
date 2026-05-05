/**
 * CPO (Chief Privacy Officer) contact compliance module.
 *
 * Validates that the product's brand has a valid CPO email address registered,
 * as required for GDPR/data protection compliance in transfer workflows.
 *
 * The route pre-fetches `brand.cpoEmail` and passes it as `ctx.brandCpoEmail`.
 * If no email is provided (brand hasn't configured CPO enforcement), the check
 * passes — enforcement is opt-in per brand.
 */

import type { ComplianceContext, ComplianceResult } from "./index.js";

export async function cpoCheck(
  ctx: ComplianceContext,
): Promise<ComplianceResult> {
  // Not configured for this brand — skip enforcement
  if (ctx.brandCpoEmail === undefined) {
    return { passed: true, module: "cpo" };
  }

  // Brand has opted in but email is empty/null
  if (!ctx.brandCpoEmail || ctx.brandCpoEmail.trim() === "") {
    return {
      passed: false,
      module: "cpo",
      reason:
        "Brand has no valid CPO contact registered. " +
        "A Chief Privacy Officer email is required for transfer compliance.",
    };
  }

  return { passed: true, module: "cpo" };
}
