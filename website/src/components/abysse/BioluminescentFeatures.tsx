"use client";

import { useEffect, useRef, useState } from "react";

// Seeded pseudo-random number generator for consistent SSR/client values
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Round to 4 decimal places to prevent hydration mismatches
const round = (n: number) => Math.round(n * 10000) / 10000;

const features = [
  {
    id: "certificate",
    title: "Digital Product Passport",
    titleFr: "Passeport Produit Numérique",
    description:
      "Digital Product Passport records designed around EU ESPR requirements and lifecycle traceability.",
    color: "#00FFFF",
    stats: { value: "ESPR", label: "Compliant" },
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <rect
          x="12"
          y="8"
          width="40"
          height="48"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="32" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" />
        <line
          x1="20"
          y1="40"
          x2="44"
          y2="40"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1="20"
          y1="46"
          x2="36"
          y2="46"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />
        <rect
          x="36"
          y="52"
          width="12"
          height="8"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    ),
  },
  {
    id: "chain",
    title: "Immutable Provenance",
    titleFr: "Provenance Immuable",
    description:
      "Ownership transfers, authentication events, and service records can be anchored to durable protocol evidence.",
    color: "#00FF88",
    stats: { value: "∞", label: "Permanence" },
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <path
          d="M16 32 L24 40 L32 32 L40 40 L48 32"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="16" cy="32" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="4" fill="currentColor" />
        <circle cx="48" cy="32" r="4" stroke="currentColor" strokeWidth="1.5" />
        <line
          x1="8"
          y1="16"
          x2="56"
          y2="16"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.3"
        />
        <line
          x1="8"
          y1="48"
          x2="56"
          y2="48"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.3"
        />
      </svg>
    ),
  },
  {
    id: "verify",
    title: "Instant Authentication",
    titleFr: "Authentification Instantanée",
    description:
      "One scan surfaces the product record and available verification evidence. NFC, QR, or serial number - multiple entry points, one shared record.",
    color: "#4488FF",
    stats: { value: "Real-time", label: "Verification" },
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle
          cx="32"
          cy="32"
          r="20"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M24 32 L30 38 L42 26"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.3"
          strokeDasharray="4 4"
        />
      </svg>
    ),
  },
  {
    id: "transfer",
    title: "Secure Ownership Transfer",
    titleFr: "Transfert Sécurisé",
    description:
      "Compliant secondary market workflows. Resales and transfers can be checked against protocol records and policy controls.",
    color: "#FF00FF",
    stats: { value: "P2P", label: "Transfers" },
    icon: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle
          cx="20"
          cy="32"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="44"
          cy="32"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M30 28 L34 32 L30 36"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M34 28 L30 32 L34 36"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <circle cx="20" cy="32" r="3" fill="currentColor" />
        <circle cx="44" cy="32" r="3" fill="currentColor" />
      </svg>
    ),
  },
];

// Pre-generate deterministic particle data
const featureColors = features.map((f) => f.color);
const ambientParticles = [...Array(40)].map((_, i) => ({
  x: round(seededRandom(i * 6 + 500) * 100),
  y: round(seededRandom(i * 6 + 501) * 100),
  size: round(1 + seededRandom(i * 6 + 502) * 3),
  color: featureColors[i % featureColors.length],
  duration: round(3 + seededRandom(i * 6 + 503) * 4),
  delay: round(seededRandom(i * 6 + 504) * 2),
}));

export function BioluminescentFeatures() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#000810] overflow-hidden"
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none">
        {ambientParticles.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: 0.3,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 md:px-8 relative z-10">
        {/* Header */}
        <div
          className="text-center mb-20 md:mb-32"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 40}px)`,
            transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/60">
              Bioluminescence
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-extralight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Light in the Darkness
          </h2>

          <p className="mt-6 text-base text-white/40 max-w-2xl mx-auto leading-relaxed">
            In the deepest waters, life creates its own light. Our protocol
            makes verification evidence visible where claims are usually opaque.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="group relative"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: `translateY(${isVisible ? 0 : 40}px)`,
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + index * 0.1}s`,
              }}
              onMouseEnter={() => setActiveFeature(feature.id)}
              onMouseLeave={() => setActiveFeature(null)}
            >
              <div
                className="relative p-8 md:p-10 h-full border transition-all duration-500"
                style={{
                  backgroundColor:
                    activeFeature === feature.id
                      ? `${feature.color}10`
                      : "rgba(255, 255, 255, 0.02)",
                  borderColor:
                    activeFeature === feature.id
                      ? `${feature.color}40`
                      : "rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Glow effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 60px ${feature.color}15, 0 0 80px ${feature.color}10`,
                  }}
                />

                {/* Corner accents - visible by default */}
                <div
                  className="absolute top-0 left-0 w-6 h-6 border-l border-t transition-all duration-500"
                  style={{
                    borderColor:
                      activeFeature === feature.id
                        ? feature.color
                        : `${feature.color}30`,
                  }}
                />
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 border-r border-b transition-all duration-500"
                  style={{
                    borderColor:
                      activeFeature === feature.id
                        ? feature.color
                        : `${feature.color}30`,
                  }}
                />

                {/* Content */}
                <div className="relative">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-6">
                    {/* Icon */}
                    <div
                      className="w-14 h-14 transition-all duration-500"
                      style={{
                        color:
                          activeFeature === feature.id
                            ? feature.color
                            : `${feature.color}80`,
                      }}
                    >
                      {feature.icon}
                      {/* Glow behind icon on hover */}
                      <div
                        className="absolute inset-0 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                        style={{ backgroundColor: feature.color }}
                      />
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div
                        className="text-xl font-light transition-colors duration-500"
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          color:
                            activeFeature === feature.id
                              ? feature.color
                              : `${feature.color}70`,
                        }}
                      >
                        {feature.stats.value}
                      </div>
                      <div className="text-[10px] text-white/50 uppercase tracking-wider">
                        {feature.stats.label}
                      </div>
                    </div>
                  </div>

                  {/* Titles */}
                  <h3
                    className="text-xl md:text-2xl font-light text-white mb-1"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {feature.title}
                  </h3>
                  <span
                    className="text-xs italic tracking-wide transition-colors duration-500"
                    style={{ color: `${feature.color}90` }}
                  >
                    {feature.titleFr}
                  </span>

                  {/* Description */}
                  <p className="mt-5 text-sm text-white/60 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Status indicator */}
                  <div className="mt-6 flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: feature.color }}
                    />
                    <span
                      className="text-[10px] transition-colors duration-500"
                      style={{ color: feature.color }}
                    >
                      Active
                    </span>
                  </div>
                </div>

                {/* Bottom accent line - visible by default */}
                <div
                  className="absolute bottom-0 left-0 h-[2px] transition-all duration-500"
                  style={{
                    width: activeFeature === feature.id ? "100%" : "25%",
                    background: `linear-gradient(90deg, ${activeFeature === feature.id ? feature.color : feature.color + "60"}, transparent)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className="mt-20 text-center"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 20}px)`,
            transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.8s",
          }}
        >
          <a
            href="/docs"
            className="inline-flex items-center gap-3 text-sm text-white/40 hover:text-cyan-400 transition-colors group"
          >
            <span className="tracking-wide">Explore all capabilities</span>
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
