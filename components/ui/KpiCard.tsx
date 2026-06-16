import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon | any;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: 'bg-[var(--nc-surface-strong)]', text: 'text-[var(--nc-foreground)]', border: 'border-[var(--nc-glass-border)]' },
  accent: { bg: 'bg-[var(--nc-accent-soft)]', text: 'text-[var(--nc-accent)]', border: 'border-[var(--nc-accent-border)]' },
  success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  danger: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  info: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
};

export function KpiCard({ label, value, icon: Icon, trend, trendLabel, color = 'default', className = '' }: KpiCardProps) {
  const colors = colorMap[color];
  return (
    <div className={`nc-card-default p-4 flex items-start justify-between gap-3 ${className}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)] mb-1 leading-normal truncate">{label}</p>
        <h3 className={`text-[22px] font-bold leading-7 ${colors.text} truncate`}>{value}</h3>
        {trendLabel && (
          <p className={`text-[10px] font-medium mt-1 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-[var(--nc-text-dim)]'}`}>
            {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{trendLabel}
          </p>
        )}
      </div>
      {Icon && (
        <div className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center shrink-0`}>
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}

export default KpiCard;
