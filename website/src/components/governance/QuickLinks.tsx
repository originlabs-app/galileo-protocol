'use client';

import Link from 'next/link';

const links = [
  {
    title: 'Charter',
    description: 'Full governance charter and bylaws',
    href: '/docs/governance/charter',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Contributing',
    description: 'How to contribute to Galileo',
    href: '/docs/contributing',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    title: 'Versioning',
    description: 'Semantic versioning policy',
    href: '/docs/versioning',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    title: 'Code of Conduct',
    description: 'Community standards and expectations',
    href: '/docs/code-of-conduct',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: 'RFC Process',
    description: 'How to propose specification changes',
    href: '/docs/rfc-process',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
  {
    title: 'License',
    description: 'Apache 2.0 license details',
    href: '/docs/license',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
];

export function QuickLinks() {
  return (
    <section className="section bg-[var(--obsidian)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: '100ms' }}
        >
          <h2 className="text-[var(--platinum)] mb-4">Quick Links</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            Essential governance documentation and resources.
          </p>
        </div>

        {/* 2x3 Grid with stagger */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {links.map((link, i) => (
            <Link
              key={link.title}
              href={link.href}
              className="group relative p-6 rounded-xl material-depth hover:scale-[1.02] transition-all duration-300 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: `${200 + i * 60}ms` }}
            >
              {/* Ambient glow on hover */}
              <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-[0.03] blur-2xl rounded-xl transition-opacity duration-300" />

              {/* Icon with halo */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-300" />
                <div className="relative w-12 h-12 rounded-xl bg-[var(--cyan-primary)]/10 flex items-center justify-center text-[var(--cyan-primary)] group-hover:bg-[var(--cyan-primary)]/20 transition-colors">
                  {link.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-[var(--platinum)] mb-1 group-hover:text-[var(--cyan-primary)] transition-colors">
                {link.title}
              </h3>
              <p className="text-sm text-[var(--silver)]">{link.description}</p>

              {/* Arrow */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                <svg className="w-5 h-5 text-[var(--cyan-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
