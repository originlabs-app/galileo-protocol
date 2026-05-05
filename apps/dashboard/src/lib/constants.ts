/**
 * Returns the API base URL.
 *
 * In production the NEXT_PUBLIC_API_URL environment variable MUST be set.
 * During `next build` the variable is inlined — if it is missing the build
 * itself will fail with a clear error, which is the desired behaviour.
 *
 * In development mode the URL defaults to http://localhost:4000.
 */
function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (url) return url;

  // Next.js sets NODE_ENV=production during `next build`, so this guard
  // fires at build time when the env var is not provided. This is
  // intentional: production builds MUST define the API URL.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required in production. " +
        "Set it to the API server URL (e.g., https://api.galileoprotocol.io).",
    );
  }

  return "http://localhost:4000";
}

export const API_URL = getApiUrl();
