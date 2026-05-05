'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import {
  Building2,
  Shield,
  Fingerprint,
  Server,
  Link2,
  Database,
  Coins,
  Lock,
} from 'lucide-react';
function capitalizeCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// ============================================================================
// Types
// ============================================================================

type StatusFilter = 'All' | 'Draft' | 'Active' | 'Standard';

interface SpecPreview {
  title: string;
  status: string;
}

interface CategoryData {
  name: string;
  allSpecs: SpecPreview[];
}

// ============================================================================
// Category Icons
// ============================================================================

const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  architecture: Building2,
  compliance: Shield,
  crypto: Lock,
  identity: Fingerprint,
  infrastructure: Server,
  resolver: Link2,
  schemas: Database,
  token: Coins,
};

// ============================================================================
// Category Card
// ============================================================================

interface CategoryCardProps {
  name: string;
  count: number;
  previewSpecs: SpecPreview[];
}

function CategoryCard({ name, count, previewSpecs }: CategoryCardProps) {
  const Icon = categoryIcons[name] || Database;

  return (
    <Link
      href={`/specifications/${name}`}
      className="group block p-6 rounded-lg border border-[var(--platinum)]/10 bg-[var(--obsidian)]/50 hover:border-[var(--cyan-primary)]/50 transition-all duration-300 angle-glow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)]">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs text-[var(--platinum-dim)] bg-[var(--obsidian)] px-2 py-1 rounded">
          {count} spec{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-[var(--platinum)] mb-2 group-hover:text-[var(--cyan-primary)] transition-colors">
        {capitalizeCategory(name)}
      </h2>

      {/* Preview specs */}
      <ul className="space-y-1">
        {previewSpecs.slice(0, 3).map((spec) => (
          <li
            key={spec.title}
            className="text-sm text-[var(--platinum-dim)] truncate"
            title={spec.title}
          >
            {spec.title}
          </li>
        ))}
        {count > 3 && (
          <li className="text-sm text-[var(--platinum-dim)] italic">
            +{count - 3} more...
          </li>
        )}
      </ul>
    </Link>
  );
}

// ============================================================================
// Filter Tabs
// ============================================================================

const STATUS_FILTERS: StatusFilter[] = ['All', 'Draft', 'Active', 'Standard'];

const statusDotColor: Record<StatusFilter, string> = {
  All: 'bg-white/40',
  Draft: 'bg-yellow-500 opacity-60',
  Active: 'bg-green-500 opacity-60',
  Standard: 'bg-blue-500 opacity-60',
};

// ============================================================================
// FilterableSpecGrid
// ============================================================================

export function FilterableSpecGrid({ categories }: { categories: CategoryData[] }) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');

  const filtered = categories
    .map((cat) => {
      const filteredSpecs =
        activeFilter === 'All'
          ? cat.allSpecs
          : cat.allSpecs.filter((s) => s.status === activeFilter);
      return { name: cat.name, count: filteredSpecs.length, previewSpecs: filteredSpecs };
    })
    .filter((cat) => cat.count > 0);

  return (
    <>
      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
              activeFilter === status
                ? 'border-[var(--cyan-primary)]/50 bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)]'
                : 'border-[var(--platinum)]/10 bg-[var(--obsidian)]/50 text-[var(--platinum-dim)] hover:border-[var(--platinum)]/20 hover:text-[var(--platinum)]'
            }`}
          >
            {status !== 'All' && (
              <span className={`w-2 h-2 rounded-full ${statusDotColor[status]}`} />
            )}
            {status}
          </button>
        ))}
      </div>

      {/* Category grid */}
      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((category) => (
            <CategoryCard
              key={category.name}
              name={category.name}
              count={category.count}
              previewSpecs={category.previewSpecs}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--platinum-dim)]">
          No specifications with status &ldquo;{activeFilter}&rdquo; found.
        </div>
      )}
    </>
  );
}
