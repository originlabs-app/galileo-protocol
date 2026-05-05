"use client";

import { useEffect, useRef, useState } from "react";

// Seeded pseudo-random number generator for consistent SSR/client values
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Pre-generate deterministic gold particle data
const goldColors = ["#D4AF37", "#FFD700", "#FFF8DC", "#F5E6C8"];
const goldParticles = [...Array(40)].map((_, i) => ({
  x: 35 + seededRandom(i * 4 + 700) * 30,
  delay: seededRandom(i * 4 + 701) * 2,
  duration: 3 + seededRandom(i * 4 + 702) * 2,
  color: goldColors[Math.floor(seededRandom(i * 4 + 703) * 4)],
}));

export function TreasureReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setTimeout(() => setRevealed(true), 1500);
        }
      },
      { threshold: 0.4 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-black overflow-hidden"
    >
      {/* Deep gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#020204] to-black" />

      {/* Treasure glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] transition-opacity duration-[3000ms]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center bottom, rgba(212, 175, 55, 0.2) 0%, transparent 50%)",
          opacity: revealed ? 1 : 0,
        }}
      />

      {/* Rising gold particles */}
      {revealed && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {goldParticles.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${particle.x}%`,
                bottom: "15%",
                backgroundColor: particle.color,
                boxShadow: `0 0 10px ${particle.color}`,
                animation: `riseGold ${particle.duration}s ease-out ${particle.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <div className="container mx-auto px-6 md:px-8 relative z-10">
        {/* Depth indicator */}
        <div
          className="text-center mb-12"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 1s ease-out",
          }}
        >
          <div className="inline-flex items-center gap-4">
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-amber-500/30" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-amber-400/50">
              6,000m · Hadal Zone
            </span>
            <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-amber-500/30" />
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto text-center">
          {/* Central visualization */}
          <div
            className="relative w-56 h-56 md:w-72 md:h-72 mx-auto mb-16"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `scale(${isVisible ? 1 : 0.8})`,
              transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Glow rings */}
            <div
              className="absolute inset-0 rounded-full transition-opacity duration-[2000ms]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)",
                opacity: revealed ? 1 : 0,
              }}
            />

            {/* Outer ring */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full absolute inset-0"
            >
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke="#D4AF37"
                strokeWidth="0.5"
                fill="none"
                opacity="0.2"
              />
              <circle
                cx="100"
                cy="100"
                r="70"
                stroke="#D4AF37"
                strokeWidth="0.5"
                fill="none"
                opacity="0.3"
              />
              <circle
                cx="100"
                cy="100"
                r="50"
                stroke="#D4AF37"
                strokeWidth="1"
                fill="none"
                opacity={revealed ? 0.6 : 0.2}
                className="transition-opacity duration-1000"
              />
            </svg>

            {/* Central diamond/treasure */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative transition-all duration-1000"
                style={{
                  transform: revealed
                    ? "scale(1) rotate(0deg)"
                    : "scale(0.8) rotate(-10deg)",
                }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-24 h-24 md:w-32 md:h-32"
                >
                  <defs>
                    <linearGradient
                      id="goldGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#F5E6C8" />
                      <stop offset="50%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#B8860B" />
                    </linearGradient>
                    <filter id="goldGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Diamond shape */}
                  <polygon
                    points="50,10 90,40 50,90 10,40"
                    fill={revealed ? "url(#goldGradient)" : "none"}
                    stroke="#D4AF37"
                    strokeWidth="1.5"
                    filter={revealed ? "url(#goldGlow)" : undefined}
                    className="transition-all duration-1000"
                  />

                  {/* Inner facets */}
                  <line
                    x1="10"
                    y1="40"
                    x2="90"
                    y2="40"
                    stroke="#D4AF37"
                    strokeWidth="0.5"
                    opacity="0.5"
                  />
                  <line
                    x1="50"
                    y1="10"
                    x2="50"
                    y2="40"
                    stroke="#D4AF37"
                    strokeWidth="0.5"
                    opacity="0.5"
                  />
                  <line
                    x1="50"
                    y1="40"
                    x2="10"
                    y2="40"
                    stroke="#D4AF37"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="50"
                    y1="40"
                    x2="50"
                    y2="90"
                    stroke="#D4AF37"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                </svg>

                {/* Radial lines when revealed */}
                {revealed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-[1px] h-20 bg-gradient-to-t from-amber-400/30 to-transparent"
                        style={{
                          transform: `rotate(${i * 45}deg) translateY(-100%)`,
                          transformOrigin: "center bottom",
                          animation: `pulse 2s ease-in-out ${i * 0.1}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-extralight text-white mb-6"
            style={{
              fontFamily: "var(--font-serif)",
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
            }}
          >
            The Treasure Within:
          </h2>

          <h3
            className="text-3xl md:text-5xl lg:text-6xl font-extralight"
            style={{
              fontFamily: "var(--font-serif)",
              backgroundImage: revealed
                ? "linear-gradient(90deg, #B8860B, #D4AF37, #FFD700, #D4AF37, #B8860B)"
                : "linear-gradient(90deg, #333, #444, #333)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition:
                "all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s, background-image 1s ease-out",
            }}
          >
            Verifiable Evidence
          </h3>

          {/* Description */}
          <p
            className="mt-8 text-base md:text-lg text-white/40 font-light max-w-2xl mx-auto leading-relaxed"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 20}px)`,
              transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.7s",
            }}
          >
            At the deepest point, where pressure reveals weak claims, product
            records become easier to inspect, compare, and verify.
          </p>

          {/* Stats */}
          <div
            className="mt-16 flex items-center justify-center gap-8 md:gap-16"
            style={{
              opacity: revealed ? 1 : 0,
              transform: `translateY(${revealed ? 0 : 20}px)`,
              transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {[
              { value: "1:1", label: "Product Record" },
              { value: "Open", label: "Standard" },
              { value: "Trace", label: "Evidence" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className="text-2xl md:text-3xl font-light"
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    color: "#D4AF37",
                  }}
                >
                  {stat.value}
                </div>
                <div className="mt-1 text-[10px] text-white/30 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes riseGold {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-400px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
