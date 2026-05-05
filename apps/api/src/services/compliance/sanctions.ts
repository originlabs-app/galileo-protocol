/**
 * Sanctions list compliance module.
 *
 * Checks destination address against a static blocklist.
 * MVP: empty blocklist (no addresses are sanctioned).
 * Extension point: integrate OFAC/EU sanctions API later.
 */

import type { ComplianceContext, ComplianceResult } from "./index.js";

/**
 * Static sanctions blocklist.
 * Add addresses (lowercase) to block transfers to sanctioned entities.
 */
export const sanctionedAddresses = new Set<string>();

export async function sanctionsCheck(
  ctx: ComplianceContext,
): Promise<ComplianceResult> {
  if (sanctionedAddresses.has(ctx.toAddress.toLowerCase())) {
    return {
      passed: false,
      module: "sanctions",
      reason: "Destination address is on the sanctions list",
    };
  }
  return { passed: true, module: "sanctions" };
}
