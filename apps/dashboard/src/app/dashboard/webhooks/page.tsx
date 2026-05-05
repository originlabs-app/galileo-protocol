"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  secret?: string;
}

interface Stats {
  subscriptions: { total: number; active: number; inactive: number };
  deliveries: { total: number; pending: number; failing: number };
  byEvent: Array<{ eventType: string; pending: number; failing: number }>;
}

const EVENT_CATALOG = ["MINTED", "TRANSFERRED", "RECALLED", "VERIFIED"];
const POLL_INTERVAL_MS = 10_000;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WebhooksPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [subsRes, statsRes] = await Promise.all([
        api<{ data: { subscriptions: Subscription[] } }>("/webhooks"),
        api<{ data: Stats }>("/webhooks/stats"),
      ]);
      setSubscriptions(subsRes.data.subscriptions);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load webhooks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this webhook subscription? This cannot be undone.")) {
      return;
    }
    try {
      await api(`/webhooks/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete subscription");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe to product lifecycle events. Deliveries retry with
            exponential backoff up to 5 attempts.
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(next) => {
            setCreateOpen(next);
            if (!next) setCreatedSecret(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New webhook
            </Button>
          </DialogTrigger>
          <CreateWebhookDialog
            onCreated={async (secret) => {
              setCreatedSecret(secret);
              await load();
            }}
            secret={createdSecret}
            onClose={() => {
              setCreateOpen(false);
              setCreatedSecret(null);
            }}
          />
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Subscriptions"
          value={stats?.subscriptions.total ?? 0}
          hint={
            stats
              ? `${stats.subscriptions.active} active · ${stats.subscriptions.inactive} inactive`
              : "—"
          }
          icon={<WebhookIcon className="size-4" />}
        />
        <StatCard
          label="In flight"
          value={stats?.deliveries.total ?? 0}
          hint="Queued or retrying deliveries"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Pending"
          value={stats?.deliveries.pending ?? 0}
          hint="Not yet attempted"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Failing"
          value={stats?.deliveries.failing ?? 0}
          hint="Awaiting retry after failure"
          icon={<AlertTriangle className="size-4" />}
          emphasis={stats ? stats.deliveries.failing > 0 : false}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Subscriptions</CardTitle>
          <CardDescription>
            Each subscription receives signed HTTPS POST requests for the
            selected events.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No webhooks yet. Click <strong>New webhook</strong> to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/webhooks/${sub.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {sub.url}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.events.map((e) => (
                          <Badge key={e} variant="outline" className="text-xs">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.active ? "default" : "outline"}>
                        {sub.active ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sub.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(sub.id)}
                        aria-label="Delete subscription"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  emphasis = false,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div
          className={
            emphasis
              ? "text-3xl font-semibold text-destructive"
              : "text-3xl font-semibold"
          }
        >
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function CreateWebhookDialog({
  onCreated,
  onClose,
  secret,
}: {
  onCreated: (secret: string) => Promise<void> | void;
  onClose: () => void;
  secret: string | null;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!url || events.length === 0) {
      setLocalError("URL and at least one event are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ data: { subscription: Subscription } }>(
        "/webhooks",
        {
          method: "POST",
          body: JSON.stringify({ url, events }),
        },
      );
      await onCreated(res.data.subscription.secret ?? "");
      setUrl("");
      setEvents([]);
    } catch (err) {
      setLocalError(
        err instanceof ApiError ? err.message : "Failed to create subscription",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (secret) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook created</DialogTitle>
          <DialogDescription>
            Copy the signing secret now — it will not be shown again. Use it to
            verify the <code className="font-mono">X-Galileo-Signature</code>{" "}
            header on incoming requests.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted px-3 py-2 font-mono text-xs break-all">
          {secret}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New webhook</DialogTitle>
        <DialogDescription>
          Receive signed HTTPS POST requests when product events occur.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {localError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {localError}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="wh-url">Endpoint URL</Label>
          <Input
            id="wh-url"
            type="url"
            placeholder="https://api.example.com/webhooks/galileo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Events</Label>
          <div className="flex flex-wrap gap-2">
            {EVENT_CATALOG.map((event) => {
              const selected = events.includes(event);
              return (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={
                    selected
                      ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/50"
                  }
                >
                  {event}
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create webhook"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
