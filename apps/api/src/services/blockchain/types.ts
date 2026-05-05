/**
 * TypeScript types for blockchain interactions with the Galileo Protocol.
 * Each product mint deploys a new GalileoToken contract on Base Sepolia.
 */

/** Parameters required to deploy a GalileoToken contract for one product. */
export interface MintParams {
  /** Address that receives DEFAULT_ADMIN_ROLE and REGISTRY_ADMIN_ROLE */
  admin: `0x${string}`;
  /** Deployed IdentityRegistry contract address */
  identityRegistry: `0x${string}`;
  /** Product DID: did:galileo:01:{gtin}:21:{serialNumber} */
  productDID: string;
  /** Product category string (e.g. "Watches") */
  productCategory: string;
  /** Brand DID (did:galileo:brand:{identifier}) */
  brandDID: string;
  /** URI to off-chain product metadata (the GS1 Digital Link) */
  productURI: string;
  /** 14-digit GS1 GTIN */
  gtin: string;
  /** Product serial number */
  serialNumber: string;
  /** Address that receives the single minted token */
  initialOwner: `0x${string}`;
}

/** Result returned by a successful mint / deployment. */
export interface MintResult {
  /** GalileoToken deployment transaction hash */
  txHash: `0x${string}`;
  /** Deployed GalileoToken contract address (becomes the on-chain token ID) */
  tokenAddress: `0x${string}`;
  /** Deployed GalileoCompliance contract address (per-product, bound to tokenAddress) */
  complianceAddress: `0x${string}`;
  /** Chain ID where the token was deployed (84532 = Base Sepolia) */
  chainId: number;
}

/** Result returned by an on-chain verification read. */
export interface VerifyResult {
  /** Whether the contract was found and readable on-chain */
  found: boolean;
  /** Contract address that was queried */
  tokenAddress?: `0x${string}`;
  /** Product DID stored in the contract */
  productDID?: string;
  /** GTIN stored in the contract */
  gtin?: string;
  /** Serial number stored in the contract */
  serialNumber?: string;
  /** Product category stored in the contract */
  productCategory?: string;
  /** Whether the token has been decommissioned on-chain */
  isDecommissioned?: boolean;
}
