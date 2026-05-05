'use client';

import { useEffect, useState, useRef } from 'react';

// Seeded pseudo-random number generator for consistent SSR/client values
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Round to 4 decimal places to prevent hydration mismatches
const round = (n: number) => Math.round(n * 10000) / 10000;

// Pre-generate deterministic particle data
const surfaceParticles = [...Array(25)].map((_, i) => ({
  x: round(seededRandom(i * 4 + 1) * 100),
  y: round(35 + seededRandom(i * 4 + 2) * 25),
  delay: round(seededRandom(i * 4 + 3) * 5),
  duration: round(6 + seededRandom(i * 4 + 4) * 4),
}));

const bubbles = [...Array(20)].map((_, i) => ({
  x: round(10 + seededRandom(i * 4 + 100) * 80),
  size: round(4 + seededRandom(i * 4 + 101) * 12),
  delay: round(seededRandom(i * 4 + 102) * 8),
  duration: round(6 + seededRandom(i * 4 + 103) * 6),
}));

const bioColors = ['#00FFFF', '#00FF88', '#4488FF', '#FF00FF'];
const bioParticles = [...Array(15)].map((_, i) => ({
  x: round(10 + seededRandom(i * 5 + 200) * 80),
  y: round(60 + seededRandom(i * 5 + 201) * 35),
  size: round(3 + seededRandom(i * 5 + 202) * 6),
  color: bioColors[Math.floor(seededRandom(i * 5 + 203) * 4)],
  pulseSpeed: round(2 + seededRandom(i * 5 + 204) * 3),
}));

export function AbysseHero() {
  const [phase, setPhase] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 2000),
      setTimeout(() => setPhase(5), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-[100dvh] overflow-hidden">
      {/* Sky to ocean gradient - the main atmosphere */}
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms]"
        style={{
          background: `
            linear-gradient(180deg,
              #87CEEB 0%,
              #5BA3C6 15%,
              #3A8CB8 25%,
              #1E6E9E 35%,
              #145580 45%,
              #0A3C64 55%,
              #062840 70%,
              #041C30 85%,
              #020C18 100%
            )
          `,
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* Sun/light source at top */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 transition-all duration-[2000ms]"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: `translateX(calc(-50% + ${(mousePos.x - 0.5) * 20}px))`,
        }}
      >
        <div className="relative">
          <div className="absolute -inset-16 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute -inset-8 bg-[#FFE4B5]/30 rounded-full blur-2xl" />
          <div className="w-20 h-20 bg-gradient-to-b from-white/80 to-[#FFE4B5]/60 rounded-full blur-sm" />
        </div>
      </div>

      {/* Light rays penetrating water */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bg-gradient-to-b from-white/15 via-cyan-300/8 to-transparent"
            style={{
              left: `${10 + i * 13}%`,
              width: `${2 + (i % 2)}px`,
              height: `${50 + i * 8}%`,
              transform: `rotate(${-8 + i * 2.5}deg) translateX(${(mousePos.x - 0.5) * 15}px)`,
              opacity: phase >= 2 ? 0.7 : 0,
              transition: 'opacity 2s ease-out, transform 0.5s ease-out',
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Animated wave layers at the "surface" level */}
      <div className="absolute top-[25%] left-0 right-0 h-32 pointer-events-none overflow-hidden">
        <svg
          className="absolute top-0 left-0 w-[200%]"
          style={{ animation: 'wave 20s ease-in-out infinite' }}
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,50 C360,100 720,0 1080,50 C1260,75 1350,25 1440,50 L1440,100 L0,100 Z"
            fill="rgba(30,110,158,0.2)"
          />
        </svg>
        <svg
          className="absolute top-4 left-0 w-[200%]"
          style={{ animation: 'wave 15s ease-in-out infinite reverse' }}
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,30 C240,80 480,10 720,50 C960,90 1200,20 1440,40 L1440,100 L0,100 Z"
            fill="rgba(20,85,128,0.3)"
          />
        </svg>
      </div>

      {/* Floating surface particles (debris on water) */}
      <div className="absolute inset-0 pointer-events-none">
        {surfaceParticles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `floatParticle ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
              opacity: phase >= 2 ? 0.6 : 0,
              transition: 'opacity 2s ease-out',
            }}
          />
        ))}
      </div>

      {/* Rising bubbles from deep */}
      <div className="absolute bottom-0 left-0 right-0 h-[60%] pointer-events-none overflow-hidden">
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/20"
            style={{
              left: `${bubble.x}%`,
              bottom: '-20px',
              width: bubble.size,
              height: bubble.size,
              animation: `riseBubble ${bubble.duration}s ease-in ${bubble.delay}s infinite`,
              opacity: phase >= 3 ? 1 : 0,
              transition: 'opacity 1s ease-out',
            }}
          />
        ))}
      </div>

      {/* Bioluminescent particles in deep zone */}
      <div className="absolute inset-0 pointer-events-none">
        {bioParticles.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
              animationDuration: `${particle.pulseSpeed}s`,
              opacity: phase >= 3 ? 0.6 : 0,
              transition: 'opacity 2s ease-out',
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-6 md:px-8">
        {/* Depth indicator */}
        <div
          className="absolute top-8 left-8 flex items-center gap-3"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: `translateY(${phase >= 3 ? 0 : -20}px)`,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="relative">
            <div className="w-2 h-2 bg-cyan-400 rounded-full" />
            <div className="absolute inset-0 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <span className="text-[10px] tracking-[0.4em] uppercase text-white/60 font-light">
            Surface · 0m
          </span>
        </div>

        {/* Protocol badge */}
        <div
          className="mb-8"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: `translateY(${phase >= 2 ? 0 : 20}px)`,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 border border-white/20 rounded-full backdrop-blur-sm bg-white/5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/70">
              Galileo Protocol
            </span>
          </div>
        </div>

        {/* Main headline */}
        <div className="text-center max-w-5xl">
          <h1
            className="relative"
            style={{
              opacity: phase >= 1 ? 1 : 0,
              transition: 'opacity 1.5s ease-out',
            }}
          >
            {/* ABYSSE - Character by character reveal */}
            <span
              className="block text-[15vw] md:text-[12vw] lg:text-[10vw] font-extralight tracking-[-0.04em] leading-[0.85]"
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'white',
                textShadow: '0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(0,255,255,0.15)',
              }}
            >
              {'ABYSSE'.split('').map((char, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    opacity: phase >= 1 ? 1 : 0,
                    transform: `translateY(${phase >= 1 ? 0 : 40}px)`,
                    transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </h1>

          {/* Tagline */}
          <p
            className="mt-6 text-xl md:text-2xl lg:text-3xl font-extralight text-white/90 tracking-wide"
            style={{
              fontFamily: 'var(--font-serif)',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              opacity: phase >= 3 ? 1 : 0,
              transform: `translateY(${phase >= 3 ? 0 : 20}px)`,
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
            }}
          >
            Inspect the evidence.
          </p>

          {/* Subtitle */}
          <p
            className="mt-4 text-sm md:text-base text-white/60 max-w-xl mx-auto leading-relaxed"
            style={{
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              opacity: phase >= 4 ? 1 : 0,
              transform: `translateY(${phase >= 4 ? 0 : 20}px)`,
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            An open protocol for luxury product authenticity.
            <br className="hidden md:block" />
            Built to make verification evidence easier to inspect.
          </p>
        </div>

        {/* CTAs */}
        <div
          className="mt-12 flex flex-col sm:flex-row items-center gap-4"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: `translateY(${phase >= 5 ? 0 : 20}px)`,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <a
            href="/docs/quick-start"
            className="group relative px-8 py-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
            <span className="relative z-10 text-sm tracking-[0.15em] uppercase text-black font-medium">
              Begin Descent
            </span>
          </a>

          <a
            href="#discover"
            className="group px-8 py-4 border border-white/30 hover:border-cyan-400/60 backdrop-blur-sm bg-white/5 transition-all"
          >
            <span className="text-sm tracking-[0.15em] uppercase text-white/80 group-hover:text-cyan-400 transition-colors">
              Discover
            </span>
          </a>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transition: 'opacity 1s ease-out 0.5s',
          }}
        >
          <span className="text-[10px] tracking-[0.4em] uppercase text-white/50">
            Scroll to descend
          </span>

          <div className="relative w-6 h-10 border border-white/30 rounded-full">
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-2 bg-cyan-400 rounded-full"
              style={{ animation: 'scrollIndicator 2s ease-in-out infinite' }}
            />
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-cyan-400 text-sm animate-bounce" style={{ animationDelay: '0s' }}>↓</span>
            <span className="text-cyan-400/50 text-sm animate-bounce" style={{ animationDelay: '0.1s' }}>↓</span>
            <span className="text-cyan-400/25 text-sm animate-bounce" style={{ animationDelay: '0.2s' }}>↓</span>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020C18] to-transparent pointer-events-none" />

      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-25%); }
        }

        @keyframes floatParticle {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(8px, -12px);
          }
          50% {
            transform: translate(-4px, 8px);
          }
          75% {
            transform: translate(12px, 4px);
          }
        }

        @keyframes riseBubble {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          100% {
            transform: translateY(-70vh) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes scrollIndicator {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(16px);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
