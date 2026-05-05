"use client";

import Link from "next/link";

export function TSCHero() {
  const subheadDelay = 480;

  return (
    <section
      className="relative min-h-[40vh] flex items-center overflow-hidden grain-texture"
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
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-[var(--cyan-primary)] opacity-[0.012] blur-[100px] rounded-full" />
      <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-[var(--emerald-primary)] opacity-[0.01] blur-[80px] rounded-full" />

      <div className="container relative z-10 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Breadcrumb */}
          <div
            className="inline-flex items-center gap-2 text-sm text-[var(--silver)] opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "0ms" }}
          >
            <Link
              href="/governance"
              className="hover:text-[var(--cyan-primary)] transition-colors"
            >
              Governance
            </Link>
            <span>/</span>
            <span className="text-[var(--platinum)]">TSC</span>
          </div>

          {/* Title with kinetic typography */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight">
            <span
              className="block opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none text-gradient-bioluminescent"
              style={{ animationDelay: "80ms" }}
            >
              TECHNICAL STEERING COMMITTEE
            </span>
          </h1>

          {/* Badge with radial glow */}
          <div
            className="relative inline-flex opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none group"
            style={{ animationDelay: `${subheadDelay}ms` }}
          >
            {/* Subtle radial glow behind badge */}
            <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-10 blur-xl rounded-full group-hover:opacity-20 transition-opacity duration-300" />
            <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/5 group-hover:border-[var(--cyan-primary)]/40 transition-colors">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-sm font-medium text-[var(--cyan-primary)]">
                11 Voting Members
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-[var(--platinum-dim)] max-w-2xl mx-auto leading-relaxed opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: `${subheadDelay + 80}ms` }}
          >
            The meritocratic council that holds final authority over
            <span className="italic-accent text-[var(--platinum)]">
              {" "}
              technical decisions
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
