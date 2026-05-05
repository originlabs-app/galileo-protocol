import { readFileSync } from 'fs';
import { join } from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Release history and updates for Galileo Protocol. Track every version and feature shipped.',
  alternates: {
    canonical: '/changelog',
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionTag =
  | 'Added'
  | 'Changed'
  | 'Fixed'
  | 'Infrastructure'
  | 'Removed'
  | 'Security'
  | 'Deprecated';

interface ChangeItem {
  headline: string | null;
  body: string;
}

interface ChangeGroup {
  label: string | null;
  items: ChangeItem[];
}

interface ChangeSection {
  tag: SectionTag;
  groups: ChangeGroup[];
}

interface Release {
  version: string;
  date: string | null;
  title: string | null;
  description: string;
  sections: ChangeSection[];
  isUnreleased: boolean;
}

// ─── Parsing utilities ────────────────────────────────────────────────────────

function stripEmojis(str: string): string {
  return str
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '')
    .replace(/  +/g, ' ')
    .trim();
}

function parseItemText(raw: string): ChangeItem {
  // "**Headline** — body" or "**Headline** - body" or "**Headline** body"
  const m = raw.match(/^\*\*(.+?)\*\*\s*[—\-]?\s*(.*)$/);
  if (m) return { headline: m[1].trim(), body: m[2].trim() };
  return { headline: null, body: raw };
}

const KNOWN_TAGS = new Set<string>([
  'Added',
  'Changed',
  'Fixed',
  'Infrastructure',
  'Removed',
  'Security',
  'Deprecated',
]);

function parseChangelog(raw: string): Release[] {
  const lines = raw.split('\n');

  // Find indices of all ## release headers
  const releaseStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## [')) releaseStarts.push(i);
  }

  const releases: Release[] = [];

  for (let r = 0; r < releaseStarts.length; r++) {
    const start = releaseStarts[r];
    const end = r + 1 < releaseStarts.length ? releaseStarts[r + 1] : lines.length;
    const block = lines.slice(start, end);

    // Parse header
    const headerRaw = block[0].slice(3).trim(); // remove "## "
    const isUnreleased = headerRaw.startsWith('[Unreleased]');
    const bracketMatch = headerRaw.match(/^\[([^\]]+)\]/);
    const bracketContent = bracketMatch ? bracketMatch[1] : '';
    const afterBracket = stripEmojis(
      headerRaw.replace(/^\[[^\]]+\]\s*[—\-]?\s*/, ''),
    )
      .replace(/  +/g, ' ')
      .trim();

    const version = isUnreleased ? 'Unreleased' : bracketContent;
    let date: string | null = null;
    let title: string | null = null;

    // bracketContent might be a date (e.g. [2026-03-22])
    if (bracketContent.match(/^\d{4}-\d{2}-\d{2}$/)) date = bracketContent;

    // afterBracket could be "2026-03-20 — Foundation Release" or "Foundation Release"
    const dtMatch = afterBracket.match(/^(\d{4}-\d{2}-\d{2})\s*[—\-]\s*(.+)$/);
    if (dtMatch) {
      if (!date) date = dtMatch[1];
      title = dtMatch[2].trim();
    } else if (afterBracket.match(/^\d{4}-\d{2}-\d{2}$/)) {
      if (!date) date = afterBracket;
    } else if (afterBracket) {
      title = afterBracket;
    }

    // Parse block content
    const sections: ChangeSection[] = [];
    let currentSection: ChangeSection | null = null;
    let currentGroup: ChangeGroup | null = null;
    const descLines: string[] = [];
    let inDesc = true;

    function flushGroup() {
      if (currentGroup && currentSection) {
        if (currentGroup.items.length > 0) {
          currentSection.groups.push(currentGroup);
        }
      }
      currentGroup = null;
    }

    function flushSection() {
      flushGroup();
      if (currentSection && currentSection.groups.length > 0) {
        sections.push(currentSection);
      }
      currentSection = null;
    }

    for (let i = 1; i < block.length; i++) {
      const line = block[i];

      // ### Section header
      if (line.startsWith('### ')) {
        flushSection();
        inDesc = false;
        const tagRaw = stripEmojis(line.slice(4).trim());
        const tag: SectionTag = KNOWN_TAGS.has(tagRaw)
          ? (tagRaw as SectionTag)
          : 'Added';
        currentSection = { tag, groups: [] };
        currentGroup = { label: null, items: [] };
        continue;
      }

      // Bold subsection label on its own line: **Authentication & Security**
      if (/^\s*\*\*[^*]+\*\*\s*$/.test(line) && currentSection) {
        flushGroup();
        const label = stripEmojis(line.replace(/\*\*/g, '').trim());
        currentGroup = { label, items: [] };
        continue;
      }

      // List item
      if (line.startsWith('- ') && currentSection) {
        const itemRaw = stripEmojis(line.slice(2));
        if (!currentGroup) currentGroup = { label: null, items: [] };
        currentGroup.items.push(parseItemText(itemRaw.trim()));
        continue;
      }

      // Description (text before first ### section)
      if (
        inDesc &&
        line.trim() &&
        !line.startsWith('#') &&
        !/^\s*\*\*/.test(line)
      ) {
        descLines.push(stripEmojis(line).trim());
      }
    }

    flushSection();

    releases.push({
      version,
      date,
      title,
      description: descLines.filter(Boolean).join(' '),
      sections,
      isUnreleased,
    });
  }

  return releases;
}

// ─── Section badge styles ─────────────────────────────────────────────────────

const TAG_STYLE: Record<SectionTag, { bg: string; text: string; border: string; label: string }> =
  {
    Added: {
      bg: 'rgba(0,255,136,0.08)',
      text: '#00FF88',
      border: 'rgba(0,255,136,0.2)',
      label: 'Added',
    },
    Changed: {
      bg: 'rgba(68,136,255,0.08)',
      text: '#4488FF',
      border: 'rgba(68,136,255,0.2)',
      label: 'Changed',
    },
    Fixed: {
      bg: 'rgba(245,158,11,0.08)',
      text: '#F59E0B',
      border: 'rgba(245,158,11,0.2)',
      label: 'Fixed',
    },
    Infrastructure: {
      bg: 'rgba(167,139,250,0.08)',
      text: '#A78BFA',
      border: 'rgba(167,139,250,0.2)',
      label: 'Infrastructure',
    },
    Removed: {
      bg: 'rgba(239,68,68,0.08)',
      text: '#EF4444',
      border: 'rgba(239,68,68,0.2)',
      label: 'Removed',
    },
    Security: {
      bg: 'rgba(0,255,255,0.08)',
      text: '#00FFFF',
      border: 'rgba(0,255,255,0.2)',
      label: 'Security',
    },
    Deprecated: {
      bg: 'rgba(245,158,11,0.08)',
      text: '#F59E0B',
      border: 'rgba(245,158,11,0.2)',
      label: 'Deprecated',
    },
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), '../CHANGELOG.md'), 'utf-8');
  const releases = parseChangelog(raw);

  return (
    <div className="ocean-background min-h-screen">
      <main className="container pt-40 pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Page header */}
          <header className="mb-20">
            <div className="inline-flex items-center gap-4 mb-6">
              <div
                className="w-12 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(0,255,255,0.4))',
                }}
              />
              <span
                className="text-[10px] tracking-[0.4em] uppercase"
                style={{ color: 'rgba(0,255,255,0.5)' }}
              >
                History
              </span>
              <div
                className="w-12 h-px"
                style={{
                  background:
                    'linear-gradient(to left, transparent, rgba(0,255,255,0.4))',
                }}
              />
            </div>

            <h1
              className="text-5xl md:text-6xl font-light tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-serif)',
                background:
                  'linear-gradient(135deg, var(--cyan-primary), var(--emerald-primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Changelog
            </h1>

            <p
              className="text-lg leading-relaxed"
              style={{ color: 'var(--platinum-dim)' }}
            >
              All notable changes, releases, and deployments — documented with
              precision.
            </p>
          </header>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-0 top-3 bottom-3 w-px"
              style={{
                background:
                  'linear-gradient(to bottom, var(--cyan-primary), var(--emerald-primary) 60%, transparent)',
                opacity: 0.12,
              }}
            />

            <ol className="space-y-14 pl-10">
              {releases.map((release) => (
                <li key={release.version} className="relative">
                  {/* Timeline dot */}
                  <div
                    className="absolute -left-[37px] top-2.5 w-3 h-3 rounded-full"
                    style={{
                      background: release.isUnreleased
                        ? 'rgba(68,136,255,0.3)'
                        : 'rgba(0,255,255,0.25)',
                      border: release.isUnreleased
                        ? '1px solid rgba(68,136,255,0.5)'
                        : '1px solid rgba(0,255,255,0.4)',
                      boxShadow: release.isUnreleased
                        ? '0 0 8px rgba(68,136,255,0.15)'
                        : '0 0 8px rgba(0,255,255,0.12)',
                    }}
                  />

                  {/* Date above card */}
                  {release.date && (
                    <div
                      className="text-xs tracking-wide mb-3"
                      style={{ color: 'rgba(255,255,255,0.28)' }}
                    >
                      {formatDate(release.date)}
                    </div>
                  )}

                  {/* Release card */}
                  <article
                    className="rounded-2xl border p-8"
                    style={{
                      background:
                        'linear-gradient(145deg, var(--slate) 0%, var(--graphite) 100%)',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Version + Title */}
                    <div className="flex items-center flex-wrap gap-3 mb-5">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono tracking-wider"
                        style={{
                          background: release.isUnreleased
                            ? 'rgba(68,136,255,0.1)'
                            : 'rgba(0,255,255,0.08)',
                          color: release.isUnreleased
                            ? '#4488FF'
                            : 'var(--cyan-primary)',
                          border: `1px solid ${release.isUnreleased ? 'rgba(68,136,255,0.25)' : 'rgba(0,255,255,0.18)'}`,
                        }}
                      >
                        {release.version}
                      </span>

                      {release.title && (
                        <h2
                          className="text-lg font-light"
                          style={{
                            color: 'var(--platinum)',
                            fontFamily: 'var(--font-serif)',
                          }}
                        >
                          {release.title}
                        </h2>
                      )}
                    </div>

                    {/* Description */}
                    {release.description && (
                      <p
                        className="text-sm leading-relaxed mb-8"
                        style={{ color: 'var(--platinum-dim)' }}
                      >
                        {release.description}
                      </p>
                    )}

                    {/* Sections */}
                    {release.sections.length > 0 && (
                      <div className="space-y-7">
                        {release.sections.map((section) => {
                          const style =
                            TAG_STYLE[section.tag] ?? TAG_STYLE.Added;
                          return (
                            <div key={section.tag}>
                              {/* Section type badge */}
                              <div className="flex items-center gap-3 mb-4">
                                <span
                                  className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] tracking-[0.15em] uppercase font-medium"
                                  style={{
                                    background: style.bg,
                                    color: style.text,
                                    border: `1px solid ${style.border}`,
                                  }}
                                >
                                  {style.label}
                                </span>
                                <div
                                  className="flex-1 h-px"
                                  style={{
                                    background: `linear-gradient(to right, ${style.text}18, transparent)`,
                                  }}
                                />
                              </div>

                              {/* Groups */}
                              <div className="space-y-5">
                                {section.groups.map((group, gi) => (
                                  <div key={gi}>
                                    {/* Subsection label */}
                                    {group.label && (
                                      <div
                                        className="text-[11px] tracking-[0.12em] uppercase mb-2.5 pl-4"
                                        style={{
                                          color: 'rgba(255,255,255,0.35)',
                                          borderLeft:
                                            '2px solid rgba(255,255,255,0.1)',
                                        }}
                                      >
                                        {group.label}
                                      </div>
                                    )}

                                    {/* Items */}
                                    <ul className="space-y-2 pl-4">
                                      {group.items.map((item, ii) => (
                                        <li
                                          key={ii}
                                          className="flex items-start gap-2.5 text-sm leading-relaxed"
                                          style={{
                                            color: 'var(--platinum-dim)',
                                          }}
                                        >
                                          <span
                                            className="mt-2 shrink-0 w-1 h-1 rounded-full"
                                            style={{
                                              background: style.text + '70',
                                            }}
                                          />
                                          <span>
                                            {item.headline && (
                                              <strong
                                                className="font-medium"
                                                style={{
                                                  color: 'var(--platinum)',
                                                }}
                                              >
                                                {item.headline}
                                                {item.body ? ' — ' : ''}
                                              </strong>
                                            )}
                                            {item.body}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          </div>

          {/* Footer */}
          <footer
            className="mt-20 pt-10 border-t text-center"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Follows{' '}
              <a
                href="https://keepachangelog.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'rgba(0,255,255,0.45)' }}
              >
                Keep a Changelog
              </a>{' '}
              convention · All releases on{' '}
              <a
                href="https://github.com/originlabs-app/galileo-protocol/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'rgba(0,255,255,0.45)' }}
              >
                GitHub Releases
              </a>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
