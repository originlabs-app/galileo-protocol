import type { Metadata } from 'next';
import { Faucet } from '@/components/tools/Faucet';

export const metadata: Metadata = {
  title: 'Testnet Faucet',
  description:
    'Request free Base Sepolia ETH to pay for gas when minting Digital Product Passports on the Galileo Protocol testnet.',
  alternates: {
    canonical: '/tools/faucet',
  },
};

export default function FaucetPage() {
  return <Faucet />;
}
