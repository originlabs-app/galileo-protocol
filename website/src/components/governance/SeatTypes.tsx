"use client";

import { BentoCard } from "@/components/ui/BentoCard";

const seatTypes = [
  {
    title: "Elected Seats",
    count: 6,
    color: "var(--cyan-primary)",
    variant: "default" as const,
    description:
      "Chosen by active contributors through annual elections. Represents the meritocratic core of the TSC.",
    requirements: [
      "12 months of active contribution",
      "Self-nomination or peer nomination",
      "Ranked-choice voting by contributors",
    ],
    term: "2-year terms, max 2 consecutive",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
  {
    title: "Appointed Seats",
    count: 3,
    color: "var(--precision-blue)",
    variant: "blue" as const,
    description:
      "Selected by the Governing Board to fill expertise and diversity gaps. Ensures geographic and industry segment balance.",
    requirements: [
      "Fill expertise gaps in elected TSC",
      "Geographic or segment diversity",
      "Approved by Board majority vote",
    ],
    term: "Renewable 2-year terms",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "Founding Partners",
    count: 2,
    color: "var(--emerald-primary)",
    variant: "default" as const,
    description:
      "Reserved for founding organizations during the launch phase. Ensures early stewardship while maintaining meritocratic long-term governance.",
    requirements: [
      "Founding Partner organization",
      "Jointly nominated by partners",
      "Seats convert to elected on expiry",
    ],
    term: "Sunset after 3 years",
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
        />
      </svg>
    ),
  },
];

export function SeatTypes() {
  return (
    <section className="section bg-[var(--graphite)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-[var(--platinum)] mb-4">Seat Composition</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            Three distinct pathways to TSC membership, each serving a unique
            purpose.
          </p>
        </div>

        {/* Cards Grid with stagger */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {seatTypes.map((seat, i) => (
            <div
              key={seat.title}
              className="opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
              style={{ animationDelay: `${200 + i * 60}ms` }}
            >
              <BentoCard size="small" variant={seat.variant}>
                <div className="flex flex-col h-full group">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon with halo glow */}
                    <div className="relative">
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 blur-xl rounded-xl transition-opacity duration-300"
                        style={{ background: seat.color }}
                      />
                      <div
                        className="relative w-14 h-14 rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: `${seat.color}15` }}
                      >
                        <div style={{ color: seat.color }}>{seat.icon}</div>
                      </div>
                    </div>
                    <div
                      className="text-3xl font-bold transition-all duration-300 group-hover:scale-110"
                      style={{ color: seat.color }}
                    >
                      {seat.count}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-serif text-xl text-[var(--platinum)] mb-2">
                    {seat.title}
                  </h3>
                  <p className="text-[var(--silver)] text-sm leading-relaxed mb-4 flex-grow">
                    {seat.description}
                  </p>

                  {/* Requirements */}
                  <div className="space-y-2 mb-4 pt-4 border-t border-[var(--platinum)]/10">
                    {seat.requirements.map((req, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-[var(--silver)]"
                      >
                        <svg
                          className="w-3 h-3 mt-0.5 flex-shrink-0"
                          style={{ color: seat.color }}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {req}
                      </div>
                    ))}
                  </div>

                  {/* Term */}
                  <div className="text-xs text-[var(--pewter)]">
                    <span className="uppercase tracking-wider">Term:</span>{" "}
                    <span className="text-[var(--silver)]">{seat.term}</span>
                  </div>
                </div>
              </BentoCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
