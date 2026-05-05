'use client';

import { useState, useEffect, useCallback } from 'react';
import { Footer } from '@/components/layout/Footer';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const CHAIN_ID = 84532;

interface FaucetStatus {
  active: boolean;
  balance: string;
  totalDrips: number;
  dripAmount: string;
  address?: string;
  message: string;
}

interface DripResult {
  txHash: string;
  amount: string;
  explorerUrl: string;
  message: string;
}

function isValidAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function Faucet() {
  const [status, setStatus] = useState<FaucetStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [dripping, setDripping] = useState(false);
  const [result, setResult] = useState<DripResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/faucet/status`);
      const json = (await res.json()) as { success: boolean; data: FaucetStatus };
      if (json.success) setStatus(json.data);
    } catch {
      // status fetch failure is non-blocking
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleDrip() {
    setErrorMsg(null);
    setResult(null);

    if (!isValidAddress(address)) {
      setErrorMsg('Enter a valid Ethereum address (0x…)');
      return;
    }

    setDripping(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/faucet/drip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const json = (await res.json()) as
        | { success: true; data: DripResult }
        | { success: false; error: { code: string; message: string } };

      if (json.success) {
        setResult(json.data);
        setAddress('');
        fetchStatus(); // refresh balance
      } else {
        setErrorMsg(json.error.message);
      }
    } catch {
      setErrorMsg('Network error — is the API running?');
    } finally {
      setDripping(false);
    }
  }

  const addressValid = isValidAddress(address);
  const canDrip = addressValid && !dripping && (status?.active ?? true);

  return (
    <div className="min-h-screen" style={{ background: '#000810' }}>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-2xl">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs tracking-widest uppercase"
              style={{
                background: 'rgba(0,255,136,0.06)',
                border: '1px solid rgba(0,255,136,0.2)',
                color: '#00FF88',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: status?.active ? '#00FF88' : '#FF6655',
                  boxShadow: `0 0 6px ${status?.active ? '#00FF88' : '#FF6655'}`,
                }}
              />
              {status?.active ? 'Active' : 'Inactive'} · Base Sepolia · Chain {CHAIN_ID}
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-extralight text-center text-white mb-4"
            style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}
          >
            Testnet Faucet
          </h1>
          <p className="text-center text-white/50 text-lg max-w-xl mx-auto mb-12">
            Request free Base Sepolia ETH to pay for gas when minting Digital Product Passports.
          </p>

          {/* Stats row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16">
            {statusLoading ? (
              <div className="text-white/30 text-sm animate-pulse">Loading faucet status…</div>
            ) : (
              <>
                <StatItem
                  label="Faucet Balance"
                  value={status ? `${parseFloat(status.balance).toFixed(4)}` : '—'}
                  unit="ETH"
                  color="#00FF88"
                />
                <Divider />
                <StatItem
                  label="Drip Amount"
                  value={status?.dripAmount ?? '0.001'}
                  unit="ETH"
                  color="#00FFFF"
                />
                <Divider />
                <StatItem
                  label="Total Drips"
                  value={status ? String(status.totalDrips) : '—'}
                  unit="sent"
                  color="rgba(255,255,255,0.6)"
                />
              </>
            )}
          </div>

          {/* Form card */}
          <div
            className="relative overflow-hidden p-8"
            style={{
              background: 'rgba(2,16,32,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Top accent */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)',
              }}
            />

            <h2
              className="text-xl font-light text-white mb-6"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Request ETH
            </h2>

            {/* Status message when faucet is inactive */}
            {status && !status.active && (
              <div
                className="mb-6 px-4 py-3 text-sm"
                style={{
                  background: 'rgba(255,102,85,0.08)',
                  border: '1px solid rgba(255,102,85,0.2)',
                  color: '#FF8877',
                }}
              >
                {status.message}
              </div>
            )}

            {/* Address input */}
            <div className="mb-4">
              <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x…"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setErrorMsg(null);
                }}
                disabled={dripping}
                className="w-full px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    address && !addressValid
                      ? 'rgba(255,102,85,0.4)'
                      : 'rgba(255,255,255,0.1)'
                  }`,
                }}
              />
              {address && !addressValid && (
                <p className="mt-1.5 text-xs" style={{ color: '#FF8877' }}>
                  Not a valid Ethereum address
                </p>
              )}
            </div>

            {/* Error message */}
            {errorMsg && (
              <div
                className="mb-4 px-4 py-3 text-sm"
                style={{
                  background: 'rgba(255,102,85,0.08)',
                  border: '1px solid rgba(255,102,85,0.2)',
                  color: '#FF8877',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Success result */}
            {result && (
              <div
                className="mb-4 px-4 py-4 text-sm space-y-2"
                style={{
                  background: 'rgba(0,255,136,0.06)',
                  border: '1px solid rgba(0,255,136,0.2)',
                }}
              >
                <p style={{ color: '#00FF88' }} className="font-medium">
                  {result.message}
                </p>
                <p className="text-white/50 font-mono text-xs break-all">
                  Tx:{' '}
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white/80 transition-colors"
                    style={{ color: '#00FFFF' }}
                  >
                    {result.txHash}
                  </a>
                </p>
                <p className="text-xs" style={{ color: 'rgba(0,255,136,0.6)' }}>
                  View on{' '}
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white/80 transition-colors"
                  >
                    BaseScan
                  </a>
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleDrip}
              disabled={!canDrip}
              className="w-full py-3.5 text-sm tracking-widest uppercase transition-all"
              style={{
                background: canDrip
                  ? 'rgba(0,255,136,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${canDrip ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: canDrip ? '#00FF88' : 'rgba(255,255,255,0.25)',
                cursor: canDrip ? 'pointer' : 'not-allowed',
              }}
            >
              {dripping ? 'Sending…' : 'Request 0.001 ETH'}
            </button>

            {/* Notes */}
            <div className="mt-6 space-y-1.5">
              <p className="text-xs text-white/25 leading-relaxed">
                Limited to one request per wallet per 24 hours. Each drip covers 3–4 product mints on Base Sepolia.
              </p>
              <p className="text-xs text-white/20">
                This faucet is for testnet use only. ETH on Base Sepolia has no real value.
              </p>
            </div>
          </div>

          {/* Link to Gas Estimator */}
          <div className="mt-8 text-center">
            <p className="text-xs text-white/30">
              Curious about gas costs?{' '}
              <a
                href="/tools/gas-estimator"
                className="underline transition-colors hover:text-white/60"
                style={{ color: 'rgba(0,255,255,0.5)' }}
              >
                View the Gas Estimator
              </a>
            </p>
          </div>

          {/* Refill note */}
          <div
            className="mt-6 px-5 py-4 text-xs text-white/30 leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span className="text-white/40 font-medium">Faucet empty?</span> Send Base Sepolia ETH to the deployer wallet{' '}
            <code className="font-mono text-white/30">0xA46a59EcD84486f31Bc54A4D9d5C8241Aa998c2e</code>.
            You can bridge ETH from Ethereum Sepolia via the{' '}
            <a
              href="https://superbridge.app/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/50 transition-colors"
            >
              Superbridge
            </a>
            .
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatItem({
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
