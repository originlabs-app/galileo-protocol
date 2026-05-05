/**
 * Jurisdiction compliance module.
 *
 * Checks that the destination jurisdiction is not in a blocked/sanctioned list.
 * Based on OFAC primary sanctions programs (Cuba, Iran, North Korea, Syria)
 * and the Crimea region (UA-43).
 *
 * If no jurisdiction is provided in the context, the check passes — jurisdiction
 * data requires a GeoIP lookup which is the caller's responsibility.
 */

import type { ComplianceContext, ComplianceResult } from "./index.js";

/**
 * OFAC-blocked ISO 3166-1 alpha-2 country codes.
 * Source: US Treasury OFAC primary sanctions programs.
 */
const BLOCKED_JURISDICTIONS = new Set([
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea (DPRK)
  "SY", // Syria
]);

/**
 * OFAC-blocked ISO 3166-2 region codes (sub-national).
 * UA-43 = Crimea (occupied by Russia, subject to US/EU sanctions).
 */
const BLOCKED_REGIONS = new Set(["UA-43"]);

export async function jurisdictionCheck(
  ctx: ComplianceContext,
): Promise<ComplianceResult> {
  const jurisdiction = ctx.jurisdiction;

  // No jurisdiction data available — cannot verify, allow through
  if (jurisdiction == null || jurisdiction === "") {
    return { passed: true, module: "jurisdiction" };
  }

  const upper = jurisdiction.toUpperCase();

  if (BLOCKED_JURISDICTIONS.has(upper) || BLOCKED_REGIONS.has(upper)) {
    return {
      passed: false,
      module: "jurisdiction",
      reason: `Transfer destination is in a blocked jurisdiction: ${upper}`,
    };
  }

  return { passed: true, module: "jurisdiction" };
}
