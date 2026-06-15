// components/ui/orca-table/cells/RelationCell.tsx
import { formatRelation } from '@/lib/ui-formatters';

export function RelationCell({ name }: { name?: string | null }) {
  const display = formatRelation(name);
  const isMissing = display === 'غير مرتبط';
  return (
    <span className={`text-xs ${isMissing ? 'text-[var(--nc-text-dim)] italic' : 'text-[var(--nc-foreground)]'}`}>
      {display}
    </span>
  );
}
