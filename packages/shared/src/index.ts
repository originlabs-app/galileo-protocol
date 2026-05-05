// Types
export {
  Role,
  type User,
  type UserPublic,
  type UserInternal,
} from "./types/user.js";
export { type Brand } from "./types/brand.js";
export {
  ProductStatus,
  type Product,
  type ProductPassport,
} from "./types/product.js";
export { EventType, type ProductEvent } from "./types/event.js";
export {
  type ApiResponse,
  type ApiErrorResponse,
  type ApiError,
  type PaginatedResponse,
  type AuthTokens,
  type HealthResponse,
  type BlockchainVerification,
} from "./types/api.js";

// Constants
export { ROLES, type RoleKey, type RoleValue } from "./constants/roles.js";
export { CATEGORIES, type Category } from "./constants/categories.js";
export { CATEGORY_VALIDATION_MESSAGE } from "./constants/categories.js";
export {
  COMPLIANCE_DEFAULT_EXPIRY,
  PERMANENT_EXPIRY,
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
  CLAIM_TOPICS,
  type ClaimTopic,
} from "./constants/claim-topics.js";

// Validation
export {
  validateGtin13,
  validateGtin14,
  validateGtin,
  computeGtinCheckDigit,
  padGtin14,
} from "./validation/gtin.js";
export {
  PRODUCT_SERIAL_REGEX,
  canonicalizeProductIdentity,
  parseProductIdentityInput,
  productGtinSchema,
  productIdentitySchema,
  productSerialSchema,
  validateProductIdentity,
  validateProductSerial,
} from "./validation/product-identity.js";
export {
  PRODUCT_PASSPORT_AUTHORING_VERSION,
  productAuthoringDescriptionSchema,
  productAuthoringNameSchema,
  productAuthoringPatchSchema,
  productAuthoringSchema,
  productCategorySchema,
  productMaterialSchema,
  productMaterialsSchema,
  productMediaDescriptorSchema,
  productMediaDescriptorsSchema,
  productMediaKindSchema,
  productPassportAuthoringMetadataSchema,
  productPassportMetadataEnvelopeSchema,
  readProductPassportAuthoringMetadata,
  writeProductPassportAuthoringMetadata,
  type ProductAuthoringInput,
  type ProductAuthoringPatchInput,
  type ProductMaterial,
  type ProductMediaDescriptor,
  type ProductPassportAuthoringMetadata,
  type ProductPassportAuthoringMetadataInput,
} from "./validation/product-authoring.js";
export {
  generateDid,
  generateDigitalLinkUrl,
  validateDid,
} from "./validation/did.js";
export { emailSchema, passwordSchema } from "./validation/auth.js";
export {
  ETHEREUM_ADDRESS_RE,
  LINK_WALLET_MESSAGE_PREFIX,
  buildLinkWalletMessage,
  parseLinkWalletMessage,
} from "./validation/wallet.js";
