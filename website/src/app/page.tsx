import {
  AbysseHero,
  DiscoverSection,
  DescentSection,
  BioluminescentFeatures,
  UseCasesSection,
  TreasureReveal,
} from "@/components/abysse";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "The Open Standard for Luxury Authentication",
  description:
    "Galileo Protocol is the open standard for luxury product authentication. Blockchain-powered digital product passports to protect brands against counterfeiting.",
};

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
