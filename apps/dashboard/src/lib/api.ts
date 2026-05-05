"use client";

import { API_URL } from "./constants";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

interface ApiErrorPayload {
  message: string;
  details?: unknown;
}

// Guard: refreshPromise must only exist in the browser. The typeof window
// check below prevents SSR leaks across concurrent server-side requests
// (C8 security fix).
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Galileo-Client": "1" },
    });

    if (!response.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const url = `${API_URL}${path}`;

  const headers = new Headers(fetchOptions.headers);

  if (
    !headers.has("Content-Type") &&
    fetchOptions.body &&
    !isFormDataBody(fetchOptions.body)
  ) {
    headers.set("Content-Type", "application/json");
  }

  // CSRF protection: send X-Galileo-Client header on state-mutating requests
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  if (method === "POST" || method === "PATCH" || method === "DELETE" || method === "PUT") {
    headers.set("X-Galileo-Client", "1");
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !skipAuth) {
    // Only attempt refresh in the browser — the typeof window guard
    // prevents sharing refreshPromise across concurrent SSR requests
    // (C8 security fix).
    if (typeof window === "undefined") {
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    // Attempt token refresh (deduplicate concurrent refresh attempts)
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().then((result) => {
        // Clear the promise only after the result has been captured,
        // so all concurrent callers get the same resolved value.
        refreshPromise = null;
        return result;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      // Retry the original request with the new cookie
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });

      if (!retryResponse.ok) {
        const error = await getErrorPayload(retryResponse);
        throw new ApiError(retryResponse.status, error.message, error.details);
      }

      return retryResponse.json() as Promise<T>;
    }

    // Refresh failed
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!response.ok) {
    const error = await getErrorPayload(response);
    throw new ApiError(response.status, error.message, error.details);
  }

  return response.json() as Promise<T>;
}

async function getErrorPayload(response: Response): Promise<ApiErrorPayload> {
  try {
    const data = await response.json();
    // API wraps errors as { success: false, error: { code, message } }
    if (data.error?.message) {
      return {
        message: data.error.message,
        details: data.error.details,
      };
    }

    return {
      message: data.message ?? "An unexpected error occurred",
    };
  } catch {
    return { message: "An unexpected error occurred" };
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
