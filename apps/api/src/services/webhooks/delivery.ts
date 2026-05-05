/**
 * Webhook HTTP delivery with HMAC-SHA256 signature.
 *
 * Sends POST to subscription URL with:
 * - Body: JSON payload
 * - Header X-Galileo-Signature: HMAC-SHA256 of body using subscription secret
 * - Header X-Galileo-Event: event type string
 * - Timeout: 10s
 */

import { createHmac } from "node:crypto";
import type { WebhookEvent, WebhookSubscription } from "./types.js";

const DELIVERY_TIMEOUT_MS = 10_000;

/**
 * Generate HMAC-SHA256 signature for a payload.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Attempt delivery of a webhook event.
 * Returns true on success (2xx), false otherwise.
 */
export async function deliverWebhook(
  event: WebhookEvent,
  subscription: WebhookSubscription,
): Promise<{ success: boolean; error?: string }> {
  const body = JSON.stringify(event.payload);
  const signature = signPayload(body, subscription.secret);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(subscription.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Galileo-Signature": signature,
        "X-Galileo-Event": event.eventType,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.ok) {
      return { success: true };
    }

    return {
      success: false,
      error: `HTTP ${response.status} ${response.statusText}`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown delivery error";
    return { success: false, error: message };
  }
}

/**
 * Calculate exponential backoff delay (in ms) for a given attempt number.
 * Backoff schedule: 1min, 5min, 25min, 2h, 10h
 */
export function getBackoffMs(attempt: number): number {
  const schedule = [
    1 * 60 * 1000, // 1 min
    5 * 60 * 1000, // 5 min
    25 * 60 * 1000, // 25 min
    2 * 60 * 60 * 1000, // 2 hours
    10 * 60 * 60 * 1000, // 10 hours
  ];
  return schedule[Math.min(attempt, schedule.length - 1)]!;
}
