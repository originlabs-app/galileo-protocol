"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Shield,
  ArrowRightLeft,
  CheckCircle,
  Activity,
  Radar,
  Waves,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsResponse {
  success: true;
  data: {
    byStatus: Record<string, number>;
    verificationCount: number;
    recentEvents: Array<{
      id: string;
      type: string;
      createdAt: string;
      product: {
        name: string;
        gtin: string;
      };
    }>;
    trends?: {
      productsCreated: number[];
      verifications: number[];
    };
  };
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2 || data.every((v) => v === 0)) return null;

  const max = Math.max(...data, 1);
  const W = 64;
  const H = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible opacity-70"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Product created",
  UPDATED: "Product updated",
  MINTED: "Passport minted",
  TRANSFERRED: "Product transferred",
  VERIFIED: "Product verified",
  RECALLED: "Product recalled",
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [verificationCount, setVerificationCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<
    StatsResponse["data"]["recentEvents"]
  >([]);
  const [trends, setTrends] = useState<StatsResponse["data"]["trends"]>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api<StatsResponse>("/products/stats");
      setByStatus(res.data.byStatus);
      setVerificationCount(res.data.verificationCount);
      setRecentEvents(res.data.recentEvents);
      setTrends(res.data.trends);
    } catch (err) {
      // Silently fail -- show zeros if stats unavailable
      if (!(err instanceof ApiError)) {
        console.error("Failed to load stats", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const displayName = user?.email ?? "there";
  const activeBrandName = user?.brand?.name ?? "pilot workspace";

  const totalProducts =
    (byStatus.DRAFT ?? 0) +
    (byStatus.ACTIVE ?? 0) +
    (byStatus.TRANSFERRED ?? 0) +
    (byStatus.RECALLED ?? 0) +
    (byStatus.MINTING ?? 0);

  const stats = [
    {
      label: "Total Products",
      value: totalProducts,
      icon: Package,
      trend: trends?.productsCreated,
    },
    {
      label: "Active Passports",
      value: byStatus.ACTIVE ?? 0,
      icon: Shield,
      trend: undefined,
    },
    {
      label: "Transferred",
      value: byStatus.TRANSFERRED ?? 0,
      icon: ArrowRightLeft,
      trend: undefined,
    },
    {
      label: "Verifications",
      value: verificationCount,
      icon: CheckCircle,
      trend: trends?.verifications,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="dashboard-panel relative overflow-hidden rounded-lg p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(115deg,transparent,rgba(0,255,255,0.07),transparent_62%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                <Waves className="size-4" />
              </span>
              <p className="dashboard-kicker">Depth 004 · operator command</p>
            </div>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Welcome back, <span className="bio-text">{displayName}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">
              {activeBrandName} is live as the active workspace. Monitor passport
              issuance, lifecycle evidence, and verification signals from one
              luxury-grade control surface.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/24 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="dashboard-kicker">Protocol signal</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {isLoading ? "\u2014" : "Live"}
                </p>
              </div>
              <div className="relative flex size-14 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                <Radar className="size-6" />
                <span className="absolute size-14 animate-ping rounded-lg border border-emerald-300/20" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-white/8 bg-white/5 p-3">
                <p className="text-white/45">Active passports</p>
                <p className="mt-1 text-xl font-semibold text-emerald-200">
                  {isLoading ? "\u2014" : (byStatus.ACTIVE ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-white/8 bg-white/5 p-3">
                <p className="text-white/45">Verifications</p>
                <p className="mt-1 text-xl font-semibold text-cyan-100">
                  {isLoading ? "\u2014" : verificationCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="dashboard-kicker">
                {stat.label}
              </CardTitle>
              <div className="rounded-md border border-white/10 bg-white/6 p-2 text-cyan-100">
                <stat.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2">
                <p className="text-4xl font-semibold tracking-tight text-foreground">
                  {isLoading ? "\u2014" : stat.value}
                </p>
                {!isLoading && stat.trend && (
                  <div className="text-cyan-200">
                    <Sparkline data={stat.trend} />
                  </div>
                )}
              </div>
              <div className="mt-4 h-px bg-gradient-to-r from-cyan-200/40 via-white/10 to-transparent" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base font-medium">
            <span className="flex size-8 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/8 text-cyan-100">
              <Activity className="size-4" />
            </span>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recentEvents.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(0,255,255,0.55)]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {EVENT_LABELS[event.type] ?? event.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.product.name} ({event.product.gtin})
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-center pb-2">
        <Button asChild size="lg">
          <Link href="/dashboard/products">
            {totalProducts > 0 ? "View products" : "Create your first product"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
