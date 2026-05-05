'use client';

import { useEffect, useRef, useState } from 'react';

const pillars = [
  {
    id: 'identity',
    number: '01',
    title: 'Digital Identity',
    subtitle: 'Identité Numérique',
    description: 'Every luxury item receives a unique, cryptographically secured digital identity anchored to the blockchain.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
        <path d="M24 4 L24 8 M24 40 L24 44 M4 24 L8 24 M40 24 L44 24" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'provenance',
    number: '02',
    title: 'Immutable Provenance',
    subtitle: 'Provenance Immuable',
    description: 'Structured ownership and service history designed for durable, independently verifiable records.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <path d="M8 40 L16 32 L24 36 L32 24 L40 28" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="8" cy="40" r="2" fill="currentColor" />
        <circle cx="16" cy="32" r="2" fill="currentColor" />
        <circle cx="24" cy="36" r="2" fill="currentColor" />
        <circle cx="32" cy="24" r="2" fill="currentColor" />
        <circle cx="40" cy="28" r="2" fill="currentColor" />
        <rect x="6" y="6" width="36" height="36" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'verification',
    number: '03',
    title: 'Instant Verification',
    subtitle: 'Vérification Instantanée',
    description: 'Verify a product record in seconds. One scan surfaces the evidence available for that item.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M16 24 L22 30 L32 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 6 L24 10 M24 38 L24 42 M6 24 L10 24 M38 24 L42 24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
];

export function DiscoverSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="discover"
      className="relative py-32 md:py-48 bg-[#000408] overflow-hidden"
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 255, 0.03) 0%, transparent 60%)',
        }}
      />

      <div className="container mx-auto px-6 md:px-8 relative z-10">
        {/* Header */}
        <div
          className="max-w-3xl mx-auto text-center mb-24"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 40}px)`,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/60">
              The Protocol
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-extralight text-white leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            What lies beneath
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              the surface?
            </span>
          </h2>

          <p className="mt-8 text-base md:text-lg text-white/40 leading-relaxed max-w-2xl mx-auto">
            Galileo Protocol is the open standard for luxury product authentication.
            A decentralized infrastructure for preserving verification evidence
            where product claims can be inspected instead of merely trusted.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.id}
              className="group relative"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: `translateY(${isVisible ? 0 : 40}px)`,
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + index * 0.15}s`,
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {/* Card */}
              <div
                className="relative p-8 md:p-10 h-full border border-white/5 transition-all duration-500"
                style={{
                  background: activeIndex === index
                    ? 'linear-gradient(180deg, rgba(0, 255, 255, 0.05) 0%, transparent 100%)'
                    : 'transparent',
                  borderColor: activeIndex === index ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Number */}
                <div className="flex items-center justify-between mb-8">
                  <span
                    className="text-6xl font-extralight transition-colors duration-500"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      color: activeIndex === index ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {pillar.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 transition-all duration-500"
                    style={{
                      color: activeIndex === index ? '#00FFFF' : 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {pillar.icon}
                  </div>
                </div>

                {/* Content */}
                <h3
                  className="text-xl md:text-2xl font-light text-white mb-2"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {pillar.title}
                </h3>

                <span className="text-xs text-cyan-400/40 italic tracking-wide">
                  {pillar.subtitle}
                </span>

                <p className="mt-6 text-sm text-white/40 leading-relaxed">
                  {pillar.description}
                </p>

                {/* Bottom line */}
                <div
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                  style={{
                    width: activeIndex === index ? '100%' : '0%',
                  }}
                />

                {/* Corner accent */}
                <div
                  className="absolute top-0 right-0 w-8 h-8 border-t border-r transition-all duration-500"
                  style={{
                    borderColor: activeIndex === index ? 'rgba(0, 255, 255, 0.3)' : 'transparent',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div
          className="mt-24 pt-16 border-t border-white/5"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 40}px)`,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: 'ERC-3643', label: 'Token Standard' },
              { value: 'W3C DID', label: 'Identity Layer' },
              { value: 'GS1 EPCIS', label: 'Event Format' },
              { value: '100%', label: 'Open Source' },
            ].map((stat, index) => (
              <div key={index}>
                <div
                  className="text-2xl md:text-3xl font-light text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {stat.value}
                </div>
                <div className="mt-2 text-xs text-white/30 tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
