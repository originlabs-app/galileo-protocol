import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

export const walletChain = baseSepolia;

export const walletConfig = createConfig({
  chains: [walletChain],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: "Galileo Protocol",
      preference: "all", // Support both EOA (Coinbase Wallet) and Smart Wallet
    }),
  ],
  ssr: true,
  transports: {
    [walletChain.id]: http(),
  },
});

export function formatWalletAddress(address?: string) {
  if (!address) {
    return "No wallet";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
