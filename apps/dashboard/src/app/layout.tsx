import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import "@coinbase/onchainkit/styles.css";
import { AuthProvider } from "@/hooks/use-auth";
import { WalletProvider } from "@/components/providers/wallet-provider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Galileo Dashboard",
  description: "Galileo Protocol — Luxury product authentication dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${cormorant.variable} ${outfit.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <WalletProvider>{children}</WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
