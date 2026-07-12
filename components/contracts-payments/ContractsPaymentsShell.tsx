'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Landmark,
  PenLine,
  Receipt,
  Wallet,
} from 'lucide-react';

export type ContractsPaymentsPane =
  | 'leases'
  | 'sales'
  | 'invoices'
  | 'payments'
  | 'reconciliation'
  | 'settlements';

type MetricTone = 'default' | 'success' | 'warning' | 'danger';
type AlertTone = 'info' | 'warning' | 'danger';

export interface ContractsPaymentsMetric {
  label: string;
  value: string;
  hint: string;
  tone?: MetricTone;
}

export interface ContractsPaymentsAlert {
  label: string;
  tone: AlertTone;
}

interface ContractsPaymentsShellProps {
  locale: 'ar' | 'en';
  activePane: ContractsPaymentsPane;
  onPaneChange: (pane: ContractsPaymentsPane) => void;
  loading: boolean;
  title: string;
  description: string;
  metrics: ContractsPaymentsMetric[];
  alerts?: ContractsPaymentsAlert[];
  actions?: ReactNode;
  children: ReactNode;
}

const metricToneClass: Record<MetricTone, string> = {
  default: 'border-white/10 bg-white/[0.035] text-white',
  success: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
  warning: 'border-warning/20 bg-warning/[0.07] text-warning',
  danger: 'border-rose-500/20 bg-rose-500/[0.07] text-rose-300',
};

const alertToneClass: Record<AlertTone, string> = {
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

export default function ContractsPaymentsShell({
  locale,
  activePane,
  onPaneChange,
  loading,
  title,
  description,
  metrics,
  alerts = [],
  actions,
  children,
}: ContractsPaymentsShellProps) {
  const isArabic = locale === 'ar';
  const tabs: Array<{
    id: ContractsPaymentsPane;
    label: string;
    Icon: LucideIcon;
  }> = [
    { id: 'sales', label: isArabic ? 'عقود البيع' : 'Sales contracts', Icon: PenLine },
    { id: 'leases', label: isArabic ? 'عقود الإيجار' : 'Rental leases', Icon: FileText },
    { id: 'invoices', label: isArabic ? 'الفواتير' : 'Invoices', Icon: Receipt },
    { id: 'payments', label: isArabic ? 'المدفوعات' : 'Payments', Icon: Wallet },
    { id: 'reconciliation', label: isArabic ? 'المصالحة البنكية' : 'Bank reconciliation', Icon: Landmark },
    { id: 'settlements', label: isArabic ? 'التسويات' : 'Settlements', Icon: Wallet },
  ];

  return (
    <div
      className="nc-page nc-stack overflow-x-hidden"
      dir={isArabic ? 'rtl' : 'ltr'}
      data-contracts-payments-shell
    >
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--nc-accent-soft)] to-transparent opacity-50" />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 py-1 text-[10px] font-black tracking-wide text-[var(--nc-foreground)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--orca-action-gold)]" />
                {isArabic ? 'مركز تشغيلي ومالي موحد' : 'Unified operational and financial center'}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--nc-text-dim)] sm:text-sm">
                {description}
              </p>
            </div>

            {actions && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-2">
                {actions}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const tone = metric.tone || 'default';
              return (
                <div
                  key={metric.label}
                  className={`rounded-2xl border p-4 ${metricToneClass[tone]}`}
                >
                  <span className="block text-[10px] font-bold text-[var(--nc-text-dim)]">
                    {metric.label}
                  </span>
                  <strong className="mt-2 block text-xl font-black">
                    {loading ? '…' : metric.value}
                  </strong>
                  <span className="mt-1 block text-[10px] text-[var(--nc-text-dim)]">
                    {metric.hint}
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
        <div className="border-b border-white/10 bg-[var(--nc-surface-solid)] px-3 py-3">
          <div className="flex min-w-max items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onPaneChange(id)}
                aria-current={activePane === id ? 'page' : undefined}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-xs font-black transition-all ${
                  activePane === id
                    ? 'border-[var(--orca-action-gold)] bg-[var(--orca-action-gold-soft)] text-[var(--orca-action-gold)] shadow-sm'
                    : 'border-transparent bg-transparent text-[var(--nc-foreground-muted)] hover:border-white/10 hover:bg-white/[0.035] hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-white/5 px-4 py-3">
            {alerts.map((alert) => (
              <span
                key={`${alert.tone}:${alert.label}`}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${alertToneClass[alert.tone]}`}
              >
                {alert.label}
              </span>
            ))}
          </div>
        )}

        <div className="p-3 sm:p-4">
          {children}
        </div>
      </section>
    </div>
  );
}
