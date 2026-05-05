"use client";

import { useState } from "react";

// Seat configuration
const seats = [
  // Top row - Chair
  {
    id: "chair",
    type: "founding",
    label: "Chair",
    angle: 90,
    row: 0,
    member: "Founding Partner",
    org: "Transitional",
  },

  // Second row - Elected seats
  {
    id: "e1",
    type: "elected",
    label: "E1",
    angle: 60,
    row: 1,
    member: "Elected Seat 1",
    org: "Open",
  },
  {
    id: "e2",
    type: "elected",
    label: "E2",
    angle: 120,
    row: 1,
    member: "Elected Seat 2",
    org: "Open",
  },

  // Third row - Mixed
  {
    id: "e3",
    type: "elected",
    label: "E3",
    angle: 45,
    row: 2,
    member: "Elected Seat 3",
    org: "Open",
  },
  {
    id: "a1",
    type: "appointed",
    label: "A1",
    angle: 90,
    row: 2,
    member: "Appointed Seat 1",
    org: "Industry Expert",
  },
  {
    id: "e4",
    type: "elected",
    label: "E4",
    angle: 135,
    row: 2,
    member: "Elected Seat 4",
    org: "Open",
  },

  // Fourth row - Mixed
  {
    id: "e5",
    type: "elected",
    label: "E5",
    angle: 30,
    row: 3,
    member: "Elected Seat 5",
    org: "Open",
  },
  {
    id: "a2",
    type: "appointed",
    label: "A2",
    angle: 70,
    row: 3,
    member: "Appointed Seat 2",
    org: "Industry Expert",
  },
  {
    id: "f2",
    type: "founding",
    label: "F2",
    angle: 110,
    row: 3,
    member: "Founding Partner 2",
    org: "Transitional",
  },
  {
    id: "a3",
    type: "appointed",
    label: "A3",
    angle: 150,
    row: 3,
    member: "Appointed Seat 3",
    org: "Industry Expert",
  },

  // Fifth row - Last elected
  {
    id: "e6",
    type: "elected",
    label: "E6",
    angle: 90,
    row: 4,
    member: "Elected Seat 6",
    org: "Open",
  },
];

const seatColors = {
  elected: {
    fill: "var(--cyan-primary)",
    stroke: "var(--cyan-primary)",
    label: "Elected",
  },
  appointed: {
    fill: "var(--precision-blue)",
    stroke: "var(--precision-blue)",
    label: "Appointed",
  },
  founding: {
    fill: "var(--emerald-primary)",
    stroke: "var(--emerald-primary)",
    label: "Founding",
  },
};

export function CouncilSeats() {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  // Calculate seat positions in semi-circle
  const getSeatPosition = (angle: number, row: number) => {
    const centerX = 200;
    const centerY = 220;
    const baseRadius = 40;
    const rowSpacing = 35;

    const radius = baseRadius + row * rowSpacing;
    const radians = (angle * Math.PI) / 180;

    return {
      x: centerX + radius * Math.cos(Math.PI - radians),
      y: centerY - radius * Math.sin(radians),
    };
  };

  return (
    <section className="section bg-[var(--obsidian)] grain-texture">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mb-12 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-[var(--platinum)] mb-4">Council Chamber</h2>
          <p className="text-[var(--silver)] max-w-2xl mx-auto">
            A balanced composition ensuring no single organization dominates
            technical direction.
          </p>
        </div>

        {/* Council Visualization */}
        <div className="max-w-2xl mx-auto">
          <div
            className="relative aspect-[4/3] flex items-center justify-center opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "200ms" }}
          >
            <svg
              viewBox="0 0 400 280"
              className="w-full h-full"
              style={{ maxHeight: "400px" }}
            >
              {/* SVG Filters for glow effects */}
              <defs>
                <filter
                  id="cyanGlow"
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor="#00FFFF" floodOpacity="0.6" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="blueGlow"
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor="#00A3FF" floodOpacity="0.6" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="emeraldGlow"
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor="#00FF88" floodOpacity="0.6" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background arc guides with subtle glow */}
              {[1, 2, 3, 4].map((row) => (
                <g key={row}>
                  {/* Glow behind arc */}
                  <path
                    d={`M ${200 - (40 + row * 35)} 220 A ${40 + row * 35} ${40 + row * 35} 0 0 1 ${200 + (40 + row * 35)} 220`}
                    fill="none"
                    stroke="var(--cyan-primary)"
                    strokeWidth="2"
                    strokeOpacity="0.05"
                    style={{ filter: "blur(4px)" }}
                  />
                  {/* Main arc */}
                  <path
                    d={`M ${200 - (40 + row * 35)} 220 A ${40 + row * 35} ${40 + row * 35} 0 0 1 ${200 + (40 + row * 35)} 220`}
                    fill="none"
                    stroke="var(--platinum)"
                    strokeWidth="0.5"
                    strokeOpacity="0.1"
                    strokeDasharray="4 4"
                  />
                </g>
              ))}

              {/* Seats with stagger animation */}
              {seats.map((seat, i) => {
                const pos = getSeatPosition(seat.angle, seat.row);
                const colors = seatColors[seat.type as keyof typeof seatColors];
                const isHovered = hoveredSeat === seat.id;
                const isVacant = seat.org === "Open";
                const glowFilter =
                  seat.type === "elected"
                    ? "url(#cyanGlow)"
                    : seat.type === "appointed"
                      ? "url(#blueGlow)"
                      : "url(#emeraldGlow)";

                return (
                  <g
                    key={seat.id}
                    onMouseEnter={() => setHoveredSeat(seat.id)}
                    onMouseLeave={() => setHoveredSeat(null)}
                    className="opacity-0 animate-[fadeUp_0.4s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:animate-none"
                    style={{
                      animationDelay: `${300 + i * 50}ms`,
                      cursor: "pointer",
                    }}
                  >
                    {/* Ambient glow - always visible for filled seats */}
                    {!isVacant && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={16}
                        fill={colors.fill}
                        opacity={isHovered ? 0.3 : 0.1}
                        className="transition-opacity duration-300"
                        style={{ filter: "blur(8px)" }}
                      />
                    )}

                    {/* Seat circle with hover glow filter */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={12}
                      fill={isVacant ? "transparent" : `${colors.fill}20`}
                      stroke={colors.stroke}
                      strokeWidth={isVacant ? 1 : 2}
                      strokeDasharray={isVacant ? "3 3" : undefined}
                      opacity={isVacant ? 0.5 : 1}
                      filter={isHovered && !isVacant ? glowFilter : undefined}
                      className="transition-all duration-300"
                      style={{
                        transform: isHovered ? `scale(1.15)` : "scale(1)",
                        transformOrigin: `${pos.x}px ${pos.y}px`,
                      }}
                    />

                    {/* Seat label */}
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      fill={isVacant ? colors.stroke : colors.fill}
                      fontSize="8"
                      fontWeight="600"
                      opacity={isVacant ? 0.5 : 1}
                      className="pointer-events-none"
                    >
                      {seat.label}
                    </text>
                  </g>
                );
              })}

              {/* Central podium indicator with glow */}
              <g>
                <rect
                  x={175}
                  y={235}
                  width={50}
                  height={6}
                  rx={3}
                  fill="var(--cyan-primary)"
                  opacity={0.1}
                  style={{ filter: "blur(4px)" }}
                />
                <rect
                  x={175}
                  y={235}
                  width={50}
                  height={6}
                  rx={3}
                  fill="var(--cyan-primary)"
                  opacity={0.2}
                />
                <text
                  x={200}
                  y={260}
                  textAnchor="middle"
                  fill="var(--silver)"
                  fontSize="9"
                  fontWeight="500"
                  letterSpacing="0.1em"
                >
                  PODIUM
                </text>
              </g>
            </svg>

            {/* Hover Tooltip with material depth */}
            {hoveredSeat && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg material-depth border border-[var(--platinum)]/10 shadow-xl animate-[fadeUp_0.15s_ease-out]">
                <div className="text-sm font-medium text-[var(--platinum)]">
                  {seats.find((s) => s.id === hoveredSeat)?.member}
                </div>
                <div className="text-xs text-[var(--silver)]">
                  {seats.find((s) => s.id === hoveredSeat)?.org}
                </div>
              </div>
            )}
          </div>

          {/* Legend with stagger */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8">
            {Object.entries(seatColors).map(([type, colors], i) => (
              <div
                key={type}
                className="flex items-center gap-2 opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
                style={{ animationDelay: `${500 + i * 60}ms` }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: colors.fill,
                    opacity: 0.8,
                    boxShadow: `0 0 8px ${colors.fill}40`,
                  }}
                />
                <span className="text-sm text-[var(--silver)]">
                  {colors.label}
                </span>
                <span className="text-sm text-[var(--pewter)]">
                  ({type === "elected" ? "6" : type === "appointed" ? "3" : "2"}
                  )
                </span>
              </div>
            ))}
          </div>

          {/* Anti-Dominance Badge with glow */}
          <div
            className="mt-8 text-center opacity-0 translate-y-[20px] animate-[fadeUp_0.5s_var(--ease-reveal)_forwards] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none"
            style={{ animationDelay: "700ms" }}
          >
            <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/5 group hover:border-[var(--cyan-primary)]/40 transition-colors">
              {/* Badge glow on hover */}
              <div className="absolute inset-0 bg-[var(--cyan-primary)] opacity-0 group-hover:opacity-10 blur-xl rounded-full transition-opacity duration-300" />
              <svg
                className="relative w-4 h-4 text-[var(--cyan-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="relative text-sm font-medium text-[var(--cyan-primary)]">
                No organization may hold more than 2 seats
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
