// components/ui/orca-table/cells/StatusCell.tsx
import type { ReactNode } from 'react';

type StatusFn = (s?: string | null) => string;

interface StatusCellProps {
  status?: string | null;
  format: StatusFn;
  badgeClass?: string;
  activeClass?: string;
  children?: ReactNode;
}

const DEFAULT_ACTIVE = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
const DEFAULT_BADGE = 'bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border border-[var(--nc-border)]';

export function StatusCell({ status, format, badgeClass, activeClass, children }: StatusCellProps) {
  const label = children ?? format(status);
  const isActive = status === 'active' || status === 'نشط' || status === 'paid' || status === 'مدفوعة';
  const cls = badgeClass || (isActive ? (activeClass || DEFAULT_ACTIVE) : DEFAULT_BADGE);
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  );
}
