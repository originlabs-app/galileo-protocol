'use client';

const transparencyItems = [
  {
    aspect: 'Deliberations',
    visibility: 'Private',
    description: 'TSC discussions are confidential to enable candid debate',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ),
    color: 'var(--pewter)',
  },
  {
    aspect: 'Decisions',
    visibility: 'Published within 7 days',
    description: 'All TSC votes and outcomes are made public',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'var(--success)',
  },
  {
    aspect: 'Meeting Minutes',
    visibility: 'Public summary within 14 days',
    description: 'High-level summaries of TSC meetings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'var(--precision-blue)',
  },
  {
    aspect: 'RFCs',
    visibility: 'Fully Public',
    description: 'All proposals and discussions are open',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'var(--cyan-primary)',
  },
  {
    aspect: 'Specification Changes',
    visibility: 'Fully Public',
    description: 'Git history and changelogs for all modifications',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    color: 'var(--cyan-primary)',
  },
];

export function TransparencyCommitment() {
  return (
    <section className="section bg-[var(--graphite)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: '100ms' }}
        >
          <h2 className="text-[var(--platinum)] mb-4">Transparency Commitment</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            Balancing open governance with the need for confidential deliberation.
          </p>
        </div>

        {/* Glass Card Table with Material Depth */}
        <div
          className="max-w-3xl mx-auto opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: '200ms' }}
        >
          <div className="glass-card material-depth overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 p-4 border-b border-[var(--platinum)]/10 bg-[var(--slate)]/50">
              <div className="text-sm font-semibold text-[var(--platinum)] uppercase tracking-wider">Aspect</div>
              <div className="text-sm font-semibold text-[var(--platinum)] uppercase tracking-wider text-right">Visibility</div>
            </div>

            {/* Table Rows with stagger + hover glow */}
            <div className="divide-y divide-[var(--platinum)]/5">
              {transparencyItems.map((item, i) => (
                <div
                  key={item.aspect}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 p-4 hover:bg-[var(--slate)]/50 hover:shadow-[inset_0_0_20px_rgba(0,255,255,0.05)] transition-all duration-300 group opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
                  style={{ animationDelay: `${260 + i * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon with halo */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 blur-lg rounded-lg transition-opacity duration-300"
                        style={{ background: item.color }}
                      />
                      <div
                        className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: `${item.color}15` }}
                      >
                        <div style={{ color: item.color }}>{item.icon}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-[var(--platinum)] group-hover:text-[var(--cyan-dim)] transition-colors">{item.aspect}</div>
                      <div className="text-sm text-[var(--silver)] mt-0.5">{item.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 group-hover:scale-105"
                      style={{
                        background: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {item.visibility}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div
          className="mt-12 max-w-2xl mx-auto text-center opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: '600ms' }}
        >
          <p className="text-[var(--silver)] text-sm leading-relaxed">
            <span className="text-[var(--cyan-dim)]">Why private deliberations?</span> Competing luxury houses need assurance
            that preliminary discussions won&apos;t be leaked to competitors. Once a decision is reached, full transparency
            ensures accountability.
          </p>
        </div>
      </div>
    </section>
  );
}
