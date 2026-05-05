/**
 * Compliance check runner.
 *
 * Executes compliance modules sequentially and fails fast on the first rejection.
 * Each module is a pure async function returning a ComplianceResult.
 */

export interface ComplianceContext {
  productId: string;
  productStatus: string;
  productBrandId: string;
  fromAddress: string | null;
  toAddress: string;
  userId: string;
  userRole: string;
  userBrandId: string | null;
  /** ISO 3166-1 alpha-2 country code of the destination — optional, from GeoIP or caller */
  jurisdiction?: string | null;
  /** Brand's CPO email address — fetched from DB by the route before running checks */
  brandCpoEmail?: string | null;
}

export interface ComplianceResult {
  passed: boolean;
  module: string;
  reason?: string;
}

export type ComplianceModule = (
  ctx: ComplianceContext,
) => Promise<ComplianceResult>;

/**
 * Run compliance modules sequentially, returning on the first failure.
 */
export async function runComplianceChecks(
  ctx: ComplianceContext,
  modules: ComplianceModule[],
): Promise<{ passed: boolean; results: ComplianceResult[] }> {
  const results: ComplianceResult[] = [];
  for (const mod of modules) {
    const result = await mod(ctx);
    results.push(result);
    if (!result.passed) {
      return { passed: false, results };
    }
  }
  return { passed: true, results };
}
