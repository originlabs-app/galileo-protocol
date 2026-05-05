import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChainClient = any;

type ExplorerLinks = {
  baseUrl: string;
  txUrl: (txHash: string) => string;
  addressUrl: (address: string) => string;
};

declare module "fastify" {
  interface FastifyInstance {
    chain: {
      chainEnabled: boolean;
      publicClient: ChainClient;
      walletClient?: ChainClient;
      deployment: typeof config.chain.deployment;
      issuance: typeof config.chain.deployment.issuance;
      explorer: ExplorerLinks;
      rpcConfigured: boolean;
      writeCredentialsConfigured: boolean;
      writeVerificationConfigured: boolean;
    };
  }
}

export default fp(async (fastify: FastifyInstance) => {
  // Always import viem for publicClient (needed for ERC-1271 verification)
  const { createPublicClient, createWalletClient, http } = await import("viem");
  const { baseSepolia } = await import("viem/chains");

  // Always create a publicClient for read-only operations (ERC-1271 verification)
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: config.chain.rpcUrl ? http(config.chain.rpcUrl) : http(),
  });

  if (!config.chain.writeEnabled) {
    fastify.log.warn(
      "Chain write features disabled (missing Base Sepolia RPC URL or minting credential). Read-only publicClient remains available.",
    );
    fastify.decorate("chain", {
      chainEnabled: false,
      publicClient,
      deployment: config.chain.deployment,
      issuance: config.chain.deployment.issuance,
      explorer: config.chain.explorer,
      rpcConfigured: config.chain.rpcConfigured,
      writeCredentialsConfigured: config.chain.writeCredentialsConfigured,
      writeVerificationConfigured: config.chain.verificationApiKeyConfigured,
    });
    return;
  }

  const { mnemonicToAccount, privateKeyToAccount } = await import(
    "viem/accounts"
  );
  const privateKey =
    config.MINTING_PRIVATE_KEY ?? config.DEPLOYER_PRIVATE_KEY;
  const account = config.MINTING_MNEMONIC
    ? mnemonicToAccount(config.MINTING_MNEMONIC)
    : privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.chain.rpcUrl),
  });

  fastify.decorate("chain", {
    chainEnabled: true,
    publicClient,
    walletClient,
    deployment: config.chain.deployment,
    issuance: config.chain.deployment.issuance,
    explorer: config.chain.explorer,
    rpcConfigured: config.chain.rpcConfigured,
    writeCredentialsConfigured: config.chain.writeCredentialsConfigured,
    writeVerificationConfigured: config.chain.verificationApiKeyConfigured,
  });
});
