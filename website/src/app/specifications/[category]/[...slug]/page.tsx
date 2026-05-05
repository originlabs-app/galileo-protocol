import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft } from "lucide-react";

import {
  getSpecCategories,
  getSpecifications,
  getSpecification,
  capitalizeCategory,
} from "@/lib/specifications";
import { SpecMetadata } from "@/components/specifications/SpecMetadata";
import { JSONSchemaViewer } from "@/components/specifications/JSONSchemaViewer";

// ============================================================================
// Static Generation
// ============================================================================

/**
 * Generate static params for all specifications across all categories.
 * This enables static generation at build time for all 65 specs.
 *
 * Handles both root-level specs and nested specs in subdirectories:
 * - /specifications/identity/DID-METHOD → slug: ["DID-METHOD"]
 * - /specifications/schemas/dpp/dpp-core.schema → slug: ["dpp", "dpp-core.schema"]
 */
export async function generateStaticParams() {
  const categories = await getSpecCategories();
  const params: { category: string; slug: string[] }[] = [];

  for (const category of categories) {
    const specs = await getSpecifications(category);

    for (const spec of specs) {
      // Build slug array based on whether spec has subcategory
      const slugParts = spec.subcategory
        ? [spec.subcategory, spec.slug]
        : [spec.slug];

      params.push({
        category,
        slug: slugParts,
      });
    }
  }

  return params;
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string[] }>;
}): Promise<Metadata> {
  const { category, slug } = await params;

  // Parse slug array: [subcategory?, actualSlug]
  const subcategory = slug.length > 1 ? slug[0] : undefined;
  const actualSlug = slug.length > 1 ? slug[1] : slug[0];

  const spec = await getSpecification(category, actualSlug, subcategory);

  if (!spec) {
    return {
      title: "Specification Not Found | Galileo",
    };
  }

  return {
    title: `${spec.metadata.title} | Galileo Specifications`,
    description: `${spec.metadata.title} - Version ${spec.metadata.version} (${spec.metadata.status})`,
  };
}

// ============================================================================
// MDX Components
// ============================================================================

const mdxComponents = {
  // Headings
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className="text-3xl font-bold text-[var(--platinum)] mb-6" />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      className="text-2xl font-semibold text-[var(--platinum)] mt-10 mb-4 pb-2 border-b border-[rgba(229,229,229,0.1)]"
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      {...props}
      className="text-xl font-semibold text-[var(--platinum)] mt-8 mb-3"
    />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      {...props}
      className="text-lg font-semibold text-[var(--platinum)] mt-6 mb-2"
    />
  ),
  // Links
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      className="text-[var(--precision-blue)] hover:text-[var(--cyan-primary)] transition-colors underline"
    />
  ),
  // Code blocks
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      {...props}
      className="bg-[var(--obsidian-elevated)] border border-[rgba(229,229,229,0.08)] rounded-lg p-4 overflow-x-auto my-6 text-sm"
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => {
    const isBlock =
      typeof props.children === "string" && props.children.includes("\n");
    if (isBlock) {
      return <code {...props} className="text-sm font-mono" />;
    }
    return (
      <code
        {...props}
        className="bg-[var(--obsidian-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--precision-blue)]"
      />
    );
  },
  // Lists
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      {...props}
      className="list-disc list-inside my-4 space-y-2 text-[var(--platinum-dim)]"
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      {...props}
      className="list-decimal list-inside my-4 space-y-2 text-[var(--platinum-dim)]"
    />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed" />
  ),
  // Blockquote
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      {...props}
      className="border-l-4 border-[var(--cyan-primary)] pl-4 my-6 italic text-[var(--platinum-dim)]"
    />
  ),
  // Paragraph
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="my-4 leading-relaxed text-[var(--platinum-dim)]" />
  ),
  // Strong
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-[var(--platinum)]" />
  ),
  // Tables
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-6">
      <table {...props} className="min-w-full border-collapse text-sm" />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      {...props}
      className="border border-[rgba(229,229,229,0.1)] bg-[var(--obsidian-surface)] px-4 py-2 text-left font-semibold text-[var(--platinum)]"
    />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
      {...props}
      className="border border-[rgba(229,229,229,0.1)] px-4 py-2 text-[var(--platinum-dim)]"
    />
  ),
  // Horizontal rule
  hr: () => <hr className="my-8 border-t border-[rgba(229,229,229,0.1)]" />,
};

// ============================================================================
// Content Processing
// ============================================================================

/**
 * Escape curly braces in markdown content that would be interpreted as JSX.
 * This is necessary because MDX treats {expression} as JSX syntax.
 *
 * Strategy: Escape curly braces that contain variable-like content
 * but preserve code blocks and inline code.
 */
function escapeJsxInMarkdown(content: string): string {
  // Split into code blocks and non-code sections
  const codeBlockRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
  const parts = content.split(codeBlockRegex);

  return parts
    .map((part, index) => {
      // Keep code blocks as-is (they're at odd indices after split)
      if (index % 2 === 1) {
        // This is a code block or inline code
        // For code blocks, we still need to escape JSX expressions
        // that would be evaluated by MDX
        if (part.startsWith("```")) {
          // Fenced code block - escape curly braces inside
          const lines = part.split("\n");
          const lang = lines[0]; // e.g., ```solidity
          const code = lines.slice(1, -1).join("\n");
          const closing = lines[lines.length - 1];
          // Escape {identifier} patterns in code blocks
          const escapedCode = code.replace(
            /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
            "{'$1'}",
          );
          return `${lang}\n${escapedCode}\n${closing}`;
        }
        return part;
      }
      // Escape {identifier} patterns outside code blocks
      return part.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, "\\{$1\\}");
    })
    .join("");
}

// ============================================================================
// Page Component
// ============================================================================

export default async function SpecDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string[] }>;
}) {
  const { category, slug } = await params;

  // Parse slug array: [subcategory?, actualSlug]
  // e.g., ["dpp", "dpp-core.schema"] or ["DID-METHOD"]
  const subcategory = slug.length > 1 ? slug[0] : undefined;
  const actualSlug = slug.length > 1 ? slug[1] : slug[0];

  const spec = await getSpecification(category, actualSlug, subcategory);

  if (!spec) {
    notFound();
  }

  const { type, content, metadata } = spec;

  // For markdown files, escape JSX-like expressions
  // Galileo specs have metadata in bold headers, not YAML frontmatter
  const markdownContent =
    type === "markdown" ? escapeJsxInMarkdown(content) : "";

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href={`/specifications/${category}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--platinum-dim)] hover:text-[var(--cyan-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {capitalizeCategory(category)}
      </Link>

      {/* Title */}
      <h1 className="text-3xl font-bold text-[var(--platinum)] mb-6">
        {metadata.title}
      </h1>

      {/* Metadata */}
      <SpecMetadata
        status={metadata.status}
        version={metadata.version}
        lastUpdated={metadata.lastUpdated}
        specId={metadata.specId}
        type={type}
      />

      {/* Content */}
      {type === "markdown" ? (
        <div className="prose prose-invert max-w-none">
          <MDXRemote source={markdownContent} components={mdxComponents} />
        </div>
      ) : (
        <JSONSchemaViewer content={content} title={metadata.title} />
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-[rgba(229,229,229,0.1)]">
        <div className="flex items-center justify-between text-sm text-[var(--platinum-dim)]">
          <Link
            href="/specifications"
            className="hover:text-[var(--cyan-primary)] transition-colors"
          >
            View all specifications
          </Link>
          <a
            href="https://github.com/originlabs-app/galileo-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--precision-blue)] transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
