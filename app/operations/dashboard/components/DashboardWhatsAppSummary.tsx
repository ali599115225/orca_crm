'use client';

import React from 'react';
import { SmartCard } from '@/components/ui/SmartCard';

interface DashboardWhatsAppSummaryProps {
  conversationsCount: number;
  newLeadsCount: number;
  unreadMessagesCount: number;
  onClick: () => void;
  labels: {
    title: string;
    conversations: string;
    newLeads: string;
    unread: string;
  };
  formatNumber: (value: number) => string;
}

export default function DashboardWhatsAppSummary({
  conversationsCount,
  newLeadsCount,
  unreadMessagesCount,
  onClick,
  labels,
  formatNumber,
}: DashboardWhatsAppSummaryProps) {
  const metrics = [
    {
      key: 'conversations',
      label: labels.conversations,
      value: conversationsCount,
    },
    {
      key: 'new-leads',
      label: labels.newLeads,
      value: newLeadsCount,
    },
    {
      key: 'unread',
      label: labels.unread,
      value: unreadMessagesCount,
    },
  ];

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <SmartCard
      elevation="default"
      className="h-full min-h-[276px] cursor-pointer p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orca-action-gold)]"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={labels.title}
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <i
            className="ph-fill ph-whatsapp-logo text-lg"
            aria-hidden="true"
          />
        </div>

        <h4 className="nc-heading-3">{labels.title}</h4>
      </div>

      <div className="grid gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex min-h-[54px] items-center justify-between gap-4 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-4 py-3"
          >
            <span className="text-xs font-bold text-[var(--nc-text-dim)]">
              {metric.label}
            </span>

            <strong className="text-xl font-black text-[var(--nc-text-primary)]">
              {formatNumber(metric.value)}
            </strong>
          </div>
        ))}
      </div>
    </SmartCard>
  );
}