'use client';

const electionSteps = [
  {
    month: 'September',
    title: 'Nominations Open',
    description: 'Contributors may nominate themselves or others. Nominees must accept and meet eligibility requirements.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    duration: '2 weeks',
  },
  {
    month: 'September',
    title: 'Campaign Period',
    description: 'Nominees present their vision for the standard. Community Q&A sessions and written platforms.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    duration: '2 weeks',
  },
  {
    month: 'October',
    title: 'Voting Period',
    description: 'Eligible contributors cast ranked-choice votes. One vote per person, verified through commit history.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    duration: '1 week',
  },
  {
    month: 'October',
    title: 'Results Announced',
    description: 'Winners announced with full vote tallies. Transition planning for outgoing members begins.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    duration: 'Within 7 days',
  },
  {
    month: 'January 1',
    title: 'New Term Begins',
    description: 'Elected members officially take their seats. Onboarding and handoff from predecessors.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    duration: 'New year',
  },
];

export function ElectionTimeline() {
  return (
    <section className="section bg-[var(--obsidian)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: '100ms' }}
        >
          <h2 className="text-[var(--platinum)] mb-4">Election Cycle</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            Annual elections ensure fresh perspectives while maintaining continuity through staggered terms.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            {electionSteps.map((step, index) => (
              <div
                key={step.title}
                className="relative flex gap-6 pb-12 last:pb-0 group opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
                style={{ animationDelay: `${200 + index * 60}ms` }}
              >
                {/* Vertical Line with glow */}
                {index < electionSteps.length - 1 && (
                  <>
                    <div className="absolute left-[19px] top-10 bottom-0 w-2 bg-gradient-to-b from-[var(--cyan-primary)] to-[var(--cyan-primary)]/10 opacity-20 blur-sm" />
                    <div className="absolute left-[19px] top-10 bottom-0 w-[0.5px] bg-gradient-to-b from-[var(--cyan-primary)] to-[var(--cyan-primary)]/20" />
                  </>
                )}

                {/* Node with ambient glow */}
                <div className="flex-shrink-0 relative">
                  <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-20 blur-lg rounded-full group-hover:opacity-30 transition-opacity duration-300" />
                  <div className="relative w-10 h-10 rounded-full border-2 border-[var(--cyan-primary)] bg-[var(--cyan-primary)]/10 flex items-center justify-center text-[var(--cyan-primary)] group-hover:bg-[var(--cyan-primary)]/20 transition-colors">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-[var(--cyan-primary)] uppercase tracking-wider">
                      {step.month}
                    </span>
                    <span className="text-xs text-[var(--pewter)]">{step.duration}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--platinum)] mb-2 group-hover:text-[var(--cyan-primary)] transition-colors">{step.title}</h3>
                  <p className="text-sm text-[var(--silver)] leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Staggered Terms Info with material depth */}
          <div
            className="mt-12 p-6 rounded-xl material-depth overflow-hidden opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: '550ms' }}
          >
            <div className="flex items-start gap-4 group">
              {/* Icon with halo */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-[var(--precision-blue)] opacity-0 group-hover:opacity-20 blur-xl rounded-lg transition-opacity duration-300" />
                <div className="relative w-10 h-10 rounded-lg bg-[var(--precision-blue)]/10 flex items-center justify-center text-[var(--precision-blue)] group-hover:bg-[var(--precision-blue)]/15 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--platinum)] mb-1 group-hover:text-[var(--precision-blue)] transition-colors">Staggered Terms</h4>
                <p className="text-sm text-[var(--silver)] leading-relaxed">
                  Only 3 elected seats are up for election each year, ensuring institutional memory
                  and preventing complete turnover. Terms are 2 years, renewable once. After two consecutive terms,
                  a 1-year gap is required before re-election.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
