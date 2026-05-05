/**
 * SpecMetadata - Displays specification metadata header
 *
 * Shows:
 * - Status badge (Standard/Active/Draft)
 * - Version number
 * - Last updated date
 * - Spec ID (if available)
 */

import { StatusBadge, type SpecStatus } from './StatusBadge';
import { Calendar, Tag, Hash, FileCode } from 'lucide-react';

interface SpecMetadataProps {
  status: SpecStatus;
  version: string;
  lastUpdated?: string;
  specId?: string;
  type?: 'markdown' | 'json' | 'jsonld';
}

export function SpecMetadata({
  status,
  version,
  lastUpdated,
  specId,
  type,
}: SpecMetadataProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-[var(--platinum)]/10">
      {/* Status Badge */}
      <StatusBadge status={status} size="md" />

      {/* Version */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--platinum-dim)]">
        <Tag className="w-4 h-4" />
        <span>v{version}</span>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center gap-1.5 text-sm text-[var(--platinum-dim)]">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(lastUpdated)}</span>
        </div>
      )}

      {/* Spec ID */}
      {specId && (
        <div className="flex items-center gap-1.5 text-sm text-[var(--platinum-dim)]">
          <Hash className="w-4 h-4" />
          <code className="text-xs bg-[var(--obsidian-elevated)] px-2 py-0.5 rounded">
            {specId}
          </code>
        </div>
      )}

      {/* File Type */}
      {type && type !== 'markdown' && (
        <div className="flex items-center gap-1.5 text-sm text-[var(--precision-blue)]">
          <FileCode className="w-4 h-4" />
          <span className="uppercase text-xs font-medium">
            {type === 'jsonld' ? 'JSON-LD' : 'JSON Schema'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Format a date string for display.
 * Handles various input formats and returns human-readable output.
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';

  try {
    // Try parsing as ISO date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Return as-is if parsing fails
      return dateString;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Compact metadata display for cards/listings
 */
interface CompactMetadataProps {
  status: SpecStatus;
  version: string;
  lastUpdated?: string;
}

export function CompactMetadata({
  status,
  version,
  lastUpdated,
}: CompactMetadataProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-[var(--platinum-dim)]">
      <StatusBadge status={status} size="sm" />
      <span>v{version}</span>
      {lastUpdated && <span>{formatDate(lastUpdated)}</span>}
    </div>
  );
}
