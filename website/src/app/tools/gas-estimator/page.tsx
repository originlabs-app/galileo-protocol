import type { Metadata } from 'next';
import { GasEstimator } from '@/components/tools/GasEstimator';

export const metadata: Metadata = {
  title: 'Gas Estimator',
  description:
    'Real-time gas cost estimates for Galileo Protocol operations on Base Sepolia — token minting, token transfer, and identity registration.',
  alternates: {
    canonical: '/tools/gas-estimator',
  },
};

export default function GasEstimatorPage() {
  return <GasEstimator />;
}
