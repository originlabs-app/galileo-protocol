"use client";

import { Avatar, Identity, Name } from "@coinbase/onchainkit/identity";
import { AlertCircle, Link2, LoaderCircle, LogOut, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { buildLinkWalletMessage } from "@galileo/shared";
import { api, ApiError } from "@/lib/api";
import { walletChain } from "@/lib/wallet";

function resolveErrorMessage(message?: string) {
  if (!message) {
    return null;
  }

  if (message.toLowerCase().includes("provider")) {
    return "Install a browser wallet to connect.";
  }

  return message;
}

export function WalletConnection() {
  const { user, refreshUser } = useAuth();
  const { address, chain, chainId, connector, isConnected } = useAccount();
  const connectors = useConnectors();
  const browserWalletConnector = useMemo(
    () =>
      connectors.find((item) => item.id === "injected") ??
      connectors.find((item) => item.type === "injected") ??
      connectors[0],
    [connectors],
  );
  const {
    connect,
    error: connectError,
    isPending: isConnecting,
  } = useConnect();
  const {
    disconnect,
    error: disconnectError,
    isPending: isDisconnecting,
  } = useDisconnect();
  const {
    switchChain,
    error: switchChainError,
    isPending: isSwitchingChain,
  } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Clear stale link error when wallet connection state changes
  useEffect(() => {
    setLinkError(null);
  }, [isConnected, address]);

  const isWrongChain = isConnected && chainId !== walletChain.id;
  const isAlreadyLinked =
    isConnected &&
    address &&
    user?.walletAddress?.toLowerCase() === address.toLowerCase();

  const errorMessage =
    linkError ??
    resolveErrorMessage(
      connectError?.message ??
        switchChainError?.message ??
        disconnectError?.message,
    );

  async function handleLinkWallet() {
    if (!address || !user?.email) return;

    setIsLinking(true);
    setLinkError(null);
    try {
      // Step 1: Fetch a one-time nonce from the server
      const nonceRes = await api<{
        success: boolean;
        data: { nonce: string };
      }>("/auth/nonce");
      const { nonce } = nonceRes.data;

      // Step 2: Build message with nonce + timestamp
      const timestamp = Date.now();
      const message = buildLinkWalletMessage(user.email, nonce, timestamp);
      const signature = await signMessageAsync({ message });

      // Step 3: Submit to link-wallet endpoint
      await api("/auth/link-wallet", {
        method: "POST",
        body: JSON.stringify({ address, signature, message }),
      });

      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError) {
        setLinkError(err.message);
      } else if (err instanceof Error) {
        setLinkError(err.message);
      } else {
        setLinkError("Failed to link wallet");
      }
    } finally {
      setIsLinking(false);
    }
  }

  if (!browserWalletConnector) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-3">
        <Button
          className="min-w-36"
          onClick={() =>
            connect({
              chainId: walletChain.id,
              connector: browserWalletConnector,
            })
          }
          disabled={isConnecting}
        >
          {isConnecting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Wallet />
          )}
          {isConnecting ? "Connecting..." : "Connect wallet"}
        </Button>
        {errorMessage ? (
          <span className="hidden items-center gap-1 text-xs text-destructive lg:inline-flex">
            <AlertCircle className="size-3.5" />
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 md:flex">
        <Badge variant={isWrongChain ? "destructive" : "secondary"}>
          {isWrongChain ? "Wrong network" : (chain?.name ?? walletChain.name)}
        </Badge>
        <Identity address={address} className="flex items-center gap-1.5">
          <Avatar className="size-5" />
          <Name className="text-sm text-foreground" />
        </Identity>
        <span className="text-xs text-muted-foreground">
          {connector?.name ?? "Browser wallet"}
        </span>
        {isAlreadyLinked ? (
          <Badge
            variant="outline"
            className="text-[#00FF88] border-[#00FF88]/30"
          >
            Linked
          </Badge>
        ) : null}
      </div>

      {isWrongChain ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => switchChain({ chainId: walletChain.id })}
          disabled={isSwitchingChain}
        >
          {isSwitchingChain ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <AlertCircle />
          )}
          {isSwitchingChain ? "Switching..." : `Switch to ${walletChain.name}`}
        </Button>
      ) : null}

      {!isWrongChain && !isAlreadyLinked ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleLinkWallet}
          disabled={isLinking}
        >
          {isLinking ? <LoaderCircle className="animate-spin" /> : <Link2 />}
          {isLinking ? "Linking..." : "Link"}
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="outline"
        onClick={() => disconnect()}
        disabled={isDisconnecting}
      >
        {isDisconnecting ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <LogOut />
        )}
        {isDisconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>

      {errorMessage ? (
        <span className="hidden items-center gap-1 text-xs text-destructive lg:inline-flex">
          <AlertCircle className="size-3.5" />
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
