/**
 * Cookie-based auth utilities.
 * Tokens are stored in httpOnly cookies (managed by the server).
 * The client cannot read them — auth state is determined by calling GET /auth/me.
 */

// Legacy localStorage keys to clear on app load
const LEGACY_KEYS = [
  "galileo_access_token",
  "galileo_refresh_token",
  "galileo_at",
  "galileo_rt",
  "accessToken",
  "refreshToken",
  "token",
];

/**
 * Clear any legacy localStorage tokens from the Sprint 1 implementation.
 * Call this on app load to ensure no tokens linger in localStorage.
 */
export function clearLegacyTokens(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
