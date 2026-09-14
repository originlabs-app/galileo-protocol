import { pageMetadata } from "@/lib/page-metadata";
import {
  AbysseHero,
  DiscoverSection,
  DescentSection,
  BioluminescentFeatures,
  UseCasesSection,
  TreasureReveal,
} from "@/components/abysse";
import { Footer } from "@/components/layout/Footer";

export const metadata = pageMetadata("/", {
  title: "Open Protocol for Luxury Product Authentication",
  description:
    "Explore an open protocol for luxury product authentication. Inspect identity, provenance and ownership evidence, then review the specifications and integration guides.",
});

export default function Home() {
  return (
    <main className="bg-black">
      {/* Hero: Surface - Sky meets ocean */}
      <AbysseHero />

      {/* Discover: What is Galileo */}
      <DiscoverSection />

      {/* Descent: Interactive scroll journey 0m → 6000m */}
      <DescentSection />

      {/* Features: Bioluminescent capabilities */}
      <BioluminescentFeatures />

      {/* Use Cases: Luxury verticals */}
      <UseCasesSection />

      {/* Treasure: The reveal - Verifiable Evidence */}
      <TreasureReveal />

      {/* Footer: Rise to surface + navigation */}
      <Footer />
    </main>
  );
}
