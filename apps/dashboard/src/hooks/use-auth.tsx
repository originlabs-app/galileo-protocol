"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import { clearLegacyTokens } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  role: string;
  brandId?: string | null;
  walletAddress?: string | null;
  brand?: {
    id: string;
    name: string;
    slug: string;
    did: string;
  } | null;
}

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  brandName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface AuthData {
  user: User;
}

interface MeData {
  user: User;
}

// Single auth state type — no separate isLoading or dual source of truth (C9 fix).
type AuthState =
  | { state: "loading"; user: null }
  | { state: "authenticated"; user: User }
  | { state: "unauthenticated"; user: null };

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ state: "loading", user: null });

  const hydrateUser = useCallback(async () => {
    const response = await api<ApiResponse<MeData>>("/auth/me");
    setAuth({ state: "authenticated", user: response.data.user });
  }, []);

  // Clear legacy localStorage tokens and fetch user on mount
  useEffect(() => {
    clearLegacyTokens();

    let cancelled = false;

    api<ApiResponse<MeData>>("/auth/me")
      .then((response) => {
        if (!cancelled) {
          setAuth({ state: "authenticated", user: response.data.user });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuth({ state: "unauthenticated", user: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (params: LoginParams) => {
    await api<ApiResponse<AuthData>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
      skipAuth: true,
    });
    await hydrateUser();
  }, [hydrateUser]);

  const register = useCallback(async (params: RegisterParams) => {
    await api<ApiResponse<AuthData>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
      skipAuth: true,
    });
    await hydrateUser();
  }, [hydrateUser]);

  const refreshUser = useCallback(async () => {
    try {
      await hydrateUser();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuth({ state: "unauthenticated", user: null });
      }
      throw error;
    }
  }, [hydrateUser]);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors — server might already be logged out
    }
    setAuth({ state: "unauthenticated", user: null });
  }, []);

  const value: AuthContextValue = {
    user: auth.user,
    isLoading: auth.state === "loading",
    isAuthenticated: auth.state === "authenticated",
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
