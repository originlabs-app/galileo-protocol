/** Event type matching the Prisma EventType enum */
export enum EventType {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  MINTED = "MINTED",
  TRANSFERRED = "TRANSFERRED",
  VERIFIED = "VERIFIED",
  RECALLED = "RECALLED",
}

/** Product event entity matching the Prisma ProductEvent model */
export interface ProductEvent {
  id: string;
  productId: string;
  type: EventType;
  data: Record<string, unknown>;
  performedBy: string;
  createdAt: Date;
}
