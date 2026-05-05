/**
 * JSONSchemaViewer - Formatted display for JSON Schema files
 *
 * Features:
 * - Syntax-highlighted JSON display
 * - Schema metadata extraction (title, description)
 * - Collapsible sections for large schemas
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, FileJson } from 'lucide-react';

interface JSONSchemaViewerProps {
  content: string;
  title?: string;
}

export function JSONSchemaViewer({ content, title }: JSONSchemaViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  let parsedSchema: Record<string, unknown> | null = null;
  let parseError: string | null = null;

  try {
    parsedSchema = JSON.parse(content);
  } catch (e) {
    parseError = e instanceof Error ? e.message : 'Invalid JSON';
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Extract schema metadata
  const schemaTitle = parsedSchema?.title as string | undefined;
  const schemaDescription = parsedSchema?.description as string | undefined;
  const schemaId = parsedSchema?.$id as string | undefined;

  return (
    <div className="rounded-lg border border-[var(--platinum)]/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--obsidian-surface)] border-b border-[var(--platinum)]/10">
        <div className="flex items-center gap-3">
          <FileJson className="w-5 h-5 text-[var(--precision-blue)]" />
          <span className="font-medium text-[var(--platinum)]">
            {title || schemaTitle || 'JSON Schema'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded hover:bg-[var(--obsidian-elevated)] transition-colors text-[var(--platinum-dim)] hover:text-[var(--platinum)]"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded hover:bg-[var(--obsidian-elevated)] transition-colors text-[var(--platinum-dim)] hover:text-[var(--platinum)]"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Schema Info */}
      {expanded && parsedSchema && (schemaDescription || schemaId) && (
        <div className="px-4 py-3 bg-[var(--obsidian-surface)]/50 border-b border-[var(--platinum)]/10">
          {schemaDescription && (
            <p className="text-sm text-[var(--platinum-dim)] mb-2">
              {schemaDescription}
            </p>
          )}
          {schemaId && (
            <code className="text-xs text-[var(--precision-blue)] bg-[var(--obsidian-elevated)] px-2 py-1 rounded">
              {schemaId}
            </code>
          )}
        </div>
      )}

      {/* Content */}
      {expanded && (
        <div className="overflow-x-auto">
          {parseError ? (
            <div className="p-4 text-red-400">
              <p className="font-medium">Parse Error</p>
              <p className="text-sm opacity-75">{parseError}</p>
              <pre className="mt-4 text-xs opacity-50">{content}</pre>
            </div>
          ) : (
            <pre className="p-4 text-sm font-mono leading-relaxed">
              <JSONHighlighter data={parsedSchema} />
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * JSONHighlighter - Syntax highlighting for JSON
 * Renders JSON with color-coded types
 */
interface JSONHighlighterProps {
  data: unknown;
  indent?: number;
}

function JSONHighlighter({ data, indent = 0 }: JSONHighlighterProps) {
  const indentStr = '  '.repeat(indent);

  if (data === null) {
    return <span className="text-[var(--platinum-dim)]">null</span>;
  }

  if (typeof data === 'boolean') {
    return (
      <span className="text-purple-400">{data ? 'true' : 'false'}</span>
    );
  }

  if (typeof data === 'number') {
    return <span className="text-orange-400">{data}</span>;
  }

  if (typeof data === 'string') {
    return (
      <span className="text-green-400">
        &quot;{escapeString(data)}&quot;
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span>[]</span>;
    }

    return (
      <>
        {'[\n'}
        {data.map((item, index) => (
          <span key={index}>
            {indentStr}{'  '}
            <JSONHighlighter data={item} indent={indent + 1} />
            {index < data.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {indentStr}{']'}
      </>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span>{'{}'}</span>;
    }

    return (
      <>
        {'{\n'}
        {entries.map(([key, value], index) => (
          <span key={key}>
            {indentStr}{'  '}
            <span className="text-[var(--precision-blue)]">
              &quot;{key}&quot;
            </span>
            <span className="text-[var(--platinum)]">: </span>
            <JSONHighlighter data={value} indent={indent + 1} />
            {index < entries.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {indentStr}{'}'}
      </>
    );
  }

  return <span>{String(data)}</span>;
}

/**
 * Escape special characters in strings for display
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
