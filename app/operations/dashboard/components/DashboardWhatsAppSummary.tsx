"use client";

import React from "react";
import { MessageCircleMore } from "lucide-react";
import InteractiveSurface from "@/components/ui/InteractiveSurface";

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
      key: "conversations",
      label: labels.conversations,
      value: conversationsCount,
    },
    {
      key: "new-leads",
      label: labels.newLeads,
      value: newLeadsCount,
    },
    {
      key: "unread",
      label: labels.unread,
      value: unreadMessagesCount,
    },
  ];

  return (
    <InteractiveSurface
      variant="card"
      className="p-5 text-start"
      onClick={onClick}
      aria-label={labels.title}
    >
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#25D366]/10 text-[#25D366]">
          <MessageCircleMore size={19} strokeWidth={2.2} aria-hidden="true" />
        </span>

        <h4 className="text-lg font-bold text-[#0A1F3A] dark:text-white">
          {labels.title}
        </h4>
      </div>

      <div className="grid gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex min-h-[54px] items-center justify-between gap-4 rounded-xl border border-[#0A1F3A]/10 bg-[#0A1F3A]/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]"
          >
            <span className="text-xs font-bold text-[#0A1F3A]/65 dark:text-white/70">
              {metric.label}
            </span>

            <strong className="text-xl font-black text-[#0A1F3A] dark:text-white">
              {formatNumber(metric.value)}
            </strong>
          </div>
        ))}
      </div>
    </InteractiveSurface>
  );
}
