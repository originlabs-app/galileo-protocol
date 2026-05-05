/**
 * On-chain verification service: reads product data from a deployed GalileoToken.
 *
 * Compares on-chain state with the expected values to detect tampering
 * or decommissioning. Returns {found: false} on any RPC/contract error
 * so callers can gracefully degrade when chain is unavailable.
 */
import { GALILEO_TOKEN_ABI } from "./abi.js";
import type { VerifyResult } from "./types.js";

/**
 * Read product metadata from a deployed GalileoToken contract.
 *
 * @param publicClient  Viem public client (read-only)
 * @param tokenAddress  Deployed GalileoToken contract address
 * @returns VerifyResult with on-chain fields, or {found: false} on error
 */
export async function verifyOnChain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
  tokenAddress: `0x${string}`,
): Promise<VerifyResult> {
  try {
    const [productDID, gtin, serialNumber, productCategory, isDecommissioned] =
      await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: GALILEO_TOKEN_ABI,
          functionName: "productDID",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress,
          abi: GALILEO_TOKEN_ABI,
          functionName: "gtin",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress,
          abi: GALILEO_TOKEN_ABI,
          functionName: "serialNumber",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress,
          abi: GALILEO_TOKEN_ABI,
          functionName: "productCategory",
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress,
          abi: GALILEO_TOKEN_ABI,
          functionName: "isDecommissioned",
        }) as Promise<boolean>,
      ]);

    return {
      found: true,
      tokenAddress,
      productDID,
      gtin,
      serialNumber,
      productCategory,
      isDecommissioned,
    };
  } catch {
    return { found: false };
  }
}
