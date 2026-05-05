import { TSCHero } from '@/components/governance/TSCHero';
import { CouncilSeats } from '@/components/governance/CouncilSeats';
import { SeatTypes } from '@/components/governance/SeatTypes';
import { ElectionTimeline } from '@/components/governance/ElectionTimeline';
import { ResponsibilitiesGrid } from '@/components/governance/ResponsibilitiesGrid';
import { VetoCallout } from '@/components/governance/VetoCallout';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Technical Steering Committee | Galileo Luxury Standard',
  description: 'The TSC is the meritocratic council that holds final authority over technical decisions for the Galileo Luxury Standard. Learn about seat composition, elections, and responsibilities.',
};

export default function TSCPage() {
  return (
    <main className="ocean-background pt-20">
      <TSCHero />
      <CouncilSeats />
      <SeatTypes />
      <ElectionTimeline />
      <ResponsibilitiesGrid />
      <VetoCallout />
      <Footer />
    </main>
  );
}
