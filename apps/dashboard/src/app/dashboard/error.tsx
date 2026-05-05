"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring in production
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred while rendering this page. Try refreshing
        or contact support if the issue persists.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
