'use client';

const principles = [
  {
    title: 'Neutrality',
    description: 'No vendor lock-in. No single controlling entity.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Open Source',
    description: 'Apache 2.0 licensed. Free to use and extend.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Merit-Based',
    description: 'Decisions through contribution, not capital.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export function MissionStatement() {
  return (
    <section className="section bg-[var(--obsidian)] grain-texture" id="charter">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Mission Frame with Cyan Precision Lines */}
          <div className="mission-frame relative py-16 px-8 md:px-16">
            {/* Left precision line with glow */}
            <div className="absolute left-0 top-[10%] bottom-[10%] w-[0.5px] bg-gradient-to-b from-transparent via-[var(--cyan-primary)] to-transparent opacity-60" />
            <div className="absolute left-0 top-[10%] bottom-[10%] w-2 bg-gradient-to-b from-transparent via-[var(--cyan-primary)] to-transparent opacity-10 blur-sm" />

            {/* Right precision line with glow */}
            <div className="absolute right-0 top-[10%] bottom-[10%] w-[0.5px] bg-gradient-to-b from-transparent via-[var(--cyan-primary)] to-transparent opacity-60" />
            <div className="absolute right-0 top-[10%] bottom-[10%] w-2 bg-gradient-to-b from-transparent via-[var(--cyan-primary)] to-transparent opacity-10 blur-sm" />

            {/* French Motto with ambient glow */}
            <blockquote
              className="text-center relative opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: '100ms' }}
            >
              {/* Subtle glow behind text */}
              <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-[0.03] blur-3xl" />
              <p className="relative font-serif italic text-2xl md:text-3xl lg:text-4xl text-[var(--platinum)] leading-relaxed mb-8">
                &ldquo;Proteger le patrimoine des marques et le savoir-faire humain&rdquo;
              </p>
              <footer className="relative text-[var(--silver)] text-sm uppercase tracking-[0.2em]">
                The Galileo Mission
              </footer>
            </blockquote>

            {/* Translation */}
            <p
              className="mt-12 text-center text-[var(--silver)] max-w-2xl mx-auto leading-relaxed opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: '200ms' }}
            >
              To protect brand heritage and human craftsmanship. We believe that luxury authenticity
              requires an open standard that no single entity controls, where competing brands
              can collaborate on shared infrastructure while preserving their unique identities.
            </p>

            {/* Core Principles with stagger + icon halos */}
            <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
              {principles.map((principle, i) => (
                <div
                  key={principle.title}
                  className="group space-y-3 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
                  style={{ animationDelay: `${300 + i * 60}ms` }}
                >
                  {/* Icon with halo glow */}
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-300" />
                    <div className="relative w-12 h-12 rounded-full bg-[var(--cyan-primary)]/10 flex items-center justify-center text-[var(--cyan-primary)] group-hover:bg-[var(--cyan-primary)]/15 transition-colors">
                      {principle.icon}
                    </div>
                  </div>
                  <h3 className="text-[var(--platinum)] font-semibold group-hover:text-[var(--cyan-primary)] transition-colors">
                    {principle.title}
                  </h3>
                  <p className="text-[var(--silver)] text-sm">{principle.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
