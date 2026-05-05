"use client";

import Link from "next/link";

export function GovernanceHero() {
  const subheadDelay = 560;

  return (
    <section
      className="relative min-h-[60vh] flex items-center overflow-hidden grain-texture"
      style={{ boxShadow: "inset 0 0 200px 50px rgba(2, 2, 4, 0.5)" }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.01]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Radial glows */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[var(--cyan-primary)] opacity-[0.015] blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[var(--emerald-primary)] opacity-[0.01] blur-[100px] rounded-full" />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/5 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "0ms" }}
          >
            <svg
              className="w-4 h-4 text-[var(--cyan-primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-[var(--cyan-primary)]">
              Open & Neutral
            </span>
          </div>

          {/* Title with kinetic typography */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            <span
              className="block opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none text-gradient-bioluminescent"
              style={{ animationDelay: "100ms" }}
            >
              GOVERNANCE CHARTER
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl md:text-2xl text-[var(--platinum-dim)] max-w-2xl mx-auto leading-relaxed opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: `${subheadDelay}ms` }}
          >
            A neutral framework enabling competing luxury brands to collaborate
            <span className="italic-accent text-[var(--platinum)]">
              {" "}
              on shared infrastructure
            </span>
            .
          </p>

          {/* CTAs with halos and stagger */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {/* Primary CTA with halo */}
            <div
              className="relative group opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: `${subheadDelay + 100}ms` }}
            >
              <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-30 blur-xl rounded-lg transition-opacity duration-300" />
              <Link
                href="#charter"
                className="relative precision-line halo-glow button-haptic inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--cyan-primary)] to-[var(--emerald-primary)] text-[var(--obsidian)] font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                Read Charter
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </Link>
            </div>

            {/* Secondary CTA - staggered 60ms later */}
            <div
              className="relative group opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: `${subheadDelay + 160}ms` }}
            >
              <div className="absolute inset-0 bg-[var(--platinum)] opacity-0 group-hover:opacity-10 blur-xl rounded-lg transition-opacity duration-300" />
              <a
                href="https://github.com/originlabs-app/galileo-protocol/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="relative precision-line button-haptic inline-flex items-center gap-2 px-8 py-4 border border-[var(--platinum)]/20 text-[var(--platinum)] font-semibold rounded-lg hover:bg-[var(--platinum)]/5 hover:border-[var(--platinum)]/40 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Join TSC
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
