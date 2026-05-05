"use client";

import { useState } from "react";

const stages = [
  {
    id: "draft",
    name: "Draft",
    status: "Initial proposal under development",
    description:
      "Community input welcome. Not suitable for production use. May change substantially or be withdrawn.",
    duration: "Until accepted",
    color: "var(--warning)",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    id: "active",
    name: "Active",
    status: "Accepted and being implemented",
    description:
      "TSC approved. Reference implementations in development. Breaking changes still possible with notice.",
    duration: "Minimum 6 months",
    color: "var(--precision-blue)",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    id: "standard",
    name: "Standard",
    status: "Stable and implementation-ready",
    description:
      "Fully implemented with test suites. Breaking changes require major version bump, 60-day RFC review, and veto-free TSC approval.",
    duration: "Ongoing",
    color: "var(--success)",
    icon: (
      <svg
        className="w-5 h-5"
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
    id: "deprecated",
    name: "Deprecated",
    status: "Scheduled for removal",
    description:
      "No longer recommended for new implementations. Security patches only. 10-year sunset period for graceful migration.",
    duration: "10 years",
    color: "var(--error)",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export function LifecycleTimeline() {
  const [activeStage, setActiveStage] = useState<string | null>(null);

  return (
    <section className="section bg-[var(--obsidian)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-16 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-[var(--platinum)] mb-4">
            Specification Lifecycle
          </h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            Every specification follows a defined lifecycle, from initial draft
            to eventual deprecation.
          </p>
        </div>

        {/* Horizontal Timeline - Desktop */}
        <div className="hidden md:block max-w-4xl mx-auto">
          {/* Timeline Bar */}
          <div className="relative">
            {/* Glowing line behind timeline bar */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--cyan-primary)]/20 to-transparent blur-sm" />
            {/* Background line */}
            <div className="absolute top-6 left-0 right-0 h-[0.5px] bg-gradient-to-r from-transparent via-[var(--cyan-primary)]/30 to-transparent" />

            {/* Nodes with stagger */}
            <div className="flex justify-between relative">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="relative flex flex-col items-center opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
                  style={{ animationDelay: `${200 + index * 80}ms` }}
                  onMouseEnter={() => setActiveStage(stage.id)}
                  onMouseLeave={() => setActiveStage(null)}
                >
                  {/* Connector to next */}
                  {index < stages.length - 1 && (
                    <div
                      className="absolute top-6 left-1/2 h-[0.5px] w-full"
                      style={{
                        background: `linear-gradient(90deg, ${stage.color}, ${stages[index + 1].color})`,
                        opacity: 0.5,
                      }}
                    />
                  )}

                  {/* Node */}
                  <div
                    className={`
                      timeline-node relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center
                      cursor-pointer transition-all duration-300
                      ${activeStage === stage.id ? "scale-110" : "scale-100"}
                    `}
                    style={{
                      borderColor: stage.color,
                      background:
                        activeStage === stage.id
                          ? `${stage.color}20`
                          : "var(--obsidian)",
                      boxShadow:
                        activeStage === stage.id
                          ? `0 0 20px ${stage.color}40`
                          : "none",
                    }}
                  >
                    <div style={{ color: stage.color }}>{stage.icon}</div>

                    {/* Tick marks - horological style */}
                    <div className="absolute inset-0">
                      {[0, 90, 180, 270].map((angle) => (
                        <div
                          key={angle}
                          className="absolute w-[1px] h-1 bg-current opacity-30"
                          style={{
                            color: stage.color,
                            top: "2px",
                            left: "50%",
                            transformOrigin: "50% 22px",
                            transform: `translateX(-50%) rotate(${angle}deg)`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="mt-4 text-center">
                    <div
                      className="font-semibold text-[var(--platinum)]"
                      style={{
                        color:
                          activeStage === stage.id ? stage.color : undefined,
                      }}
                    >
                      {stage.name}
                    </div>
                    <div className="text-xs text-[var(--silver)] mt-1">
                      {stage.duration}
                    </div>
                  </div>

                  {/* Detail Popup with material depth */}
                  {activeStage === stage.id && (
                    <div
                      className="absolute top-full mt-8 w-64 p-4 rounded-lg material-depth shadow-xl z-20 animate-[fadeUp_0.2s_ease-out]"
                      style={{ borderColor: `${stage.color}30` }}
                    >
                      <div
                        className="text-sm font-medium mb-2"
                        style={{ color: stage.color }}
                      >
                        {stage.status}
                      </div>
                      <p className="text-xs text-[var(--silver)] leading-relaxed">
                        {stage.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Timeline - Vertical */}
        <div className="md:hidden space-y-0">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex gap-4">
              {/* Vertical Line & Node */}
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: stage.color,
                    background: `${stage.color}10`,
                  }}
                >
                  <div style={{ color: stage.color }}>{stage.icon}</div>
                </div>
                {index < stages.length - 1 && (
                  <div
                    className="w-[0.5px] h-24 my-2"
                    style={{
                      background: `linear-gradient(to bottom, ${stage.color}, ${stages[index + 1].color})`,
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-8 flex-grow">
                <h3
                  className="font-semibold text-[var(--platinum)]"
                  style={{ color: stage.color }}
                >
                  {stage.name}
                </h3>
                <p className="text-xs text-[var(--silver)] mt-1">
                  {stage.duration}
                </p>
                <p className="text-sm text-[var(--silver)] mt-2 leading-relaxed">
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 10-Year Sunset Callout with stagger */}
        <div
          className="mt-16 max-w-2xl mx-auto text-center opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "600ms" }}
        >
          <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--error)]/20 bg-[var(--error)]/5 group hover:border-[var(--error)]/40 transition-colors">
            {/* Badge glow on hover */}
            <div className="absolute inset-0 bg-[var(--error)] opacity-0 group-hover:opacity-10 blur-xl rounded-full transition-opacity duration-300" />
            <svg
              className="relative w-4 h-4 text-[var(--error)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="relative text-sm text-[var(--error)]">
              10-Year Deprecation Guarantee
            </span>
          </div>
          <p className="text-[var(--silver)] text-sm mt-4 max-w-lg mx-auto">
            Deprecated specifications receive security patches for a full
            decade, ensuring luxury brands have ample time for migration without
            disruption.
          </p>
        </div>
      </div>
    </section>
  );
}
