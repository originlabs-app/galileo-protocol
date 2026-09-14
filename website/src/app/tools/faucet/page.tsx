import { pageMetadata } from "@/lib/page-metadata";
import type { Metadata } from 'next';
import { Faucet } from '@/components/tools/Faucet';

export const metadata: Metadata = pageMetadata("/tools/faucet", {
  title: 'Testnet Faucet',
  description:
    'Request free Base Sepolia ETH to pay for gas when minting Digital Product Passports on the Galileo Protocol testnet.',
});

export default function FaucetPage() {
  return <Faucet />;
}
