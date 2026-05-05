import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, FileJson } from 'lucide-react';

import {
  getSpecCategories,
  getSpecifications,
  capitalizeCategory,
  type SpecFile,
} from '@/lib/specifications';
import { StatusBadge } from '@/components/specifications/StatusBadge';

// ============================================================================
// Static Generation
// ============================================================================

/**
 * Generate static params for all 8 categories.
 */
export async function generateStaticParams() {
  const categories = await getSpecCategories();
  return categories.map((category) => ({ category }));
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categories = await getSpecCategories();

  if (!categories.includes(category)) {
    return {
      title: 'Category Not Found | Galileo',
    };
  }

  const specs = await getSpecifications(category);

  return {
    title: `${capitalizeCategory(category)} Specifications | Galileo`,
    description: `Browse ${specs.length} specifications in the ${capitalizeCategory(category)} category.`,
  };
}

// ============================================================================
// Category Descriptions
// ============================================================================

const categoryDescriptions: Record<string, string> = {
  architecture:
    'Core architectural specifications defining the hybrid on-chain/off-chain model, GDPR compliance patterns, and system boundaries.',
  compliance:
    'Regulatory compliance specifications including KYC/AML hooks, jurisdiction rules, and regulatory guides for GDPR, MiCA, and ESPR.',
  crypto:
    'Cryptographic specifications covering algorithm agility, post-quantum readiness, and signature schemes.',
  identity:
    'Identity specifications including DID methods, ONCHAINID integration, claim topics, and verifiable credentials.',
  infrastructure:
    'Infrastructure specifications for RBAC frameworks, audit trails, data retention, and hybrid synchronization.',
  resolver:
    'GS1 Digital Link resolver specifications including URI formats, context routing, and access control.',
  schemas:
    'JSON schemas for Digital Product Passports, lifecycle events, extensions, and standards alignment.',
  token:
    'Token specifications for ERC-3643 integration, ownership transfer flows, and compliance modules.',
};

// ============================================================================
// Spec Card Component
// ============================================================================

interface SpecCardProps {
  spec: SpecFile;
  category: string;
}

function SpecCard({ spec, category }: SpecCardProps) {
  const isJson = spec.type === 'json' || spec.type === 'jsonld';
  const Icon = isJson ? FileJson : FileText;

  return (
    <Link
      href={`/specifications/${category}/${spec.slug}`}
      className="group block p-5 rounded-lg border border-[var(--platinum)]/10 bg-[var(--obsidian)]/50 hover:border-[var(--cyan-primary)]/50 transition-all duration-300 angle-glow"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <Icon
            className={`w-5 h-5 ${
              isJson ? 'text-[var(--precision-blue)]' : 'text-[var(--platinum-dim)]'
            }`}
          />
          <h3 className="font-semibold text-[var(--platinum)] group-hover:text-[var(--cyan-primary)] transition-colors line-clamp-1">
            {spec.title}
          </h3>
        </div>
        <StatusBadge status={spec.status} size="sm" />
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--platinum-dim)]">
        <span>v{spec.version}</span>
        {spec.lastUpdated && <span>{formatDate(spec.lastUpdated)}</span>}
        {spec.subcategory && (
          <span className="px-2 py-0.5 rounded bg-[var(--obsidian-elevated)] text-[var(--platinum-dim)]">
            {spec.subcategory}
          </span>
        )}
      </div>

      {spec.specId && (
        <div className="mt-3 pt-3 border-t border-[var(--platinum)]/5">
          <code className="text-xs text-[var(--precision-blue)] opacity-70">
            {spec.specId}
          </code>
        </div>
      )}
    </Link>
  );
}

/**
 * Format a date string for display.
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// ============================================================================
// Subcategory Section
// ============================================================================

interface SubcategorySectionProps {
  name: string;
  specs: SpecFile[];
  category: string;
}

function SubcategorySection({ name, specs, category }: SubcategorySectionProps) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-[var(--platinum)] mb-4 pb-2 border-b border-[var(--platinum)]/10">
        {capitalizeCategory(name)}
        <span className="ml-2 text-sm font-normal text-[var(--platinum-dim)]">
          ({specs.length} spec{specs.length !== 1 ? 's' : ''})
        </span>
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
        {specs.map((spec) => (
          <SpecCard key={spec.slug} spec={spec} category={category} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categories = await getSpecCategories();

  if (!categories.includes(category)) {
    notFound();
  }

  const specs = await getSpecifications(category);

  // Group specs by subcategory
  const groupedSpecs = specs.reduce(
    (acc, spec) => {
      const key = spec.subcategory || '_root';
      if (!acc[key]) acc[key] = [];
      acc[key].push(spec);
      return acc;
    },
    {} as Record<string, SpecFile[]>
  );

  // Sort subcategories: _root first, then alphabetically
  const subcategories = Object.keys(groupedSpecs).sort((a, b) => {
    if (a === '_root') return -1;
    if (b === '_root') return 1;
    return a.localeCompare(b);
  });

  const description =
    categoryDescriptions[category] ||
    `Browse specifications in the ${capitalizeCategory(category)} category.`;

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href="/specifications"
        className="inline-flex items-center gap-2 text-sm text-[var(--platinum-dim)] hover:text-[var(--cyan-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All Specifications
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--platinum)] mb-4">
          {capitalizeCategory(category)} Specifications
        </h1>
        <p className="text-[var(--platinum-dim)] leading-relaxed">{description}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-[var(--platinum-dim)]">
          <span>
            {specs.length} specification{specs.length !== 1 ? 's' : ''}
          </span>
          <span>|</span>
          <span>
            {subcategories.filter((s) => s !== '_root').length} subcategor
            {subcategories.filter((s) => s !== '_root').length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </div>

      {/* Specs by subcategory */}
      {subcategories.map((subcategory) => {
        const specsInSubcat = groupedSpecs[subcategory];

        // Root-level specs (no subcategory)
        if (subcategory === '_root') {
          if (specsInSubcat.length === specs.length) {
            // All specs are at root - just show the grid
            return (
              <div key="_root" className="grid md:grid-cols-2 gap-4 mb-10">
                {specsInSubcat.map((spec) => (
                  <SpecCard key={spec.slug} spec={spec} category={category} />
                ))}
              </div>
            );
          } else if (specsInSubcat.length > 0) {
            // Some specs at root, some in subcategories
            return (
              <SubcategorySection
                key="_root"
                name="General"
                specs={specsInSubcat}
                category={category}
              />
            );
          }
          return null;
        }

        // Named subcategory
        return (
          <SubcategorySection
            key={subcategory}
            name={subcategory}
            specs={specsInSubcat}
            category={category}
          />
        );
      })}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-[rgba(229,229,229,0.1)]">
        <p className="text-sm text-[var(--platinum-dim)]">
          All specifications are versioned using semantic versioning. Status
          indicators: <strong>Standard</strong> (stable),{' '}
          <strong>Active</strong> (approved), <strong>Draft</strong> (work in
          progress).
        </p>
      </footer>
    </div>
  );
}
