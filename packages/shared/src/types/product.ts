/** Product status matching the Prisma ProductStatus enum */
export enum ProductStatus {
  DRAFT = "DRAFT",
  MINTING = "MINTING",
  ACTIVE = "ACTIVE",
  TRANSFERRED = "TRANSFERRED",
  RECALLED = "RECALLED",
}

/** Product entity matching the Prisma Product model */
export interface Product {
  id: string;
  gtin: string;
  serialNumber: string;
  did: string;
  name: string;
  description: string | null;
  category: string;
  status: ProductStatus;
  brandId: string;
  walletAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Product Passport entity matching the Prisma ProductPassport model */
export interface ProductPassport {
  id: string;
  productId: string;
  digitalLink: string;
  metadata: Record<string, unknown>;
  txHash: string | null;
  tokenAddress: string | null;
  chainId: number | null;
  mintedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
