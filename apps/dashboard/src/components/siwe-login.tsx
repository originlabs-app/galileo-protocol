"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import type { Address } from "viem";
import { API_URL } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type SiweState = "idle" | "connecting" | "signing" | "verifying" | "error";
type ConnectorType = "injected" | "coinbase";

declare global {
  interface Window {
    galileoSignSiweMessage: (message: string) => Promise<string> | string;
    __GALILEO_E2E_SIWE__?: {
      connect: (connector: ConnectorType) => Promise<Address> | Address;
      signMessage: (message: string) => Promise<string> | string;
    };
  }
}

function buildSiweMessage(params: {
  domain: string;
  address: string;
  nonce: string;
  chainId: number;
  uri: string;
}): string {
  const issuedAt = new Date().toISOString();
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    "",
    "Sign in to Galileo Protocol",
    "",
    `URI: ${params.uri}`,
    `Version: 1`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export function SiweLogin() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<SiweState>("idle");
  const [activeConnector, setActiveConnector] = useState<ConnectorType | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSiweLogin(connectorType: ConnectorType) {
    setState("connecting");
    setActiveConnector(connectorType);
    setErrorMessage(null);

    try {
      const e2eSiwe = window.__GALILEO_E2E_SIWE__;

      // Step 1: Connect wallet with selected connector
      let walletAddress = address;
      if (e2eSiwe) {
        walletAddress = await e2eSiwe.connect(connectorType);
      } else if (!isConnected || !walletAddress) {
        const connector =
          connectorType === "coinbase"
            ? coinbaseWallet({ appName: "Galileo Protocol", preference: "all" })
            : injected();
        const result = await connectAsync({ connector });
        walletAddress = result.accounts[0];
      }

      if (!walletAddress) {
        throw new Error("Could not connect wallet");
      }

      // Step 2: Fetch nonce from API
      setState("signing");
      const nonceRes = await fetch(`${API_URL}/auth/siwe/nonce`, {
        credentials: "include",
      });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const nonceData = await nonceRes.json();
      const nonce = nonceData.data.nonce;

      // Step 3: Build and sign SIWE message
      const domain = window.location.host;
      const uri = window.location.origin;
      const message = buildSiweMessage({
        domain,
        address: walletAddress,
        nonce,
        chainId: 84532, // Base Sepolia
        uri,
      });

      const signature = e2eSiwe
        ? await e2eSiwe.signMessage(message)
        : await signMessageAsync({ message });

      // Step 4: Verify with API
      setState("verifying");
      const verifyRes = await fetch(`${API_URL}/auth/siwe/verify`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Galileo-Client": "dashboard",
        },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        if (data.error?.code === "WALLET_NOT_LINKED") {
          throw new Error(
            "No account linked to this wallet. Login with email first and link your wallet.",
          );
        }
        throw new Error(data.error?.message ?? "SIWE verification failed");
      }

      // Rehydrate auth state from the server-authoritative profile contract.
      await refreshUser();
      router.push("/dashboard/setup");
    } catch (err) {
      setState("error");
      setActiveConnector(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Wallet login failed",
      );
    }
  }

  const isLoading =
    state === "connecting" || state === "signing" || state === "verifying";

  function getButtonLabel(
    connectorType: ConnectorType,
    defaultLabel: string,
  ): string {
    if (activeConnector !== connectorType) return defaultLabel;
    if (state === "connecting") return "Connecting wallet...";
    if (state === "signing") return "Sign the message...";
    if (state === "verifying") return "Verifying...";
    return defaultLabel;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full border-cyan-200/20 bg-[rgba(135,206,235,0.04)] hover:bg-[rgba(0,255,255,0.10)]"
        size="lg"
        disabled={isLoading}
        onClick={() => handleSiweLogin("injected")}
      >
        <Wallet className="mr-2 size-4" />
        {getButtonLabel("injected", "Sign in with Wallet")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full border-cyan-200/20 bg-[rgba(135,206,235,0.04)] hover:bg-[rgba(0,255,255,0.10)]"
        size="lg"
        disabled={isLoading}
        onClick={() => handleSiweLogin("coinbase")}
      >
        <svg
          className="mr-2 size-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.14-7-7 3.14-7 7-7zm-2.5 4.5a1 1 0 100 2h5a1 1 0 100-2h-5zm0 3a1 1 0 100 2h5a1 1 0 100-2h-5z" />
        </svg>
        {getButtonLabel("coinbase", "Sign in with Coinbase")}
      </Button>
      {errorMessage && (
        <p className="text-center text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
