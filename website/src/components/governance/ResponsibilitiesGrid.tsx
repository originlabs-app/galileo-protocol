"use client";

import { BentoCard } from "@/components/ui/BentoCard";

const responsibilities = [
  {
    title: "Specification Approval",
    description:
      "Final authority on accepting, modifying, or rejecting specification changes.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "RFC Decisions",
    description:
      "Review and vote on Request for Comments proposals from the community.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: "Technical Roadmap",
    description:
      "Set priorities for future development and coordinate release timelines.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    title: "Architecture Integrity",
    description:
      "Ensure changes maintain backwards compatibility and design consistency.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    title: "Working Groups",
    description:
      "Charter and oversee specialized working groups for focused development.",
    icon: (
      <svg
        className="w-6 h-6"
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
    ),
  },
  {
    title: "Standards Liaison",
    description:
      "Represent Galileo in external standards bodies (W3C, GS1, ISO).",
    icon: (
      <svg
        className="w-6 h-6"
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
    ),
  },
];

export function ResponsibilitiesGrid() {
  return (
    <section className="section bg-[var(--graphite)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-[var(--platinum)] mb-4">TSC Responsibilities</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            The Technical Steering Committee holds authority over all technical
            aspects of the Galileo standard.
          </p>
        </div>

        {/* 2x3 Grid with BentoCard */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {responsibilities.map((item, i) => (
            <div
              key={item.title}
              className="opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: `${200 + i * 60}ms` }}
            >
              <BentoCard size="small" variant="default">
                <div className="flex flex-col h-full group">
                  {/* Icon with halo glow */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-300" />
                    <div className="relative w-12 h-12 rounded-xl bg-[var(--cyan-primary)]/10 flex items-center justify-center text-[var(--cyan-primary)] group-hover:bg-[var(--cyan-primary)]/15 transition-colors">
                      {item.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-[var(--platinum)] mb-2 group-hover:text-[var(--cyan-primary)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--silver)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </BentoCard>
            </div>
          ))}
        </div>

        {/* Decision Process Note */}
        <div
          className="mt-12 text-center opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "600ms" }}
        >
          <p className="text-[var(--silver)] text-sm">
            Decisions require{" "}
            <span className="text-[var(--cyan-primary)] font-medium">
              simple majority
            </span>{" "}
            vote unless otherwise specified. Quorum is two-thirds of voting
            members.
          </p>
        </div>
      </div>
    </section>
  );
}
