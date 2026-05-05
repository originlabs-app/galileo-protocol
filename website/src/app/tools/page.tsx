import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Developer tools for the Galileo Protocol ecosystem on Base Sepolia.',
  alternates: {
    canonical: '/tools',
  },
};

const tools = [
  {
    href: '/tools/gas-estimator',
    label: 'Gas Estimator',
    description:
      'Estimate gas costs for Galileo smart contract operations on Base Sepolia — compliance steps, token minting, and more.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    href: '/tools/faucet',
    label: 'Testnet Faucet',
    description:
      'Request testnet ETH on Base Sepolia to deploy contracts and test Digital Product Passport workflows without real funds.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
];

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-[rgb(2,4,8)] pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-cyan-400/60 mb-4">Developer</p>
          <h1
            className="text-4xl md:text-5xl font-extralight tracking-[-0.03em] text-white mb-6"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Tools
          </h1>
          <p className="text-lg text-white/50 font-light max-w-xl">
            Utilities for building and testing on the Galileo Protocol ecosystem on Base Sepolia.
          </p>
        </div>

        {/* Tool cards */}
        <div className="flex flex-col gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative flex items-start gap-6 p-8 border border-white/5 hover:border-cyan-400/20 transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.04]"
            >
              {/* Gradient accent on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.03), transparent 60%)' }}
              />

              <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center border border-white/10 group-hover:border-cyan-400/30 transition-colors duration-300 text-white/40 group-hover:text-cyan-400 transition-colors">
                {tool.icon}
              </div>

              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-light text-white group-hover:text-cyan-400 transition-colors duration-300">
                    {tool.label}
                  </h2>
                  <svg
                    className="w-4 h-4 text-white/20 group-hover:text-cyan-400/60 transition-all duration-300 group-hover:translate-x-1"
                    fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <p className="text-sm text-white/40 font-light leading-relaxed">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
