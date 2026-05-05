/**
 * Galileo claim topic constants mirroring the on-chain GalileoClaimTopics library.
 *
 * Each topic ID is the keccak256 hash of its namespace string.
 * Reference: GSPEC-IDENTITY-004 — Galileo Claim Topics Specification
 *
 * @module constants/claim-topics
 */

/** Default expiry for compliance topics (365 days in seconds) */
export const COMPLIANCE_DEFAULT_EXPIRY = 365 * 24 * 60 * 60;

/** Permanent expiry value (no expiration) */
export const PERMANENT_EXPIRY = 0;

// ─── Compliance Topics (KYC / KYB) ──────────────────────────────────────────

export const KYC_BASIC = {
  namespace: "galileo.kyc.basic",
  topicId:
    "0xd89b93fafd03b627c912eb1e18654cf100b9b5aad98e9b4f189134ae5581c2f0",
  description: "Basic individual identity verification",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const KYC_ENHANCED = {
  namespace: "galileo.kyc.enhanced",
  topicId:
    "0xa1fecd52420478a3ef25e8f4e37d4f2dfdaec920e48457f40fc2e2839462216e",
  description: "Enhanced identity verification with additional checks",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const KYB_VERIFIED = {
  namespace: "galileo.kyb.verified",
  topicId:
    "0x1dd5129846e72f7ee2dade96e3dcd50954f280b8f76579868e4721b5c8c69c56",
  description: "Business entity verification",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

// ─── Jurisdiction-Specific Topics ────────────────────────────────────────────

export const KYC_EU_MIFID = {
  namespace: "galileo.kyc.eu.mifid",
  topicId:
    "0xdef3dcc6fc6fe64114e865ad812264af037f0d3a36cb446920d32ace7ee3bdbc",
  description: "EU MiFID II compliant KYC",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const KYC_US_SEC = {
  namespace: "galileo.kyc.us.sec",
  topicId:
    "0x2a04959391be0b39934421c3fc7eb5559602ff59b49d93ae63a7741f0c5ce5ac",
  description: "US SEC/FinCEN compliant KYC",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const KYC_APAC_SG = {
  namespace: "galileo.kyc.apac.sg",
  topicId:
    "0x15a365872e74a520ca7755fae1160f13ab5209d51e117a5555c669c9cc7648e4",
  description: "Singapore MAS compliant KYC",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

// ─── Luxury-Specific Topics ─────────────────────────────────────────────────

export const AUTHORIZED_RETAILER = {
  namespace: "galileoprotocol.io.authorized_retailer",
  topicId:
    "0xfc1ed2540d1f8160d9b67d6e66b3e918d6029031f419be09f5e5865c2a74c75a",
  description: "Authorized retailer certification",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const SERVICE_CENTER = {
  namespace: "galileoprotocol.io.service_center",
  topicId:
    "0x10830870ec631edcb6878ba73b73764c94401f5fd6d4b09e57afb7b1ac948ff2",
  description: "Authorized service center certification",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const AUTHENTICATOR = {
  namespace: "galileoprotocol.io.authenticator",
  topicId:
    "0xda684ab89dbe929e1da9afb6a82d42762bb88db87f85e2041b5a2867ec6a6767",
  description: "Third-party authenticator certification",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

export const AUCTION_HOUSE = {
  namespace: "galileoprotocol.io.auction_house",
  topicId:
    "0x4c471013436dbf8b498b1c5c007748f97d055151ff587e3c94de8738376aaf7d",
  description: "Authorized auction house certification",
  defaultExpiry: COMPLIANCE_DEFAULT_EXPIRY,
  isCompliance: true,
} as const;

// ─── Heritage Topics (Permanent until revoked) ──────────────────────────────

export const ORIGIN_CERTIFIED = {
  namespace: "galileo.heritage.origin_certified",
  topicId:
    "0x1e1c32d6fc1988653c0708c2e488cfef18382e584dbad1834629ffaba627b427",
  description: "Certified origin claim",
  defaultExpiry: PERMANENT_EXPIRY,
  isCompliance: false,
} as const;

export const AUTHENTICITY_VERIFIED = {
  namespace: "galileo.heritage.authenticity_verified",
  topicId:
    "0x4fc95faf30f177afc2bdb8d67630d7d32f38116d3ed16938544efcee5cc52ed2",
  description: "Authenticity verification claim",
  defaultExpiry: PERMANENT_EXPIRY,
  isCompliance: false,
} as const;

/** All 12 initial Galileo claim topics */
export const CLAIM_TOPICS = [
  KYC_BASIC,
  KYC_ENHANCED,
  KYB_VERIFIED,
  KYC_EU_MIFID,
  KYC_US_SEC,
  KYC_APAC_SG,
  AUTHORIZED_RETAILER,
  SERVICE_CENTER,
  AUTHENTICATOR,
  AUCTION_HOUSE,
  ORIGIN_CERTIFIED,
  AUTHENTICITY_VERIFIED,
] as const;

export type ClaimTopic = (typeof CLAIM_TOPICS)[number];
