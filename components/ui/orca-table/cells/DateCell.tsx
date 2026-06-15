// components/ui/orca-table/cells/DateCell.tsx
import { formatDate } from '@/lib/ui-formatters';

export function DateCell({ value }: { value?: string | Date | null }) {
  return <span className="text-xs font-mono text-[var(--nc-text-dim)]">{formatDate(value)}</span>;
}
