/**
 * StatusBadge - Color-coded status indicators for specifications
 *
 * Status types:
 * - Standard: Blue - stable, finalized specifications
 * - Active: Green - approved and in active use
 * - Draft: Yellow - work in progress
 */

type SpecStatus = 'Draft' | 'Active' | 'Standard';

interface StatusBadgeProps {
  status: SpecStatus;
  size?: 'sm' | 'md';
}

const statusStyles: Record<SpecStatus, string> = {
  Standard: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

const statusLabels: Record<SpecStatus, string> = {
  Standard: 'Standard',
  Active: 'Active',
  Draft: 'Draft',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${statusStyles[status]} ${sizeClasses}`}
    >
      {statusLabels[status]}
    </span>
  );
}

/**
 * StatusDot - Minimal status indicator (just a dot)
 * Used in tight spaces like sidebar navigation
 */
interface StatusDotProps {
  status: SpecStatus;
  className?: string;
}

const dotColors: Record<SpecStatus, string> = {
  Standard: 'bg-blue-500',
  Active: 'bg-green-500',
  Draft: 'bg-yellow-500',
};

export function StatusDot({ status, className = '' }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${dotColors[status]} opacity-60 ${className}`}
      title={statusLabels[status]}
    />
  );
}

export type { SpecStatus };
