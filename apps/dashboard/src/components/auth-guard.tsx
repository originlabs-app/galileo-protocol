"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { evaluateWorkspaceAccess } from "@/lib/workspace-access";

interface AuthGuardProps {
  children: React.ReactNode;
}

// useSyncExternalStore with getServerSnapshot returning false and
// getSnapshot returning true avoids the hydration mismatch lint-safely:
// SSR and first client render both get false (not mounted), then React
// re-renders with true after hydration completes.
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuth();
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  const access = evaluateWorkspaceAccess(user);
  const isSetupRoute = pathname === "/dashboard/setup";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }

    if (!isLoading && isAuthenticated && !isSetupRoute && !access.isEligible) {
      router.replace("/dashboard/setup");
    }
  }, [access.isEligible, isAuthenticated, isLoading, isSetupRoute, router]);

  // SSR and first client render both return null — no hydration mismatch.
  // After hydration, useSyncExternalStore returns true and we show real content.
  if (!mounted || isLoading) {
    return null;
  }

  // Not authenticated after check — render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (!isSetupRoute && !access.isEligible) {
    return null;
  }

  return <>{children}</>;
}
