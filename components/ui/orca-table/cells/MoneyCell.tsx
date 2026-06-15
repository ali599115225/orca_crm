// components/ui/orca-table/cells/MoneyCell.tsx
import { formatCurrency } from '@/lib/ui-formatters';

export function MoneyCell({ amount, lang }: { amount?: number | string | null; lang?: string }) {
  return <span className="text-xs font-bold text-[var(--nc-foreground)]">{formatCurrency(amount, lang)}</span>;
}
