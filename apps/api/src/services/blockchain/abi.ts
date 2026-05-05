/**
 * Minimal ABI for the GalileoToken contract.
 *
 * Covers:
 *   - Constructor (for deployContract)
 *   - Read-only view functions used by verifyOnChain
 *
 * Constructor signature:
 *   constructor(address admin, address identityRegistry_, address compliance_,
 *               ProductConfig memory config, address initialOwner_)
 *
 * The token (totalSupply=1) is minted to initialOwner_ inside the constructor.
 * No separate mint() call is required.
 */
export const GALILEO_TOKEN_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "admin", type: "address" },
      { name: "identityRegistry_", type: "address" },
      { name: "compliance_", type: "address" },
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "tokenName", type: "string" },
          { name: "tokenSymbol", type: "string" },
          { name: "productDID", type: "string" },
          { name: "productCategory", type: "string" },
          { name: "brandDID", type: "string" },
          { name: "productURI", type: "string" },
          { name: "gtin", type: "string" },
          { name: "serialNumber", type: "string" },
        ],
      },
      { name: "initialOwner_", type: "address" },
    ],
  },
  {
    type: "function",
    name: "productDID",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gtin",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "serialNumber",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "productCategory",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isDecommissioned",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "_userAddress", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * Minimal ABI for the GalileoCompliance contract.
 *
 * Covers:
 *   - Constructor (for deployContract)
 *   - transferOwnership (called before token deploy so compliance.owner() == predictedTokenAddr)
 *   - owner view (for debugging / verification)
 */
export const GALILEO_COMPLIANCE_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "admin_", type: "address" },
      { name: "identityRegistry_", type: "address" },
    ],
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;
