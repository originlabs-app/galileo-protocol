'use client';

export function VetoCallout() {
  return (
    <section className="section bg-[var(--obsidian)] grain-texture">
      <div className="container">
        <div
          className="max-w-3xl mx-auto opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: '100ms' }}
        >
          {/* Veto Callout Card with material depth */}
          <div className="veto-callout relative p-5 md:p-8 rounded-xl material-depth border border-[var(--cyan-primary)]/20 overflow-hidden group">
            {/* Glowing cyan border */}
            <div className="absolute left-0 top-0 bottom-0 w-1">
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--cyan-primary)] via-[var(--cyan-dim)] to-[var(--cyan-primary)]" />
              <div className="absolute inset-0 bg-[var(--cyan-primary)] blur-md opacity-50" />
            </div>

            {/* Icon with halo */}
            <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-20 blur-xl rounded-xl transition-opacity duration-300" />
                <div className="relative w-14 h-14 rounded-xl bg-[var(--cyan-primary)]/10 flex items-center justify-center text-[var(--cyan-primary)] group-hover:bg-[var(--cyan-primary)]/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <div className="flex-grow">
                {/* Title */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-[var(--cyan-primary)] uppercase tracking-wide">
                    Breaking Change Protections
                  </h3>
                </div>

                {/* Main Statement */}
                <p className="text-lg text-[var(--platinum)] leading-relaxed mb-6">
                  Any TSC member may <span className="text-[var(--cyan-primary)] font-semibold">veto</span> a proposed
                  breaking change. This ensures that no specification modification that would harm existing
                  implementations can be rushed through.
                </p>

                {/* Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--cyan-primary)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[var(--cyan-primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--platinum)]">Single-Member Veto:</span>
                      <span className="text-[var(--silver)]"> Any one TSC member can block a breaking change.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--cyan-primary)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[var(--cyan-primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--platinum)]">Override Threshold:</span>
                      <span className="text-[var(--silver)]"> Requires unanimous TSC consent or 2/3 Governing Board vote.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--cyan-primary)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[var(--cyan-primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--platinum)]">Resolution Period:</span>
                      <span className="text-[var(--silver)]"> 90-day mandatory negotiation period after any veto.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why This Matters */}
            <div className="mt-8 pt-6 border-t border-[var(--platinum)]/10">
              <p className="text-sm text-[var(--silver)] leading-relaxed">
                <span className="text-[var(--cyan-dim)] font-medium">Why this matters:</span> Luxury brands invest
                heavily in implementing the Galileo standard. This protection ensures their implementations won&apos;t
                be broken by hasty specification changes, building the trust necessary for widespread adoption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
