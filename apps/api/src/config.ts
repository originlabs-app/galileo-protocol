import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

function isUrlList(value: string) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .every((origin) => {
      try {
        new URL(origin);
        return true;
      } catch {
        return false;
      }
    });
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z
    .string()
    .min(32, "COOKIE_SECRET must be at least 32 characters")
    .optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  ENABLE_SWAGGER: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.string().url().optional(),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .refine(isUrlList, {
      message: "CORS_ORIGIN must be a URL or comma-separated list of URLs",
    }),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
  BASE_SEPOLIA_RPC: z.string().url().optional(),
  MINTING_MNEMONIC: z.string().min(1).optional(),
  MINTING_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "MINTING_PRIVATE_KEY must be a 32-byte hex string")
    .optional(),
  DEPLOYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "DEPLOYER_PRIVATE_KEY must be a 32-byte hex string")
    .optional(),
  BASESCAN_API_KEY: z.string().min(1).optional(),
});

const deploymentManifestSchema = z.object({
  environment: z.literal("base-sepolia"),
  network: z.string().min(1),
  chainId: z.number().int().positive(),
  status: z.enum(["planned", "deployed"]),
  rpc: z.object({
    envVar: z.literal("BASE_SEPOLIA_RPC_URL"),
  }),
  explorer: z.object({
    name: z.string().min(1),
    baseUrl: z.string().url(),
    txPath: z.string().min(1),
    addressPath: z.string().min(1),
  }),
  issuance: z.object({
    model: z.literal("per-product-token"),
    tokenContract: z.literal("GalileoToken"),
    description: z.string().min(1),
  }),
  infrastructure: z.object({
    accessControl: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    claimTopicsRegistry: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    trustedIssuersRegistry: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    identityRegistryStorage: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    identityRegistry: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    compliance: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    brandAuthorizationModule: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    cpoCertificationModule: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    jurisdictionModule: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    sanctionsModule: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
    serviceCenterModule: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
  }),
});

function loadBaseSepoliaDeployment() {
  const manifestPath = fileURLToPath(
    new URL("../../../contracts/deployments/base-sepolia.json", import.meta.url),
  );
  const manifestText = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText) as unknown;

  return deploymentManifestSchema.parse(manifest);
}

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(formatted, null, 2),
    );
    throw new Error(
      "Invalid environment configuration. Check the errors above.",
    );
  }

  const env = result.data;
  const deployment = loadBaseSepoliaDeployment();
  const rpcUrl = env.BASE_SEPOLIA_RPC_URL ?? env.BASE_SEPOLIA_RPC;
  const writeCredential =
    env.MINTING_MNEMONIC ??
    env.MINTING_PRIVATE_KEY ??
    env.DEPLOYER_PRIVATE_KEY;
  const writeEnabled = Boolean(rpcUrl && writeCredential);

  return {
    ...env,
    chain: {
      deployment,
      rpcUrl,
      rpcConfigured: Boolean(rpcUrl),
      writeEnabled,
      writeCredentialsConfigured: Boolean(writeCredential),
      verificationApiKeyConfigured: Boolean(env.BASESCAN_API_KEY),
      explorer: {
        ...deployment.explorer,
        txUrl: (txHash: string) =>
          `${deployment.explorer.baseUrl}${deployment.explorer.txPath}${txHash}`,
        addressUrl: (address: string) =>
          `${deployment.explorer.baseUrl}${deployment.explorer.addressPath}${address}`,
      },
    },
  };
}

export type EnvConfig = z.infer<typeof envSchema>;
export type BaseSepoliaDeployment = z.infer<typeof deploymentManifestSchema>;
export type Config = ReturnType<typeof loadConfig>;
export const config = loadConfig();
