import React from 'react';

export type BadgeVariant = 'preview' | 'soon' | 'paused' | 'demo' | 'pending' | 'active' | 'draft' | 'sent' | 'excellent' | 'connected' | 'notConnected' | 'default';

interface StatusBadgeProps {
  variant: BadgeVariant;
  lang?: 'AR' | 'EN';
  className?: string;
}

const badgeMap: Record<BadgeVariant, { ar: string; en: string; style: string }> = {
  preview:     { ar: 'معاينة',         en: 'Preview',             style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  soon:        { ar: 'قريباً',         en: 'Soon',                style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  paused:      { ar: 'متوقف',          en: 'Paused',              style: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  demo:        { ar: 'بيانات تجريبية', en: 'Demo data',           style: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  pending:     { ar: 'قيد الربط',      en: 'Integration pending', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  active:      { ar: 'نشطة',           en: 'Active',              style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  draft:       { ar: 'مسودة',          en: 'Draft',               style: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  sent:        { ar: 'مرسل',           en: 'Sent',                style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  excellent:   { ar: 'ممتاز',          en: 'Excellent',           style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  connected:   { ar: 'مربوط',          en: 'Connected',           style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  notConnected:{ ar: 'غير مربوط',      en: 'Not connected',       style: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  default:     { ar: 'افتراضي',        en: 'Default',             style: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export function StatusBadge({ variant, lang = 'AR', className = '' }: StatusBadgeProps) {
  const badge = badgeMap[variant] || badgeMap.default;
  const label = lang === 'AR' ? badge.ar : badge.en;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.style} ${className}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
