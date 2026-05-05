"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Subscription {
  id: string;
  brandId: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  status: string;
  lastError?: string;
  nextAttemptAt: string;
  createdAt: string;
}

type StatusFilter = "all" | "pending" | "failing";

const PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 10_000;

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function DeliveryStatusBadge({ delivery }: { delivery: Delivery }) {
  if (delivery.attempts === 0) {
    return <Badge variant="outline">queued</Badge>;
  }
  const nearLimit = delivery.attempts >= delivery.maxAttempts - 1;
  return (
    <Badge variant={nearLimit ? "destructive" : "default"}>
      retrying {delivery.attempts}/{delivery.maxAttempts}
    </Badge>
  );
}

export default function WebhookDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const loadDeliveries = useCallback(
    async (cursor?: string, append = false) => {
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (cursor) params.set("cursor", cursor);

        const res = await api<{
          data: { deliveries: Delivery[]; nextCursor: string | null };
        }>(`/webhooks/${id}/deliveries?${params.toString()}`);

        setDeliveries((prev) =>
          append ? [...prev, ...res.data.deliveries] : res.data.deliveries,
        );
        setNextCursor(res.data.nextCursor);
        setError(null);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load deliveries",
        );
      }
    },
    [id, statusFilter],
  );

  const loadSubscription = useCallback(async () => {
    try {
      const res = await api<{ data: { subscriptions: Subscription[] } }>(
        "/webhooks",
      );
      const found = res.data.subscriptions.find((s) => s.id === id);
      setSubscription(found ?? null);
      if (!found) setError("Subscription not found");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load subscription",
      );
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadSubscription(), loadDeliveries()]).finally(() =>
      setIsLoading(false),
    );
    const interval = setInterval(() => void loadDeliveries(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadSubscription, loadDeliveries]);

  async function handleRetryAll() {
    if (
      !confirm(
        "Retry all non-delivered events for this subscription? In-flight retries will be re-attempted immediately.",
      )
    ) {
      return;
    }
    setRetrying(true);
    try {
      await api(`/webhooks/${id}/retry`, { method: "POST" });
      await loadDeliveries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this webhook subscription? This cannot be undone.")) {
      return;
    }
    try {
      await api(`/webhooks/${id}`, { method: "DELETE" });
      router.push("/dashboard/webhooks");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Link
          href="/dashboard/webhooks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to webhooks
        </Link>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? "Subscription not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/webhooks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to webhooks
      </Link>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="font-mono text-base break-all">
                {subscription.url}
              </CardTitle>
              <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={subscription.active ? "default" : "outline"}>
                  {subscription.active ? "active" : "inactive"}
                </Badge>
                {subscription.events.map((e) => (
                  <Badge key={e} variant="outline">
                    {e}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground">
                  Created {formatDateTime(subscription.createdAt)}
                </span>
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                onClick={handleRetryAll}
                disabled={retrying}
              >
                <RefreshCw
                  className={
                    retrying ? "size-4 animate-spin" : "size-4"
                  }
                />
                {retrying ? "Retrying…" : "Retry all"}
              </Button>
              <Button variant="ghost" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-xl">Deliveries</CardTitle>
              <CardDescription>
                Delivered events are removed from the queue on success; only
                in-flight and retrying events appear here.
              </CardDescription>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failing">Failing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {deliveries.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No deliveries {statusFilter !== "all" ? `(${statusFilter})` : ""}{" "}
              in queue.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next attempt</TableHead>
                    <TableHead>Last error</TableHead>
                    <TableHead>Queued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Badge variant="outline">{d.eventType}</Badge>
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge delivery={d} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(d.nextAttemptAt)}
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate text-xs text-muted-foreground"
                        title={d.lastError ?? ""}
                      >
                        {d.lastError ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {nextCursor && (
                <div className="px-6 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => void loadDeliveries(nextCursor, true)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
