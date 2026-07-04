'use client';

import React from 'react';
import { SmartCard } from '@/components/ui/SmartCard';

export interface DashboardAgentSummaryItem {
  code: 'MANSOUR' | 'SAHER';
  nameAr: string;
  nameEn: string;
  status: string | null;
  lastActivity: string | null;
}

interface DashboardAgentsSummaryProps {
  agents: DashboardAgentSummaryItem[];
  onClick: () => void;
  labels: {
    title: string;
    viewAll: string;
    empty: string;
    statusUnavailable: string;
    lastActivityUnavailable: string;
  };
  lang: 'AR' | 'EN';
}

function localizeStatus(
  value: string | null,
  lang: 'AR' | 'EN',
  unavailable: string,
): string {
  if (!value?.trim()) return unavailable;

  const normalized = value.trim().toUpperCase();

  const statuses: Record<string, { AR: string; EN: string }> = {
    ACTIVE: { AR: 'نشط', EN: 'Active' },
    ENABLED: { AR: 'مفعّل', EN: 'Enabled' },
    RUNNING: { AR: 'قيد التشغيل', EN: 'Running' },
    IDLE: { AR: 'في وضع الاستعداد', EN: 'Idle' },
    PAUSED: { AR: 'متوقف مؤقتًا', EN: 'Paused' },
    DISABLED: { AR: 'معطّل', EN: 'Disabled' },
    INACTIVE: { AR: 'غير نشط', EN: 'Inactive' },
    ERROR: { AR: 'يوجد خطأ', EN: 'Error' },
    DEGRADED: { AR: 'أداء منخفض', EN: 'Degraded' },
  };

  return statuses[normalized]?.[lang] ?? unavailable;
}

function formatActivity(
  value: string | null,
  lang: 'AR' | 'EN',
  unavailable: string,
): string {
  if (!value?.trim()) return unavailable;

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(
      lang === 'AR' ? 'ar-SA' : 'en-US',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(date);
  }

  return unavailable;
}

export default function DashboardAgentsSummary({
  agents,
  onClick,
  labels,
  lang,
}: DashboardAgentsSummaryProps) {
  return (
    <SmartCard elevation="default" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--nc-accent-soft)] text-[var(--nc-accent-text)]">
            <i
              className="ph-fill ph-robot text-lg"
              aria-hidden="true"
            />
          </div>

          <h4 className="nc-heading-3">{labels.title}</h4>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="rounded-lg px-2 py-1 text-xs font-bold text-[var(--nc-accent-text)] transition-colors hover:bg-[var(--nc-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)]"
        >
          {labels.viewAll}
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="grid min-h-[112px] place-items-center rounded-xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface)] px-4 text-center text-xs font-medium text-[var(--nc-text-dim)]">
          {labels.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.code}
              className="min-h-[112px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--nc-text-primary)]">
                    {lang === 'AR' ? agent.nameAr : agent.nameEn}
                  </p>

                  <p className="mt-0.5 font-mono text-[10px] text-[var(--nc-text-dim)]">
                    {agent.code}
                  </p>
                </div>

                <span className="rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--nc-accent-text)]">
                  {localizeStatus(
                    agent.status,
                    lang,
                    labels.statusUnavailable,
                  )}
                </span>
              </div>

              <p className="mt-4 truncate text-[11px] text-[var(--nc-text-dim)]">
                {formatActivity(
                  agent.lastActivity,
                  lang,
                  labels.lastActivityUnavailable,
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </SmartCard>
  );
}