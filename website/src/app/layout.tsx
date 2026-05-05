import type { Metadata } from "next";
import {
  Outfit,
  Inter,
  Cormorant_Garamond,
  JetBrains_Mono,
} from "next/font/google";
import { Navigation } from "@/components/layout/Navigation";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import "./globals.css";

// Swiss-Luxe Typography Stack
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-satoshi", // Satoshi proxy until we add local font
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.galileoprotocol.io"),
  title: {
    default: "Galileo Protocol | The Open Standard for Luxury Authentication",
    template: "%s | Galileo Protocol",
  },
  description:
    "Galileo Protocol is the open standard for luxury product authentication and provenance, leveraging blockchain technology to protect brands and consumers.",
  keywords: [
    "luxury authentication",
    "blockchain",
    "open standard",
    "provenance",
    "digital product passport",
    "luxury brands",
    "anti-counterfeiting",
    "NFT",
    "supply chain transparency",
    "product verification",
  ],
  authors: [{ name: "Galileo Protocol" }],
  creator: "Galileo Protocol",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Galileo Protocol | The Open Standard for Luxury Authentication",
    description:
      "Galileo Protocol is the open standard for luxury product authentication and provenance, leveraging blockchain technology to protect brands and consumers.",
    url: "https://www.galileoprotocol.io",
    siteName: "Galileo Protocol",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Galileo Protocol | The Open Standard for Luxury Authentication",
    description:
      "Galileo Protocol is the open standard for luxury product authentication and provenance, leveraging blockchain technology to protect brands and consumers.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <OrganizationJsonLd />
        <Navigation />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
