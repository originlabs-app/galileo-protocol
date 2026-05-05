'use client';

import { useEffect, useRef, useState } from 'react';

// Seeded pseudo-random number generator for consistent SSR/client values
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Round to 4 decimal places to prevent hydration mismatches
const round = (n: number) => Math.round(n * 10000) / 10000;

interface Zone {
  depth: number;
  name: string;
  nameFr: string;
  color: string;
  message: string;
  feature: string;
}

const zones: Zone[] = [
  {
    depth: 0,
    name: 'Epipelagic',
    nameFr: 'Zone Épipélagique',
    color: '#0a3c64',
    message: 'At the surface, product claims are hard to verify at scale.',
    feature: 'Product Registration',
  },
  {
    depth: 200,
    name: 'Mesopelagic',
    nameFr: 'Zone Mésopélagique',
    color: '#062840',
    message: 'Twilight zone. Digital identities begin to separate evidence from unsupported claims.',
    feature: 'Identity Binding',
  },
  {
    depth: 1000,
    name: 'Bathypelagic',
    nameFr: 'Zone Bathypélagique',
    color: '#041c30',
    message: 'The midnight zone. Verified records become easier to audit.',
    feature: 'Cryptographic Seal',
  },
  {
    depth: 4000,
    name: 'Abyssopelagic',
    nameFr: 'Zone Abyssopélagique',
    color: '#021020',
    message: 'The abyss. Immutable records crystallize under pressure.',
    feature: 'Blockchain Anchor',
  },
  {
    depth: 6000,
    name: 'Hadopelagic',
    nameFr: 'Zone Hadopélagique',
    color: '#000810',
    message: 'The hadal zone. Stronger evidence. Clearer verification.',
    feature: 'Permanent Verification',
  },
];

// Pre-generate deterministic particle data
const pressureParticles = [...Array(60)].map((_, i) => ({
  x: round(seededRandom(i * 3 + 300) * 100),
  y: round(seededRandom(i * 3 + 301) * 100),
  baseHeight: round(10 + seededRandom(i * 3 + 302) * 20),
}));

const descentBioColors = ['#00FFFF', '#00FF88', '#4488FF', '#FF00FF'];
const descentBioParticles = [...Array(25)].map((_, i) => ({
  x: round(seededRandom(i * 5 + 400) * 100),
  y: round(seededRandom(i * 5 + 401) * 100),
  size: round(2 + seededRandom(i * 5 + 402) * 6),
  color: descentBioColors[Math.floor(seededRandom(i * 5 + 403) * 4)],
  pulseSpeed: round(2 + seededRandom(i * 5 + 404) * 4),
}));

export function DescentSection() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [currentZone, setCurrentZone] = useState(zones[0]);
  const [sectionHeightPx, setSectionHeightPx] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Set section height in JS pixels to ensure CSS height matches scroll calculation.
    // Using window.innerHeight avoids mismatches between CSS `vh` and JS innerHeight
    // (common on mobile browsers with dynamic toolbars).
    const setHeight = () => setSectionHeightPx(window.innerHeight * 5);
    setHeight();

    const handleScroll = () => {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollableHeight = section.offsetHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      setScrollProgress(progress);

      const depth = Math.round(progress * 6000);
      setCurrentDepth(depth);

      const zone = [...zones].reverse().find((z) => depth >= z.depth) || zones[0];
      setCurrentZone(zone);
    };

    handleScroll(); // Initialize from current scroll position
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', setHeight, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', setHeight);
    };
  }, []);

  const getBackgroundColor = () => {
    const zoneIndex = zones.findIndex((z) => z.depth > currentDepth) - 1;
    const idx = Math.max(0, zoneIndex);
    return zones[idx]?.color || zones[zones.length - 1].color;
  };

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: sectionHeightPx > 0 ? `${sectionHeightPx}px` : '500vh' }}
    >
      {/* Sticky viewport */}
      <div
        className="sticky top-0 h-screen overflow-hidden transition-colors duration-1000"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        {/* Pressure particles - vertical streaks that intensify with depth */}
        <div className="absolute inset-0 pointer-events-none">
          {pressureParticles.map((particle, i) => (
            <div
              key={i}
              className="absolute w-[1px] rounded-full bg-gradient-to-b from-white/20 via-white/10 to-transparent"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                height: `${particle.baseHeight + scrollProgress * 40}px`,
                opacity: 0.05 + scrollProgress * 0.15,
                transform: `translateY(${scrollProgress * 50}px)`,
                transition: 'height 0.5s ease-out, opacity 0.5s ease-out',
              }}
            />
          ))}
        </div>

        {/* Bioluminescent particles - appear in deeper zones */}
        {scrollProgress > 0.25 && (
          <div className="absolute inset-0 pointer-events-none">
            {descentBioParticles.map((particle, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-pulse"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 ${particle.size * 4}px ${particle.color}`,
                  opacity: Math.min(1, (scrollProgress - 0.25) * 1.5) * 0.7,
                  animationDuration: `${particle.pulseSpeed}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Depth gauge - left side (0m at top, 6000m at bottom) */}
        <div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
          {/* Depth counter at top */}
          <div className="text-center">
            <div
              className="text-3xl md:text-4xl font-extralight tabular-nums"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#00FFFF',
                textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
              }}
            >
              {currentDepth.toLocaleString()}
            </div>
            <div className="text-[10px] text-white/30 tracking-wider">meters</div>
          </div>

          {/* Gauge bar - fills from top (surface) to bottom (abyss) */}
          <div className="relative w-1 h-48 md:h-64 bg-white/10 rounded-full overflow-hidden">
            {/* Fill from top */}
            <div
              className="absolute top-0 left-0 right-0 rounded-full transition-all duration-300"
              style={{
                height: `${scrollProgress * 100}%`,
                background: `linear-gradient(to bottom, ${zones[0].color}, #00FFFF)`,
              }}
            />
            {/* Current position indicator (bright dot) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-300"
              style={{
                top: `${scrollProgress * 100}%`,
                transform: `translate(-50%, -50%)`,
                background: '#00FFFF',
                boxShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF50',
              }}
            />
            {/* Zone markers (0m at top, 6000m at bottom) */}
            {zones.map((zone) => (
              <div
                key={zone.depth}
                className="absolute left-full ml-2 flex items-center gap-2"
                style={{
                  top: `${(zone.depth / 6000) * 100}%`,
                  transform: 'translateY(-50%)',
                }}
              >
                <div className="w-3 h-[1px] bg-white/20" />
                <span className="text-[8px] text-white/30 whitespace-nowrap hidden md:block">
                  {zone.depth}m
                </span>
              </div>
            ))}
          </div>

          {/* Label at bottom */}
          <div
            className="text-[10px] text-white/30 tracking-[0.3em] uppercase"
          >
            Depth
          </div>
        </div>

        {/* Zone indicator - right side */}
        <div className="absolute right-6 md:right-12 top-8 text-right">
          <div className="text-[10px] text-white/30 tracking-[0.3em] uppercase mb-3">
            Current Zone
          </div>
          <div
            className="text-xl md:text-2xl font-light text-white"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {currentZone.name}
          </div>

          {/* Feature unlocked */}
          <div className="mt-6 flex items-center gap-2 justify-end">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: scrollProgress > 0.1 ? '#00FF88' : '#ffffff30' }}
            />
            <span className="text-[10px] text-white/40 tracking-wide">
              {currentZone.feature}
            </span>
          </div>
        </div>

        {/* Pressure indicator - bottom right */}
        <div className="absolute right-6 md:right-12 bottom-8 text-right">
          <div className="text-[10px] text-white/30 tracking-[0.3em] uppercase mb-2">
            Pressure
          </div>
          <div className="flex items-baseline gap-2 justify-end">
            <span
              className="text-2xl font-light tabular-nums"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: scrollProgress > 0.7 ? '#FF6B6B' : '#00FFFF',
              }}
            >
              {(1 + scrollProgress * 600).toFixed(0)}
            </span>
            <span className="text-xs text-white/30">atm</span>
          </div>
        </div>

        {/* Central message */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-3xl px-8">
            <p
              className="text-2xl md:text-4xl lg:text-5xl font-extralight text-white leading-relaxed"
              style={{
                fontFamily: 'var(--font-serif)',
                textShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              {currentZone.message}
            </p>

            {/* Progress ring */}
            <div className="mt-12 relative w-20 h-20 md:w-24 md:h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${scrollProgress * 283} 283`}
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00FFFF" />
                    <stop offset="100%" stopColor="#00FF88" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-sm font-light tabular-nums"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#00FFFF',
                  }}
                >
                  {Math.round(scrollProgress * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sonar ping */}
        {scrollProgress > 0.1 && scrollProgress < 0.9 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
            <div
              className="relative w-4 h-4"
              style={{
                animation: 'sonarPing 3s ease-out infinite',
              }}
            >
              <div className="absolute inset-0 rounded-full bg-cyan-400" />
              <div
                className="absolute inset-0 rounded-full border border-cyan-400 animate-ping"
                style={{ animationDuration: '2s' }}
              />
              <div
                className="absolute -inset-2 rounded-full border border-cyan-400/50 animate-ping"
                style={{ animationDuration: '2s', animationDelay: '0.5s' }}
              />
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
