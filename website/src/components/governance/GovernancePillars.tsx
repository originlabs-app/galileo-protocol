"use client";

import Link from "next/link";
import { BentoCard } from "@/components/ui/BentoCard";

export function GovernancePillars() {
  return (
    <section className="section bg-[var(--graphite)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-[var(--platinum)] mb-4">Governance Pillars</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            Three interconnected structures ensure balanced decision-making and
            sustainable growth.
          </p>
        </div>

        {/* Asymmetric Grid Layout */}
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Large Card - TSC */}
          <BentoCard
            size="large"
            variant="default"
            className="lg:row-span-2 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "200ms" } as React.CSSProperties}
          >
            <div className="h-full flex flex-col">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-[var(--cyan-primary)]/10 flex items-center justify-center mb-6">
                <svg
                  className="w-7 h-7 text-[var(--cyan-primary)]"
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
              </div>

              {/* Content */}
              <h3 className="font-serif text-2xl text-[var(--platinum)] mb-2">
                Technical Steering Committee
              </h3>
              <p className="text-[var(--cyan-dim)] text-sm font-medium mb-4 opacity-80">
                11 Voting Members
              </p>
              <p className="text-[var(--silver)] text-sm leading-relaxed mb-6 flex-grow">
                The TSC holds final authority over specification changes, RFC
                approvals, and technical direction. Composed of elected
                contributors, appointed industry experts, and founding partners.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 pt-4 border-t border-[var(--platinum)]/10">
                <div>
                  <div className="text-2xl font-semibold text-[var(--cyan-primary)]">
                    6
                  </div>
                  <div className="text-xs text-[var(--silver)]">Elected</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-[var(--precision-blue)]">
                    3
                  </div>
                  <div className="text-xs text-[var(--silver)]">Appointed</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-[var(--emerald-primary)]">
                    2
                  </div>
                  <div className="text-xs text-[var(--silver)]">Founding</div>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/governance/tsc"
                className="inline-flex items-center gap-2 text-[var(--cyan-primary)] text-sm font-medium hover:underline"
              >
                Learn about the TSC
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </BentoCard>

          {/* Small Card - Contribution Process */}
          <BentoCard
            size="small"
            variant="blue"
            className="opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "260ms" } as React.CSSProperties}
          >
            <div className="flex flex-col h-full group">
              {/* Icon with halo */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-[var(--precision-blue)] opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-300" />
                <div className="relative w-12 h-12 rounded-xl bg-[var(--precision-blue)]/10 flex items-center justify-center group-hover:bg-[var(--precision-blue)]/15 transition-colors">
                  <svg
                    className="w-6 h-6 text-[var(--precision-blue)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-serif text-xl text-[var(--platinum)] mb-2">
                Contribution Process
              </h3>
              <p className="text-[var(--silver)] text-sm leading-relaxed mb-4 flex-grow">
                All changes go through RFC review. Contributors earn recognition
                through quality and consistency.
              </p>

              {/* Steps */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--silver)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--precision-blue)]/20 flex items-center justify-center text-[var(--precision-blue)] font-medium">
                    1
                  </span>
                  RFC Draft + Champion Assigned
                </div>
                <div className="flex items-center gap-2 text-[var(--silver)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--precision-blue)]/20 flex items-center justify-center text-[var(--precision-blue)] font-medium">
                    2
                  </span>
                  Review (2wk / 30d / 60d)
                </div>
                <div className="flex items-center gap-2 text-[var(--silver)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--precision-blue)]/20 flex items-center justify-center text-[var(--precision-blue)] font-medium">
                    3
                  </span>
                  TSC Decision (Lazy Consensus)
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Small Card - Open Participation */}
          <BentoCard
            size="small"
            variant="default"
            className="opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "320ms" } as React.CSSProperties}
          >
            <div className="flex flex-col h-full group">
              {/* Icon with halo */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-300" />
                <div className="relative w-12 h-12 rounded-xl bg-[var(--cyan-primary)]/10 flex items-center justify-center group-hover:bg-[var(--cyan-primary)]/15 transition-colors">
                  <svg
                    className="w-6 h-6 text-[var(--cyan-primary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-serif text-xl text-[var(--platinum)] mb-2">
                Open Participation
              </h3>
              <p className="text-[var(--silver)] text-sm leading-relaxed mb-4 flex-grow">
                Progressive recognition based on contribution. No dues required.
              </p>

              {/* Participation levels */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--silver)]">Contributor</span>
                  <span className="text-[var(--pewter)]">
                    Open, DCO sign-off
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--silver)]">
                    Active Contributor
                  </span>
                  <span className="text-[var(--pewter)]">TSC eligible</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--cyan-primary)]">TSC Member</span>
                  <span className="text-[var(--cyan-primary)]">
                    Elected / appointed
                  </span>
                </div>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
