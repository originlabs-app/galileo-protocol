"use client";

import { useEffect, useRef, useState } from "react";

const useCases = [
  {
    id: "watches",
    category: "Haute Horlogerie",
    title: "Timepieces",
    description:
      "Service history, authenticity evidence, and provenance tracking for fine timepieces.",
    brands: [
      "Swiss Manufactures",
      "Independent Watchmakers",
      "Certified Dealers",
    ],
    metrics: { value: "Global", label: "Market reach" },
    visual: (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          opacity="0.3"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.5"
        />
        <circle
          cx="60"
          cy="60"
          r="40"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="30"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="60"
          y1="60"
          x2="80"
          y2="60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="4" fill="currentColor" />
        {[...Array(12)].map((_, i) => {
          const angle = ((i * 30 - 90) * Math.PI) / 180;
          const x1 = 60 + Math.cos(angle) * 36;
          const y1 = 60 + Math.sin(angle) * 36;
          const x2 = 60 + Math.cos(angle) * 40;
          const y2 = 60 + Math.sin(angle) * 40;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    ),
  },
  {
    id: "fashion",
    category: "Maroquinerie",
    title: "Leather Goods",
    description:
      "Give each product a verifiable record that can support authentication checks across its lifecycle.",
    brands: ["Heritage Maisons", "Global Luxury Groups", "Artisan Ateliers"],
    metrics: { value: "∞", label: "Traceability depth" },
    visual: (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <rect
          x="25"
          y="35"
          width="70"
          height="50"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <rect
          x="30"
          y="40"
          width="60"
          height="40"
          rx="2"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M45 35 L45 25 Q60 15 75 25 L75 35"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <rect
          x="50"
          y="55"
          width="20"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
        <circle cx="60" cy="60" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "jewelry",
    category: "Joaillerie",
    title: "Fine Jewelry",
    description:
      "Diamond certification, gem provenance, and ethical sourcing - all immutably recorded.",
    brands: ["High Jewelry Houses", "Estate Dealers", "Certified Gemologists"],
    metrics: { value: "4C+", label: "Certification depth" },
    visual: (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <polygon
          points="60,15 85,45 75,95 45,95 35,45"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <line
          x1="35"
          y1="45"
          x2="85"
          y2="45"
          stroke="currentColor"
          strokeWidth="1"
        />
        <line
          x1="45"
          y1="95"
          x2="60"
          y2="45"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <line
          x1="75"
          y1="95"
          x2="60"
          y2="45"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <line
          x1="60"
          y1="15"
          x2="60"
          y2="45"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <circle cx="60" cy="55" r="3" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "art",
    category: "Art & Collectibles",
    title: "Fine Art",
    description:
      "Provenance chains for masterpieces. Exhibition history, restoration records, ownership lineage.",
    brands: ["Major Auction Houses", "Private Galleries", "Estate Collections"],
    metrics: { value: "∞", label: "Provenance depth" },
    visual: (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <rect
          x="20"
          y="20"
          width="80"
          height="80"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <rect
          x="25"
          y="25"
          width="70"
          height="70"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
          opacity="0.3"
        />
        <rect
          x="35"
          y="35"
          width="50"
          height="50"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        <circle
          cx="50"
          cy="55"
          r="8"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M65 45 Q75 55 65 65"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    ),
  },
];

export function UseCasesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCase, setActiveCase] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-black overflow-hidden"
    >
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000810] via-black to-black" />

      {/* Gold accent glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(ellipse, #D4AF37 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-6 md:px-8 relative z-10">
        {/* Header */}
        <div
          className="max-w-3xl mx-auto text-center mb-20"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 40}px)`,
            transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-amber-500/30" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-amber-400/60">
              Applications
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-amber-500/30" />
          </div>

          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-extralight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Where Luxury
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
              Meets Evidence
            </span>
          </h2>

          <p className="mt-8 text-base text-white/40 leading-relaxed max-w-xl mx-auto">
            From horlogerie to haute couture, Galileo helps brands attach
            stronger verification records to high-value luxury objects.
          </p>
        </div>

        {/* Use cases grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {useCases.map((useCase, index) => (
            <div
              key={useCase.id}
              className="group relative"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: `translateY(${isVisible ? 0 : 40}px)`,
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + index * 0.1}s`,
              }}
              onMouseEnter={() => setActiveCase(useCase.id)}
              onMouseLeave={() => setActiveCase(null)}
            >
              <div
                className="relative p-8 md:p-10 h-full border transition-all duration-500"
                style={{
                  background:
                    activeCase === useCase.id
                      ? "linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, transparent 60%)"
                      : "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, transparent 60%)",
                  borderColor:
                    activeCase === useCase.id
                      ? "rgba(212, 175, 55, 0.3)"
                      : "rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Visual */}
                <div className="flex items-start justify-between mb-8">
                  <div
                    className="w-20 h-20 transition-all duration-500"
                    style={{
                      color:
                        activeCase === useCase.id
                          ? "#D4AF37"
                          : "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {useCase.visual}
                  </div>

                  {/* Metrics */}
                  <div className="text-right">
                    <div
                      className="text-2xl font-light transition-colors duration-500"
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        color:
                          activeCase === useCase.id
                            ? "#D4AF37"
                            : "rgba(212, 175, 55, 0.5)",
                      }}
                    >
                      {useCase.metrics.value}
                    </div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider">
                      {useCase.metrics.label}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <span className="text-[10px] tracking-[0.3em] uppercase text-amber-400/60">
                  {useCase.category}
                </span>

                {/* Title */}
                <h3
                  className="mt-2 text-2xl font-light text-white"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {useCase.title}
                </h3>

                {/* Description */}
                <p className="mt-4 text-sm text-white/60 leading-relaxed">
                  {useCase.description}
                </p>

                {/* Brands */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {useCase.brands.map((brand) => (
                    <span
                      key={brand}
                      className="px-3 py-1 text-[10px] border transition-colors duration-300"
                      style={{
                        borderColor:
                          activeCase === useCase.id
                            ? "rgba(212, 175, 55, 0.3)"
                            : "rgba(255, 255, 255, 0.15)",
                        color:
                          activeCase === useCase.id
                            ? "rgba(212, 175, 55, 0.8)"
                            : "rgba(255, 255, 255, 0.5)",
                      }}
                    >
                      {brand}
                    </span>
                  ))}
                </div>

                {/* Bottom accent - visible by default, brighter on hover */}
                <div
                  className="absolute bottom-0 left-0 h-[1px] transition-all duration-500"
                  style={{
                    width: activeCase === useCase.id ? "100%" : "30%",
                    background:
                      activeCase === useCase.id
                        ? "linear-gradient(90deg, #D4AF37, transparent)"
                        : "linear-gradient(90deg, rgba(212, 175, 55, 0.3), transparent)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div
          className="mt-16 text-center"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 1s ease-out 0.8s",
          }}
        >
          <p className="text-sm text-white/20 italic">
            &ldquo;In luxury, authenticity depends on evidence customers and
            partners can inspect.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
