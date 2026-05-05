"use client";

import { useRef, useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";

// Seeded pseudo-random number generator for consistent SSR/client values
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Round to 4 decimal places to prevent hydration mismatches
const round = (n: number) => Math.round(n * 10000) / 10000;

// Pre-generate deterministic bubble data
const footerBubbles = [...Array(25)].map((_, i) => ({
  x: round(seededRandom(i * 4 + 600) * 100),
  size: round(6 + seededRandom(i * 4 + 601) * 16),
  delay: round(seededRandom(i * 4 + 602) * 15),
  duration: round(10 + seededRandom(i * 4 + 603) * 10),
}));

export function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={sectionRef} className="relative bg-black overflow-hidden">
      {/* Ascent CTA Section */}
      <section className="relative py-32 md:py-48">
        {/* Rising bubbles - only animate when visible and motion is allowed */}
        {isVisible && !prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {footerBubbles.map((bubble, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white/10"
                style={{
                  left: `${bubble.x}%`,
                  bottom: "-50px",
                  width: bubble.size,
                  height: bubble.size,
                  animation: `riseSlow ${bubble.duration}s linear ${bubble.delay}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* Gradient to surface */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-[#010810] to-[#041020] opacity-60" />

        <div className="container mx-auto px-6 md:px-8 relative z-10">
          <div
            className="max-w-3xl mx-auto text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: prefersReducedMotion
                ? "none"
                : `translateY(${isVisible ? 0 : 40}px)`,
              transition: prefersReducedMotion
                ? "opacity 0.3s"
                : "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Ascent indicator */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <span
                className={`text-cyan-400/30 ${prefersReducedMotion ? "" : "animate-bounce"}`}
              >
                ↑
              </span>
              <span className="text-[10px] text-cyan-400/40 tracking-[0.4em] uppercase">
                Ascending
              </span>
              <span
                className={`text-cyan-400/30 ${prefersReducedMotion ? "" : "animate-bounce"}`}
                style={prefersReducedMotion ? {} : { animationDelay: "0.1s" }}
              >
                ↑
              </span>
            </div>

            <h2
              className="text-4xl md:text-6xl font-extralight text-white mb-6"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Rise to the
              <span
                className="block mt-3"
                style={{
                  background:
                    "linear-gradient(180deg, #00FFFF 0%, #00FF88 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Surface
              </span>
            </h2>

            <p className="text-base md:text-lg text-white/40 font-light mb-12 max-w-xl mx-auto">
              You&apos;ve inspected the evidence. Now bring that clarity to your
              products.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs/quick-start"
                className="group relative px-10 py-4 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                <span className="relative z-10 text-sm tracking-[0.15em] uppercase text-black font-medium">
                  Start Integration
                </span>
              </Link>

              <Link
                href="/docs"
                className="group px-10 py-4 border border-white/20 hover:border-cyan-400/50 transition-colors"
              >
                <span className="text-sm tracking-[0.15em] uppercase text-white/60 group-hover:text-cyan-400 transition-colors">
                  Read Documentation
                </span>
              </Link>
            </div>

            {/* Status */}
            <div className="mt-12 flex items-center justify-center gap-2">
              <div
                className={`w-2 h-2 bg-emerald-400 rounded-full ${prefersReducedMotion ? "" : "animate-pulse"}`}
              />
              <span className="text-[10px] text-white/30 tracking-wide">
                Decompression complete · Safe to surface
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Main footer */}
      <section className="py-16">
        <div className="container mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="group relative block w-fit mb-6">
                <span
                  className="text-2xl md:text-3xl font-extralight tracking-[-0.04em] text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-emerald-400 transition-all duration-500"
                  style={{
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  GALILEO
                </span>
                {/* Subtle glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,255,255,0.3), rgba(0,255,136,0.3))",
                  }}
                />
              </Link>
              <p className="text-sm text-white/60 leading-relaxed max-w-xs text-left">
                The open standard for luxury product authentication and
                verification evidence.
              </p>

              {/* Social links - GitHub only (real link) */}
              <div className="mt-6 flex items-center gap-4">
                <a
                  href="https://github.com/originlabs-app/galileo-protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-cyan-400 transition-colors"
                  aria-label="GitHub"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Protocol */}
            <div>
              <h4
                className="text-[10px] tracking-[0.3em] uppercase mb-6"
                style={{
                  background:
                    "linear-gradient(180deg, #00FFFF 0%, #00FF88 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Protocol
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/docs"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/quick-start"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Quick Start
                  </Link>
                </li>
                <li>
                  <Link
                    href="/specifications"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Specifications
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/architecture"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Architecture
                  </Link>
                </li>
              </ul>
            </div>

            {/* Explore */}
            <div>
              <h4
                className="text-[10px] tracking-[0.3em] uppercase mb-6"
                style={{
                  background:
                    "linear-gradient(180deg, #00FFFF 0%, #00FF88 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Explore
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/governance"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Governance
                  </Link>
                </li>
                <li>
                  <Link
                    href="/governance/tsc"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    TSC Charter
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4
                className="text-[10px] tracking-[0.3em] uppercase mb-6"
                style={{
                  background:
                    "linear-gradient(180deg, #00FFFF 0%, #00FF88 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Company
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/maison"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/originlabs-app/galileo-protocol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/originlabs-app/galileo-protocol/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    License (Apache 2.0)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/originlabs-app/galileo-protocol/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 hover:text-cyan-400 transition-colors"
                  >
                    Discussions
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom bar separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Bottom bar */}
      <section className="py-6">
        <div className="container mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-white/40">
              © {new Date().getFullYear()} Galileo Network EURL. Licensed under
              Apache 2.0.
            </p>

            {/* Privacy & Terms */}
            <div className="flex items-center gap-4">
              <Link
                href="/privacy"
                className="text-[10px] text-white/40 hover:text-cyan-400 transition-colors"
              >
                Privacy
              </Link>
              <span className="text-white/20">·</span>
              <Link
                href="/legal"
                className="text-[10px] text-white/40 hover:text-cyan-400 transition-colors"
              >
                Legal
              </Link>
              <span className="text-white/20">·</span>
              <Link
                href="/terms"
                className="text-[10px] text-white/40 hover:text-cyan-400 transition-colors"
              >
                Terms
              </Link>
            </div>

            {/* Signature */}
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-cyan-400/70 rounded-full" />
              <span className="text-[9px] tracking-[0.4em] uppercase text-white/40">
                ABYSSE · MMXXVI
              </span>
              <div className="w-1 h-1 bg-cyan-400/70 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes riseSlow {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </footer>
  );
}
