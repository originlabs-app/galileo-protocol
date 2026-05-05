type MintModeInput = {
  nodeEnv: string | undefined;
  chainEnabled: boolean;
  canUseRealChain: boolean;
};

export type MintMode = "real" | "mock" | "unavailable";

export function getMintMode({
  nodeEnv,
  chainEnabled,
  canUseRealChain,
}: MintModeInput): MintMode {
  if (canUseRealChain) return "real";
  if (nodeEnv === "production" || chainEnabled) return "unavailable";
  return "mock";
}
