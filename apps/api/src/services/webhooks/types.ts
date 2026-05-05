/**
 * Webhook system types.
 */

export interface WebhookSubscription {
  id: string;
  brandId: string;
  url: string;
  secret: string; // HMAC-SHA256 signing secret
  events: string[]; // e.g. ["MINTED", "TRANSFERRED", "RECALLED"]
  active: boolean;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  status: "pending" | "delivered" | "failed";
  lastError?: string;
  createdAt: Date;
}
