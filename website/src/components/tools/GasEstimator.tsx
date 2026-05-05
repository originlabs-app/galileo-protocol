'use client';

import { useState, useEffect, useCallback } from 'react';
import { Footer } from '@/components/layout/Footer';

const OPERATIONS = [
  {
    id: 'token-minting',
    label: 'Token Minting',
    description: '3 transactions: compliance deploy + transferOwnership + token deploy',
    steps: [
      { name: 'Compliance Deploy', gasUnits: 1_500_000 },
      { name: 'Transfer Ownership', gasUnits: 50_000 },
      { name: 'Token Deploy', gasUnits: 2_000_000 },
    ],
    accentColor: '#00FFFF',
    accentGlow: 'rgba(0,255,255,0.15)',
  },
  {
    id: 'token-transfer',
    label: 'Token Transfer',
    description: 'ERC-3643 compliant transfer with on-chain identity verification',
    steps: [
      { name: 'Transfer', gasUnits: 150_000 },
    ],
    accentColor: '#00FF88',
    accentGlow: 'rgba(0,255,136,0.15)',
  },
  {
    id: 'identity-registration',
    label: 'Identity Registration',
    description: 'OnchainID contract deployment for product identity',
    steps: [
      { name: 'Identity Deploy', gasUnits: 300_000 },
    ],
    accentColor: '#4488FF',
    accentGlow: 'rgba(68,136,255,0.15)',
  },
] as const;

const RPC_URL = 'https://sepolia.base.org';
const CHAIN_ID = 84532;
const REFRESH_INTERVAL_MS = 30_000;

interface GasData {
  gasPriceWei: bigint;
  ethPriceUsd: number;
  timestamp: Date;
}

function toGwei(wei: bigint): string {
  return (Number(wei) / 1e9).toFixed(4);
}

function costEth(totalGas: number, gasPriceWei: bigint): string {
  return ((totalGas * Number(gasPriceWei)) / 1e18).toFixed(6);
}

function costUsd(totalGas: number, gasPriceWei: bigint, ethUsd: number): string {
  const eth = (totalGas * Number(gasPriceWei)) / 1e18;
  return (eth * ethUsd).toFixed(4);
}

export function GasEstimator() {
  const [gasData, setGasData] = useState<GasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);

  const fetchData = useCallback(async () => {
    try {
      const [rpcResult, priceResult] = await Promise.allSettled([
        fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
        }).then((r) => r.json()),
        fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        ).then((r) => r.json()),
      ]);

      const gasPriceWei =
        rpcResult.status === 'fulfilled' && rpcResult.value?.result
          ? BigInt(rpcResult.value.result)
          : BigInt(0);

      const ethPriceUsd =
        priceResult.status === 'fulfilled'
          ? (priceResult.value?.ethereum?.usd ?? 2500)
          : 2500;

      setGasData({ gasPriceWei, ethPriceUsd, timestamp: new Date() });
      setError(null);
    } catch {
      setError('Failed to fetch gas data. Retrying…');
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL_MS / 1000 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#000810' }}>
      {/* Hero header */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Live badge */}
          <div className="flex justify-center mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs tracking-widest uppercase"
              style={{
                background: 'rgba(0,255,255,0.06)',
                border: '1px solid rgba(0,255,255,0.2)',
                color: '#00FFFF',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#00FF88', boxShadow: '0 0 6px #00FF88' }}
              />
              Live · Base Sepolia · Chain {CHAIN_ID}
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-extralight text-center text-white mb-4"
            style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}
          >
            Gas Estimator
          </h1>
          <p className="text-center text-white/50 text-lg max-w-xl mx-auto">
            Real-time gas cost estimates for Galileo Protocol operations on Base Sepolia.
          </p>

          {/* Stats row */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8">
            {loading && !gasData ? (
              <div className="text-white/30 text-sm animate-pulse">Fetching gas prices…</div>
            ) : error && !gasData ? (
              <div className="text-red-400/70 text-sm">{error}</div>
            ) : gasData ? (
              <>
                <Stat
                  label="Gas Price"
                  value={toGwei(gasData.gasPriceWei)}
                  unit="Gwei"
                  color="#00FFFF"
                />
                <Divider />
                <Stat
                  label="ETH Price"
                  value={`$${gasData.ethPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  unit="USD"
                  color="#00FF88"
                />
                <Divider />
                <Stat
                  label="Refresh in"
                  value={String(countdown)}
                  unit="s"
                  color="rgba(255,255,255,0.6)"
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Operations grid */}
      <section className="px-6 pb-24">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {OPERATIONS.map((op) => {
              const totalGas = op.steps.reduce((acc, s) => acc + s.gasUnits, 0);
              return (
                <div
                  key={op.id}
                  className="relative overflow-hidden p-7 flex flex-col"
                  style={{
                    background: 'rgba(2,16,32,0.9)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Top accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${op.accentColor}70, transparent)`,
                    }}
                  />

                  {/* Title */}
                  <h3
                    className="text-xl font-light text-white mb-1.5"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {op.label}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed mb-6">
                    {op.description}
                  </p>

                  {/* Step breakdown */}
                  <div className="space-y-2.5 mb-6 flex-1">
                    {op.steps.map((step) => (
                      <div key={step.name} className="flex items-center justify-between">
                        <span className="text-xs text-white/50">{step.name}</span>
                        <span
                          className="text-xs font-mono"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {step.gasUnits.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {op.steps.length > 1 && (
                      <>
                        <div
                          className="h-[1px] mt-1"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/30">Total gas</span>
                          <span
                            className="text-xs font-mono"
                            style={{ color: op.accentColor, opacity: 0.7 }}
                          >
                            {totalGas.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cost estimate */}
                  <div
                    className="h-[1px] mb-5"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                  <div className="text-xs text-white/30 uppercase tracking-widest mb-3">
                    Estimated Cost
                  </div>
                  {gasData ? (
                    <div>
                      <div
                        className="text-2xl font-light tabular-nums"
                        style={{ color: op.accentColor }}
                      >
                        {costEth(totalGas, gasData.gasPriceWei)}
                        <span className="text-sm text-white/40 ml-1.5">ETH</span>
                      </div>
                      <div className="text-sm text-white/35 mt-1">
                        ≈ ${costUsd(totalGas, gasData.gasPriceWei, gasData.ethPriceUsd)} USD
                      </div>
                    </div>
                  ) : (
                    <div
                      className="h-10 animate-pulse rounded"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-10 text-center space-y-1.5">
            <p className="text-xs text-white/25 max-w-lg mx-auto leading-relaxed">
              Gas units are approximate estimates based on typical Galileo contract interactions.
              Actual costs may vary with network congestion and contract state.
              ETH price sourced from CoinGecko.
            </p>
            {gasData && (
              <p className="text-xs text-white/20">
                Last updated: {gasData.timestamp.toLocaleTimeString()} · refreshes every 30s
              </p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-white/30 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-light" style={{ color }}>
        {value}
        <span className="text-sm text-white/40 ml-1">{unit}</span>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="hidden sm:block h-12 w-[1px]"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    />
  );
}
