/** Generic API success response wrapper */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** API error response */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/** Structured API error */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Auth tokens response */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Health check response */
export interface HealthResponse {
  status: "ok";
  version: string;
  uptime: number;
}

/** Blockchain verification result attached to resolver responses */
export interface BlockchainVerification {
  /** Whether on-chain data is consistent with DB (product ACTIVE + minted + found on-chain) */
  verified: boolean;
  /** Minting transaction hash */
  txHash: string;
  /** On-chain token identifier (contract address / token address) */
  tokenId: string | null;
  /** Human-readable chain name, e.g. "Base Sepolia" or "Base" */
  chain: string;
  /** Direct link to the transaction on a block explorer */
  explorerUrl: string;
  /** Product DID read directly from the on-chain contract */
  onChainDID?: string | null;
  /** GTIN read directly from the on-chain contract */
  onChainGtin?: string | null;
  /** Serial number read directly from the on-chain contract */
  onChainSerial?: string | null;
  /** Product category read directly from the on-chain contract */
  onChainCategory?: string | null;
  /** Whether the token has been decommissioned on-chain */
  isDecommissioned?: boolean;
}
