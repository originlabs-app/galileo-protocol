import { GovernanceHero } from "@/components/governance/GovernanceHero";
import { MissionStatement } from "@/components/governance/MissionStatement";
import { GovernancePillars } from "@/components/governance/GovernancePillars";
import { LifecycleTimeline } from "@/components/governance/LifecycleTimeline";
import { TransparencyCommitment } from "@/components/governance/TransparencyCommitment";
import { QuickLinks } from "@/components/governance/QuickLinks";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Governance",
  description:
    "Explore the Galileo Protocol governance model. A neutral framework enabling competing luxury brands to collaborate on shared authentication infrastructure via the TSC.",
};

export default function GovernancePage() {
  return (
    <main className="ocean-background pt-20">
      <GovernanceHero />
      <MissionStatement />
      <GovernancePillars />
      <LifecycleTimeline />
      <TransparencyCommitment />
      <QuickLinks />
      <Footer />
    </main>
  );
}
