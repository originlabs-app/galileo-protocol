/**
 * Webhook outbox — PostgreSQL-backed queue for reliable webhook delivery.
 *
 * When a product event occurs (MINTED, TRANSFERRED, RECALLED, VERIFIED),
 * the outbox creates entries in WebhookDelivery for all matching subscriptions.
 * A background worker processes the queue and attempts delivery with exponential backoff.
 *
 * Deliveries survive server restarts. Max 5 attempts per delivery.
 */

import { randomBytes } from "node:crypto";
import type { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import type { WebhookEvent, WebhookSubscription } from "./types.js";
import { deliverWebhook, getBackoffMs } from "./delivery.js";

let workerInterval: ReturnType<typeof setInterval> | null = null;

const MAX_ATTEMPTS = 5;

// ─── Type mappers ──────────────────────────────────────────────

function mapSubscription(row: {
  id: string;
  brandId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: Date;
}): WebhookSubscription {
  return {
    id: row.id,
    brandId: row.brandId,
    url: row.url,
    secret: row.secret,
    events: row.events,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDelivery(row: {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date;
  lastAttemptAt: Date | null;
  status: string;
  createdAt: Date;
}): WebhookEvent {
  return {
    id: row.id,
    subscriptionId: row.webhookId,
    eventType: row.eventType,
    payload: row.payload as Record<string, unknown>,
    attempts: row.attempts,
    maxAttempts: MAX_ATTEMPTS,
    nextAttemptAt: row.nextAttemptAt,
    status: row.status as "pending" | "delivered" | "failed",
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt,
  };
}

// ─── Subscription management ─────────────────────────────────

export async function addSubscription(
  prisma: PrismaClient,
  sub: WebhookSubscription,
): Promise<void> {
  await prisma.webhookSubscription.create({
    data: {
      id: sub.id,
      brandId: sub.brandId,
      url: sub.url,
      secret: sub.secret,
      events: sub.events,
      active: sub.active,
    },
  });
}

export async function removeSubscription(
  prisma: PrismaClient,
  id: string,
): Promise<boolean> {
  const deleted = await prisma.webhookSubscription.deleteMany({
    where: { id },
  });
  return deleted.count > 0;
}

export async function getSubscription(
  prisma: PrismaClient,
  id: string,
): Promise<WebhookSubscription | undefined> {
  const row = await prisma.webhookSubscription.findUnique({ where: { id } });
  return row ? mapSubscription(row) : undefined;
}

export async function listSubscriptions(
  prisma: PrismaClient,
  brandId?: string,
): Promise<WebhookSubscription[]> {
  const rows = await prisma.webhookSubscription.findMany({
    where: brandId ? { brandId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapSubscription);
}

// ─── Outbox operations ────────────────────────────────────────

/**
 * Enqueue webhook events for all matching active subscriptions.
 * Non-blocking: does not throw even if there are no matching subscriptions.
 */
export async function enqueueWebhookEvent(
  prisma: PrismaClient,
  eventType: string,
  productId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  const payload = {
    eventType,
    productId,
    data,
    timestamp: now.toISOString(),
  };

  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      active: true,
      events: { has: eventType },
    },
  });

  if (subscriptions.length === 0) return;

  // JSON.parse/stringify ensures Prisma accepts the payload as InputJsonValue
  const jsonPayload = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

  await prisma.webhookDelivery.createMany({
    data: subscriptions.map((sub) => ({
      webhookId: sub.id,
      eventType,
      payload: jsonPayload,
      nextAttemptAt: now,
    })),
  });
}

/**
 * Process the next due outbox entry.
 * Returns true if an entry was processed, false if queue is empty or nothing is due.
 */
export async function processNext(prisma: PrismaClient): Promise<boolean> {
  const now = new Date();

  const delivery = await prisma.webhookDelivery.findFirst({
    where: {
      status: "pending",
      nextAttemptAt: { lte: now },
    },
    include: { subscription: true },
    orderBy: { createdAt: "asc" },
  });

  if (!delivery) return false;

  const result = await deliverWebhook(
    mapDelivery(delivery),
    mapSubscription(delivery.subscription),
  );

  const newAttempts = delivery.attempts + 1;

  if (result.success) {
    // Terminal: delete on success to keep table lean
    await prisma.webhookDelivery.delete({ where: { id: delivery.id } });
  } else if (newAttempts >= MAX_ATTEMPTS) {
    // Terminal: max retries exhausted — delete
    await prisma.webhookDelivery.delete({ where: { id: delivery.id } });
  } else {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempts: newAttempts,
        lastError: result.error,
        lastAttemptAt: now,
        nextAttemptAt: new Date(
          now.getTime() + getBackoffMs(newAttempts - 1),
        ),
      },
    });
  }

  return true;
}

/**
 * Start the outbox background worker.
 */
export function startWorker(prisma: PrismaClient, intervalMs = 5000): void {
  if (workerInterval) return;
  workerInterval = setInterval(async () => {
    try {
      while (await processNext(prisma)) {
        // Process all due entries
      }
    } catch {
      // Worker must never crash the process
    }
  }, intervalMs);
}

/**
 * Stop the outbox background worker.
 */
export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

/**
 * Get all pending outbox entries (for testing/monitoring).
 */
export async function getOutboxEntries(
  prisma: PrismaClient,
): Promise<WebhookEvent[]> {
  const rows = await prisma.webhookDelivery.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapDelivery);
}

export type DeliveryStatusFilter = "pending" | "failing";

export interface ListDeliveriesOptions {
  status?: DeliveryStatusFilter;
  limit?: number;
  cursor?: string;
}

export interface ListDeliveriesResult {
  deliveries: WebhookEvent[];
  nextCursor: string | null;
}

/**
 * List queued delivery events for a given subscription.
 *
 * Returns newest-first, paginated by cursor (id of the last row in the previous page).
 * `status` narrows by queue state: "pending" = attempts=0, "failing" = attempts>0.
 */
export async function listDeliveries(
  prisma: PrismaClient,
  subscriptionId: string,
  opts: ListDeliveriesOptions = {},
): Promise<ListDeliveriesResult> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  const where: Prisma.WebhookDeliveryWhereInput = {
    webhookId: subscriptionId,
  };
  if (opts.status === "pending") {
    where.status = "pending";
    where.attempts = 0;
  } else if (opts.status === "failing") {
    where.status = "pending";
    where.attempts = { gt: 0 };
  }

  const rows = await prisma.webhookDelivery.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(opts.cursor
      ? { cursor: { id: opts.cursor }, skip: 1 }
      : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    deliveries: page.map(mapDelivery),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

/**
 * Requeue all non-delivered events for a subscription.
 * Resets attempts counter and sets nextAttemptAt to now so the worker
 * picks them up on the next tick.
 * Returns the number of events requeued.
 */
export async function requeueFailed(
  prisma: PrismaClient,
  subscriptionId: string,
): Promise<number> {
  const now = new Date();
  const result = await prisma.webhookDelivery.updateMany({
    where: {
      webhookId: subscriptionId,
      status: { not: "delivered" },
    },
    data: {
      attempts: 0,
      nextAttemptAt: now,
      status: "pending",
      lastError: null,
    },
  });
  return result.count;
}

// ─── Stats ────────────────────────────────────────────────────

export interface WebhookStats {
  subscriptions: { total: number; active: number; inactive: number };
  deliveries: { total: number; pending: number; failing: number };
  byEvent: Array<{ eventType: string; pending: number; failing: number }>;
}

/**
 * Aggregate webhook health metrics.
 *
 * Delivered rows are removed from the table on success (see processNext),
 * so stats describe the live queue only: "pending" = not yet tried,
 * "failing" = tried at least once and awaiting retry.
 */
export async function getStats(
  prisma: PrismaClient,
  brandId?: string,
): Promise<WebhookStats> {
  const subWhere: Prisma.WebhookSubscriptionWhereInput = brandId
    ? { brandId }
    : {};
  const delWhere: Prisma.WebhookDeliveryWhereInput = brandId
    ? { subscription: { brandId } }
    : {};

  const [subTotal, subActive, delTotal, delPending, delFailing] =
    await Promise.all([
      prisma.webhookSubscription.count({ where: subWhere }),
      prisma.webhookSubscription.count({
        where: { ...subWhere, active: true },
      }),
      prisma.webhookDelivery.count({ where: delWhere }),
      prisma.webhookDelivery.count({
        where: { ...delWhere, status: "pending", attempts: 0 },
      }),
      prisma.webhookDelivery.count({
        where: { ...delWhere, status: "pending", attempts: { gt: 0 } },
      }),
    ]);

  const [pendingByEvent, failingByEvent] = await Promise.all([
    prisma.webhookDelivery.groupBy({
      by: ["eventType"],
      where: { ...delWhere, status: "pending", attempts: 0 },
      _count: { _all: true },
    }),
    prisma.webhookDelivery.groupBy({
      by: ["eventType"],
      where: { ...delWhere, status: "pending", attempts: { gt: 0 } },
      _count: { _all: true },
    }),
  ]);

  const pendingMap = new Map<string, number>(
    pendingByEvent.map((r) => [r.eventType, r._count._all ?? 0]),
  );
  const failingMap = new Map<string, number>(
    failingByEvent.map((r) => [r.eventType, r._count._all ?? 0]),
  );
  const eventTypes = new Set<string>([
    ...pendingMap.keys(),
    ...failingMap.keys(),
  ]);

  const byEvent = Array.from(eventTypes)
    .sort()
    .map((eventType) => ({
      eventType,
      pending: pendingMap.get(eventType) ?? 0,
      failing: failingMap.get(eventType) ?? 0,
    }));

  return {
    subscriptions: {
      total: subTotal,
      active: subActive,
      inactive: subTotal - subActive,
    },
    deliveries: {
      total: delTotal,
      pending: delPending,
      failing: delFailing,
    },
    byEvent,
  };
}

/**
 * Clear all subscriptions and outbox entries (for testing).
 */
export async function clearAll(prisma: PrismaClient): Promise<void> {
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookSubscription.deleteMany();
}

/**
 * Generate a signing secret for a new subscription.
 */
export function generateSecret(): string {
  return randomBytes(32).toString("hex");
}
