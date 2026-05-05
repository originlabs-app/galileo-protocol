import { readFileSync } from 'fs';
import { join } from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roadmap',
  description:
    'The technical roadmap for Galileo Protocol — from foundation to open standard for luxury product traceability.',
  alternates: {
    canonical: '/roadmap',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PhaseStatus = 'complete' | 'in-progress' | 'planned' | 'future';
type ItemStatus = 'shipped' | 'in-progress' | 'planned' | 'future' | 'locked';

interface RoadmapItem {
  text: string;
  status: ItemStatus;
}

interface RoadmapSubsection {
  title: string;
  items: RoadmapItem[];
  isLocked: boolean;
}

interface Phase {
  number: number | null;
  name: string;
  goal: string | null;
  status: PhaseStatus;
  subsections: RoadmapSubsection[];
}

interface FutureCategory {
  category: string;
  items: string[];
}

interface ParsedRoadmap {
  vision: string;
  visionQuote: string | null;
  currentStatus: {
    description: string;
    shipped: string[];
    upcoming: string[];
  };
  phases: Phase[];
  baseEcosystem: Phase | null;
  futureDirs: FutureCategory[];
}

// ─── Parsing utilities ────────────────────────────────────────────────────────

function stripEmojis(str: string): string {
  return str
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '')
    .replace(/  +/g, ' ')
    .trim();
}

function detectItemStatus(line: string): ItemStatus {
  if (/✅/.test(line)) return 'shipped';
  if (/🔄/.test(line)) return 'in-progress';
  if (/📋/.test(line)) return 'planned';
  if (/🔒/.test(line)) return 'locked';
  if (/💡/.test(line)) return 'future';
  return 'planned';
}

function detectPhaseStatus(headerLine: string): PhaseStatus {
  if (/✅/.test(headerLine) || /\bComplete\b/i.test(headerLine))
    return 'complete';
  if (/🔄/.test(headerLine) || /In Progress/i.test(headerLine))
    return 'in-progress';
  if (/📋/.test(headerLine) || /\bPlanned\b/i.test(headerLine))
    return 'planned';
  return 'future';
}

/** Parse a ## section that looks like a phase: ### subsections + items */
function parsePhaseBlock(
  lines: string[],
  startIdx: number,
): { subsections: RoadmapSubsection[]; goal: string | null; description: string } {
  const subsections: RoadmapSubsection[] = [];
  let goal: string | null = null;
  const descLines: string[] = [];
  let i = startIdx;

  while (i < lines.length && !lines[i].startsWith('## ')) {
    const l = lines[i];

    if (/\*\*Goal:\*\*/.test(l)) {
      goal = stripEmojis(l.replace(/\*\*Goal:\*\*\s*/, '').replace(/\*\*/g, '')).trim();
      i++;
      continue;
    }

    if (l.startsWith('### ')) {
      const isLocked = /🔒/.test(l);
      const subTitle = stripEmojis(l.slice(4).trim());
      const subItems: RoadmapItem[] = [];
      i++;

      while (
        i < lines.length &&
        !lines[i].startsWith('### ') &&
        !lines[i].startsWith('## ')
      ) {
        const sl = lines[i];
        if (sl.startsWith('- ')) {
          const status = detectItemStatus(sl);
          const text = stripEmojis(sl.slice(2).replace(/\*\*/g, '')).trim();
          if (text) subItems.push({ text, status });
        }
        i++;
      }

      subsections.push({ title: subTitle, items: subItems, isLocked });
      continue;
    }

    if (l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---')) {
      descLines.push(stripEmojis(l).trim());
    }

    i++;
  }

  return { subsections, goal, description: descLines.filter(Boolean).slice(0, 3).join(' ') };
}

function parseRoadmap(raw: string): ParsedRoadmap {
  const lines = raw.split('\n');
  const result: ParsedRoadmap = {
    vision: '',
    visionQuote: null,
    currentStatus: { description: '', shipped: [], upcoming: [] },
    phases: [],
    baseEcosystem: null,
    futureDirs: [],
  };

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── ## Vision ──
    if (/^## Vision\b/.test(line)) {
      i++;
      const vLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('## ') && !lines[i].startsWith('---')) {
        const l = lines[i];
        if (l.startsWith('> ')) {
          const q = stripEmojis(l.replace(/^>\s*[\*_]?/, '').replace(/[\*_]$/, '').trim());
          if (q && !result.visionQuote) result.visionQuote = q;
        } else if (l.trim() && !l.startsWith('#') && !l.startsWith('**Why')) {
          vLines.push(stripEmojis(l.replace(/\*\*/g, '')).trim());
        }
        i++;
      }
      result.vision = vLines.filter(Boolean).slice(0, 2).join(' ');
      continue;
    }

    // ── ## Current Status ──
    if (/^## Current Status/.test(line)) {
      i++;
      while (i < lines.length && !lines[i].startsWith('## ')) {
        const l = lines[i];

        if (/^### What shipped/.test(l)) {
          i++;
          while (
            i < lines.length &&
            !lines[i].startsWith('### ') &&
            !lines[i].startsWith('## ')
          ) {
            if (lines[i].startsWith('- ')) {
              result.currentStatus.shipped.push(
                stripEmojis(lines[i].slice(2).replace(/\*\*/g, '')).trim(),
              );
            } else if (
              lines[i].trim() &&
              !lines[i].startsWith('#') &&
              !result.currentStatus.description
            ) {
              result.currentStatus.description = stripEmojis(lines[i]).trim();
            }
            i++;
          }
          continue;
        }

        if (/^### Upcoming/.test(l)) {
          i++;
          while (
            i < lines.length &&
            !lines[i].startsWith('### ') &&
            !lines[i].startsWith('## ')
          ) {
            if (lines[i].startsWith('- ')) {
              result.currentStatus.upcoming.push(
                stripEmojis(lines[i].slice(2).replace(/\*\*/g, '')).trim(),
              );
            }
            i++;
          }
          continue;
        }

        if (
          l.trim() &&
          !l.startsWith('#') &&
          !l.startsWith('-') &&
          !result.currentStatus.description
        ) {
          result.currentStatus.description = stripEmojis(l).trim();
        }
        i++;
      }
      continue;
    }

    // ── ## Phase N ──
    if (/^## Phase \d+/.test(line)) {
      const phaseStatus = detectPhaseStatus(line);
      const headerClean = stripEmojis(line.slice(3).trim());
      const phaseMatch = headerClean.match(/^Phase (\d+)\s*[—\-]\s*(.+)$/i);
      const phaseNum = phaseMatch ? parseInt(phaseMatch[1]) : null;
      let phaseName = phaseMatch ? phaseMatch[2] : headerClean;
      phaseName = phaseName
        .replace(/\s+(?:Complete|In Progress|In progress|Planned|Future)\s*$/i, '')
        .trim();

      i++;
      const { subsections, goal } = parsePhaseBlock(lines, i);
      // Advance i past this block
      while (i < lines.length && !lines[i].startsWith('## ')) i++;

      result.phases.push({
        number: phaseNum,
        name: phaseName,
        goal,
        status: phaseStatus,
        subsections,
      });
      continue;
    }

    // ── ## Base Ecosystem Integration ──
    if (/^## Base Ecosystem/.test(line)) {
      const status = detectPhaseStatus(line);
      const name = stripEmojis(line.slice(3).trim())
        .replace(/\s+(?:Complete|In Progress|In progress|Planned|Future)\s*$/i, '')
        .trim();
      i++;
      const { subsections, goal, description } = parsePhaseBlock(lines, i);
      while (i < lines.length && !lines[i].startsWith('## ')) i++;

      result.baseEcosystem = {
        number: null,
        name,
        goal: goal ?? (description || null),
        status,
        subsections,
      };
      continue;
    }

    // ── ## Future Directions ──
    if (/^## Future Directions/.test(line)) {
      i++;
      let currentCat: FutureCategory | null = null;

      while (i < lines.length && !lines[i].startsWith('## ')) {
        const l = lines[i];
        if (l.startsWith('### ')) {
          if (currentCat) result.futureDirs.push(currentCat);
          currentCat = { category: stripEmojis(l.slice(4).trim()), items: [] };
        } else if (l.startsWith('- ') && currentCat) {
          const itemText = stripEmojis(l.slice(2).replace(/\*\*/g, '')).trim();
          if (itemText) currentCat.items.push(itemText);
        }
        i++;
      }

      if (currentCat) result.futureDirs.push(currentCat);
      continue;
    }

    i++;
  }

  return result;
}

// ─── Status config ────────────────────────────────────────────────────────────

const PHASE_STATUS_CONFIG: Record<
  PhaseStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  complete: {
    label: 'Complete',
    color: '#00FF88',
    bg: 'rgba(0,255,136,0.08)',
    border: 'rgba(0,255,136,0.2)',
    dot: '#00FF88',
  },
  'in-progress': {
    label: 'In Progress',
    color: '#00FFFF',
    bg: 'rgba(0,255,255,0.08)',
    border: 'rgba(0,255,255,0.2)',
    dot: '#00FFFF',
  },
  planned: {
    label: 'Planned',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.15)',
    dot: '#94A3B8',
  },
  future: {
    label: 'Future',
    color: '#64748B',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.12)',
    dot: '#64748B',
  },
};

const ITEM_DOT: Record<ItemStatus, string> = {
  shipped: 'rgba(0,255,136,0.6)',
  'in-progress': 'rgba(0,255,255,0.6)',
  planned: 'rgba(148,163,184,0.4)',
  future: 'rgba(100,116,139,0.35)',
  locked: 'rgba(245,158,11,0.5)',
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function PhaseCard({ phase }: { phase: Phase }) {
  const cfg = PHASE_STATUS_CONFIG[phase.status];
  return (
    <article
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor:
          phase.status === 'complete'
            ? 'rgba(0,255,136,0.12)'
            : phase.status === 'in-progress'
              ? 'rgba(0,255,255,0.12)'
              : 'rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="px-8 py-6 flex items-start justify-between gap-4"
        style={{
          background:
            phase.status === 'complete'
              ? 'linear-gradient(145deg, rgba(0,255,136,0.04) 0%, var(--graphite) 100%)'
              : phase.status === 'in-progress'
                ? 'linear-gradient(145deg, rgba(0,255,255,0.04) 0%, var(--graphite) 100%)'
                : 'linear-gradient(145deg, var(--slate) 0%, var(--graphite) 100%)',
        }}
      >
        <div className="min-w-0">
          {phase.number !== null && (
            <div
              className="text-[10px] tracking-[0.25em] uppercase mb-1.5"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Phase {phase.number}
            </div>
          )}
          <h2
            className="text-xl font-light"
            style={{ color: 'var(--platinum)', fontFamily: 'var(--font-serif)' }}
          >
            {phase.name}
          </h2>
          {phase.goal && (
            <p
              className="mt-2 text-sm leading-relaxed max-w-xl"
              style={{ color: 'var(--platinum-dim)' }}
            >
              {phase.goal}
            </p>
          )}
        </div>

        {/* Status badge */}
        <span
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium whitespace-nowrap"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>
      </div>

      {/* Subsections */}
      {phase.subsections.length > 0 && (
        <div
          className="px-8 py-6 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
        >
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
            {phase.subsections.map((sub) => (
              <div key={sub.title}>
                <div className="flex items-center gap-2 mb-3">
                  <h3
                    className="text-xs tracking-[0.12em] uppercase"
                    style={{
                      color: sub.isLocked
                        ? 'rgba(245,158,11,0.7)'
                        : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {sub.title}
                  </h3>
                  {sub.isLocked && (
                    <span
                      className="text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(245,158,11,0.08)',
                        color: 'rgba(245,158,11,0.6)',
                        border: '1px solid rgba(245,158,11,0.15)',
                      }}
                    >
                      Approval required
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {sub.items.map((item, ii) => (
                    <li
                      key={ii}
                      className="flex items-start gap-2 text-xs leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      <span
                        className="mt-1.5 shrink-0 w-1 h-1 rounded-full"
                        style={{ background: ITEM_DOT[item.status] }}
                      />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const raw = readFileSync(join(process.cwd(), '../ROADMAP.md'), 'utf-8');
  const data = parseRoadmap(raw);

  return (
    <div className="ocean-background min-h-screen">
      <main className="container pt-40 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* ── Page header ── */}
          <header className="mb-20">
            <div className="inline-flex items-center gap-4 mb-6">
              <div
                className="w-12 h-px"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(0,255,255,0.4))',
                }}
              />
              <span
                className="text-[10px] tracking-[0.4em] uppercase"
                style={{ color: 'rgba(0,255,255,0.5)' }}
              >
                Protocol
              </span>
              <div
                className="w-12 h-px"
                style={{
                  background: 'linear-gradient(to left, transparent, rgba(0,255,255,0.4))',
                }}
              />
            </div>

            <h1
              className="text-5xl md:text-6xl font-light tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg, var(--cyan-primary), var(--emerald-primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Roadmap
            </h1>

            <p
              className="text-lg leading-relaxed max-w-2xl"
              style={{ color: 'var(--platinum-dim)' }}
            >
              {data.vision ||
                'Building the open standard for luxury product traceability on blockchain.'}
            </p>

            {data.visionQuote && (
              <blockquote
                className="mt-8 pl-6 py-4 text-lg italic"
                style={{
                  borderLeft: '3px solid rgba(0,255,255,0.25)',
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {data.visionQuote}
              </blockquote>
            )}
          </header>

          {/* ── Status legend ── */}
          <div
            className="flex flex-wrap gap-5 mb-16 p-5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {Object.entries(PHASE_STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: cfg.dot }}
                />
                <span className="text-xs tracking-wide" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Current status banner ── */}
          {(data.currentStatus.shipped.length > 0 ||
            data.currentStatus.upcoming.length > 0) && (
            <section
              className="mb-16 rounded-2xl border p-8"
              style={{
                background:
                  'linear-gradient(145deg, rgba(0,255,136,0.04) 0%, rgba(0,0,0,0) 100%)',
                borderColor: 'rgba(0,255,136,0.15)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="w-2 h-2 rounded-full" style={{ background: '#00FF88' }} />
                <h2
                  className="text-sm tracking-[0.15em] uppercase font-medium"
                  style={{ color: '#00FF88' }}
                >
                  Current Status — v1.1 Base Sepolia Evidence
                </h2>
              </div>

              {data.currentStatus.description && (
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: 'var(--platinum-dim)' }}
                >
                  {data.currentStatus.description}
                </p>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {data.currentStatus.shipped.length > 0 && (
                  <div>
                    <div
                      className="text-[10px] tracking-[0.2em] uppercase mb-3"
                      style={{ color: 'rgba(0,255,136,0.5)' }}
                    >
                      Shipped
                    </div>
                    <ul className="space-y-1.5">
                      {data.currentStatus.shipped.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: 'var(--platinum-dim)' }}
                        >
                          <span
                            className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ background: 'rgba(0,255,136,0.4)' }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.currentStatus.upcoming.length > 0 && (
                  <div>
                    <div
                      className="text-[10px] tracking-[0.2em] uppercase mb-3"
                      style={{ color: 'rgba(148,163,184,0.5)' }}
                    >
                      Up Next
                    </div>
                    <ul className="space-y-1.5">
                      {data.currentStatus.upcoming.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: 'var(--platinum-dim)' }}
                        >
                          <span
                            className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ background: 'rgba(148,163,184,0.3)' }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Phases ── */}
          <div className="relative mb-12">
            {/* Vertical line */}
            <div
              className="hidden md:block absolute left-4 top-8 bottom-8 w-px"
              style={{
                background:
                  'linear-gradient(to bottom, var(--cyan-primary), var(--emerald-primary) 30%, rgba(100,116,139,0.3) 70%, transparent)',
                opacity: 0.13,
              }}
            />

            <div className="space-y-8 md:pl-16">
              {data.phases.map((phase) => {
                const cfg = PHASE_STATUS_CONFIG[phase.status];
                return (
                  <div key={phase.number ?? phase.name} className="relative">
                    {/* Timeline dot */}
                    <div
                      className="hidden md:block absolute -left-12 top-6 w-3 h-3 rounded-full"
                      style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        boxShadow: `0 0 8px ${cfg.color}18`,
                      }}
                    />
                    <PhaseCard phase={phase} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Base Ecosystem Integration ── */}
          {data.baseEcosystem && (
            <section className="mb-16">
              <div className="mb-6">
                <div className="inline-flex items-center gap-4 mb-4">
                  <div
                    className="w-8 h-px"
                    style={{
                      background:
                        'linear-gradient(to right, transparent, rgba(68,136,255,0.4))',
                    }}
                  />
                  <span
                    className="text-[10px] tracking-[0.4em] uppercase"
                    style={{ color: 'rgba(68,136,255,0.5)' }}
                  >
                    Base L2
                  </span>
                </div>

                <h2
                  className="text-2xl font-light mb-3"
                  style={{ color: 'var(--platinum)', fontFamily: 'var(--font-serif)' }}
                >
                  {data.baseEcosystem.name}
                </h2>

                {data.baseEcosystem.goal && (
                  <p
                    className="text-sm leading-relaxed max-w-2xl"
                    style={{ color: 'var(--platinum-dim)' }}
                  >
                    {data.baseEcosystem.goal}
                  </p>
                )}
              </div>

              <div
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'rgba(68,136,255,0.12)' }}
              >
                <div
                  className="px-8 py-6 border-b"
                  style={{
                    background:
                      'linear-gradient(145deg, rgba(68,136,255,0.04) 0%, var(--graphite) 100%)',
                    borderColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium"
                      style={{
                        background: 'rgba(68,136,255,0.08)',
                        color: '#4488FF',
                        border: '1px solid rgba(68,136,255,0.2)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#4488FF' }}
                      />
                      Future
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      Coinbase Developer Platform
                    </span>
                  </div>
                </div>

                <div
                  className="px-8 py-6"
                  style={{ background: 'var(--graphite)' }}
                >
                  <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
                    {data.baseEcosystem.subsections.map((sub) => (
                      <div key={sub.title}>
                        <h3
                          className="text-xs tracking-[0.12em] uppercase mb-3"
                          style={{ color: 'rgba(68,136,255,0.6)' }}
                        >
                          {sub.title}
                        </h3>
                        <ul className="space-y-1.5">
                          {sub.items.map((item, ii) => (
                            <li
                              key={ii}
                              className="flex items-start gap-2 text-xs leading-relaxed"
                              style={{ color: 'rgba(255,255,255,0.45)' }}
                            >
                              <span
                                className="mt-1.5 shrink-0 w-1 h-1 rounded-full"
                                style={{ background: 'rgba(68,136,255,0.4)' }}
                              />
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Future Directions ── */}
          {data.futureDirs.length > 0 && (
            <section>
              <div className="mb-8">
                <div className="inline-flex items-center gap-4 mb-4">
                  <div
                    className="w-8 h-px"
                    style={{
                      background:
                        'linear-gradient(to right, transparent, rgba(167,139,250,0.4))',
                    }}
                  />
                  <span
                    className="text-[10px] tracking-[0.4em] uppercase"
                    style={{ color: 'rgba(167,139,250,0.5)' }}
                  >
                    Open Ideas
                  </span>
                </div>

                <h2
                  className="text-2xl font-light mb-3"
                  style={{ color: 'var(--platinum)', fontFamily: 'var(--font-serif)' }}
                >
                  Future Directions
                </h2>

                <p
                  className="text-sm leading-relaxed max-w-xl"
                  style={{ color: 'var(--platinum-dim)' }}
                >
                  These directions are open for community input — nothing is committed.
                  If any of these resonates, open a discussion on GitHub.
                </p>
              </div>

              {/* Direction cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {data.futureDirs.map((dir) => (
                  <div
                    key={dir.category}
                    className="rounded-xl border p-6"
                    style={{
                      background:
                        'linear-gradient(145deg, var(--slate) 0%, var(--graphite) 100%)',
                      borderColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <h3
                      className="text-xs tracking-[0.15em] uppercase mb-3"
                      style={{ color: 'rgba(167,139,250,0.7)' }}
                    >
                      {dir.category}
                    </h3>
                    <ul className="space-y-2">
                      {dir.items.map((item, idx) => {
                        const dashIdx = item.indexOf(' — ');
                        const name = dashIdx > -1 ? item.slice(0, dashIdx) : null;
                        const desc = dashIdx > -1 ? item.slice(dashIdx + 3) : item;
                        return (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            <span
                              className="mt-1.5 shrink-0 w-1 h-1 rounded-full"
                              style={{ background: 'rgba(167,139,250,0.4)' }}
                            />
                            <span>
                              {name && (
                                <strong
                                  className="font-medium"
                                  style={{ color: 'rgba(255,255,255,0.6)' }}
                                >
                                  {name}
                                  {desc ? ' — ' : ''}
                                </strong>
                              )}
                              {desc}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(167,139,250,0.04) 0%, transparent 100%)',
                  borderColor: 'rgba(167,139,250,0.12)',
                }}
              >
                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: 'var(--platinum-dim)' }}
                >
                  The protocol is shaped by the community.
                  <br />
                  Share ideas, challenge assumptions, propose new directions.
                </p>
                <a
                  href="https://github.com/originlabs-app/galileo-protocol/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm tracking-wide"
                  style={{
                    background: 'rgba(167,139,250,0.1)',
                    color: '#A78BFA',
                    border: '1px solid rgba(167,139,250,0.2)',
                  }}
                >
                  Join the discussion on GitHub
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </a>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
