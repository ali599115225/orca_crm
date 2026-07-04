'use client';

import React from 'react';

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
    <div
      className="cursor-pointer rounded-xl border border-[#0A1F3A]/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] dark:border-white/10 dark:bg-[#0A1F3A]"
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
    </div>
  );
}
