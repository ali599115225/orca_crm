// components/ui/orca-table/cells/ShortIdCell.tsx
import { formatShortId } from '@/lib/ui-formatters';

export function ShortIdCell({ id, prefix }: { id?: string | null; prefix?: string }) {
  const display = formatShortId(id, prefix);
  return <span className="font-mono text-xs text-[var(--nc-foreground)]">{display}</span>;
}
