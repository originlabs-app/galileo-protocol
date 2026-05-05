import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import healthRoutes from "../src/routes/health.js";

const deployment = {
  environment: "base-sepolia",
  network: "Base Sepolia",
  chainId: 84532,
  status: "planned",
  explorer: {
    name: "Basescan",
    baseUrl: "https://sepolia.basescan.org",
    txPath: "/tx/",
    addressPath: "/address/",
  },
  issuance: {
    model: "per-product-token",
    tokenContract: "GalileoToken",
    description:
      "Infrastructure addresses are canonical. Each product is issued as its own GalileoToken deployment rather than sharing one pilot-wide token address.",
  },
  infrastructure: {
    accessControl: null,
    claimTopicsRegistry: null,
    trustedIssuersRegistry: null,
    identityRegistryStorage: null,
    identityRegistry: null,
    compliance: null,
    brandAuthorizationModule: null,
    cpoCertificationModule: null,
    jurisdictionModule: null,
    sanctionsModule: null,
    serviceCenterModule: null,
  },
};

function createChainState(overrides?: Partial<FastifyInstance["chain"]>) {
  return {
    chainEnabled: false,
    deployment,
    issuance: deployment.issuance,
    explorer: {
      baseUrl: deployment.explorer.baseUrl,
      txUrl: (txHash: string) =>
        `${deployment.explorer.baseUrl}/tx/${txHash}`,
      addressUrl: (address: string) =>
        `${deployment.explorer.baseUrl}/address/${address}`,
    },
    rpcConfigured: false,
    writeCredentialsConfigured: false,
    writeVerificationConfigured: false,
    publicClient: {
      getChainId: async () => deployment.chainId,
      getBalance: async () => 20_000_000_000_000_000n,
    },
    walletClient: undefined,
    ...overrides,
  };
}

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    // Mock prisma decorator (healthy DB)
    app.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    app.decorate("storage", { isCloudStorage: false });
    app.decorate("chain", createChainState());
    await app.register(healthRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with status ok and dependency status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBeDefined();
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.database).toBe("ok");
    expect(body.dependencies.chain).toBe("disabled");
    expect(body.deployment.chainId).toBe(84532);
    expect(body.deployment.writeEnabled).toBe(false);
    expect(body.deployment.writeMode).toBe("read-only");
    expect(body.deployment.wallet).toEqual({
      address: null,
      balanceEth: null,
      minimumBalanceEth: "0.01",
      balanceStatus: "disabled",
    });
    expect(body.dependencies.wallet).toBe("disabled");
  });

  it("returns the correct version from package.json", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    const body = response.json();
    expect(body.version).toBe("0.0.0");
  });

  it("does not require authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    // Should return 200 even without auth headers
    expect(response.statusCode).toBe(200);
  });

  it("returns 503 with degraded status when DB is down", async () => {
    const degradedApp = Fastify();
    // Mock prisma decorator (unhealthy DB)
    degradedApp.decorate("prisma", {
      $queryRawUnsafe: async () => {
        throw new Error("Connection refused");
      },
    });
    degradedApp.decorate("storage", { isCloudStorage: false });
    degradedApp.decorate("chain", createChainState());
    await degradedApp.register(healthRoutes);
    await degradedApp.ready();

    const response = await degradedApp.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.status).toBe("degraded");
    expect(body.dependencies.database).toBe("error");

    await degradedApp.close();
  });

  it("returns canonical Base Sepolia deployment metadata when chain config is present", async () => {
    const chainApp = Fastify();
    chainApp.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    chainApp.decorate("storage", { isCloudStorage: false });
    chainApp.decorate(
      "chain",
      createChainState({
        chainEnabled: true,
        rpcConfigured: true,
        writeCredentialsConfigured: true,
        writeVerificationConfigured: true,
      }),
    );
    await chainApp.register(healthRoutes);
    await chainApp.ready();

    const response = await chainApp.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dependencies.chain).toBe("ok");
    expect(body.deployment).toEqual({
      environment: "base-sepolia",
      network: "Base Sepolia",
      chainId: 84532,
      status: "planned",
      explorer: {
        name: "Basescan",
        baseUrl: "https://sepolia.basescan.org",
        txBaseUrl: "https://sepolia.basescan.org/tx/",
        addressBaseUrl: "https://sepolia.basescan.org/address/",
      },
      issuance: deployment.issuance,
      contracts: {
        accessControl: { address: null, explorerUrl: null },
        claimTopicsRegistry: { address: null, explorerUrl: null },
        trustedIssuersRegistry: { address: null, explorerUrl: null },
        identityRegistryStorage: { address: null, explorerUrl: null },
        identityRegistry: { address: null, explorerUrl: null },
        compliance: { address: null, explorerUrl: null },
        brandAuthorizationModule: { address: null, explorerUrl: null },
        cpoCertificationModule: { address: null, explorerUrl: null },
        jurisdictionModule: { address: null, explorerUrl: null },
        sanctionsModule: { address: null, explorerUrl: null },
        serviceCenterModule: { address: null, explorerUrl: null },
      },
      contractCount: 0,
      rpcConfigured: true,
      writeEnabled: true,
      writeMode: "enabled",
      writeCredentialsConfigured: true,
      basescanConfigured: true,
      wallet: {
        address: null,
        balanceEth: null,
        minimumBalanceEth: "0.01",
        balanceStatus: "disabled",
      },
    });

    await chainApp.close();
  });

  it("reports chain status as ok when chain is enabled and responsive", async () => {
    const chainApp = Fastify();
    chainApp.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    chainApp.decorate("storage", { isCloudStorage: false });
    chainApp.decorate("chain", createChainState({
      chainEnabled: true,
      publicClient: {
        getChainId: async () => 84532,
      },
    }));
    await chainApp.register(healthRoutes);
    await chainApp.ready();

    const response = await chainApp.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dependencies.chain).toBe("ok");

    await chainApp.close();
  });

  it("reports wallet balance status when chain writes are enabled", async () => {
    const chainApp = Fastify();
    chainApp.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    chainApp.decorate("storage", { isCloudStorage: false });
    chainApp.decorate("chain", createChainState({
      chainEnabled: true,
      publicClient: {
        getChainId: async () => 84532,
        getBalance: async () => 15_000_000_000_000_000n,
      },
      walletClient: {
        account: {
          address: "0x313e107daA12c7c1867a7002744EaC15B2109D42",
        },
      },
    }));
    await chainApp.register(healthRoutes);
    await chainApp.ready();

    const response = await chainApp.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dependencies.wallet).toBe("ok");
    expect(body.deployment.wallet).toEqual({
      address: "0x313e107daA12c7c1867a7002744EaC15B2109D42",
      balanceEth: "0.015",
      minimumBalanceEth: "0.01",
      balanceStatus: "ok",
    });

    await chainApp.close();
  });

  it("reports low wallet balance without exposing credentials", async () => {
    const chainApp = Fastify();
    chainApp.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    chainApp.decorate("storage", { isCloudStorage: false });
    chainApp.decorate("chain", createChainState({
      chainEnabled: true,
      publicClient: {
        getChainId: async () => 84532,
        getBalance: async () => 5_000_000_000_000_000n,
      },
      walletClient: {
        account: {
          address: "0x313e107daA12c7c1867a7002744EaC15B2109D42",
        },
      },
    }));
    await chainApp.register(healthRoutes);
    await chainApp.ready();

    const response = await chainApp.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.dependencies.wallet).toBe("low_balance");
    expect(body.deployment.wallet).toEqual({
      address: "0x313e107daA12c7c1867a7002744EaC15B2109D42",
      balanceEth: "0.005",
      minimumBalanceEth: "0.01",
      balanceStatus: "low_balance",
    });
    expect(JSON.stringify(body)).not.toMatch(/mnemonic|privateKey|secret/i);

    await chainApp.close();
  });

  it("reports chain status as error when chain is enabled but unresponsive", async () => {
    const chainApp = Fastify();
    chainApp.decorate("prisma", {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
    });
    chainApp.decorate("storage", { isCloudStorage: false });
    chainApp.decorate("chain", createChainState({
      chainEnabled: true,
      publicClient: {
        getChainId: async () => {
          throw new Error("RPC timeout");
        },
      },
    }));
    await chainApp.register(healthRoutes);
    await chainApp.ready();

    const response = await chainApp.inject({
      method: "GET",
      url: "/health",
    });

    // DB is ok, chain error doesn't degrade overall status
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.dependencies.chain).toBe("error");

    await chainApp.close();
  });
});
