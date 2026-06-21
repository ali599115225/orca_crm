"use client";

import { formatDisplayDate } from "@/lib/display/dateTime";
import type { Copy, LeadItem } from "../types";

interface LeadSummaryPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  detailData: any;
  leadDisplayName: (lead: LeadItem) => string;
  leadDisplayCity: (lead: LeadItem) => string;
  leadDisplaySource: (lead: LeadItem) => string;
  leadDisplayStatus: (status?: string | null) => string;
  leadDisplayOwner: (value?: string | null) => string;
}

export default function LeadSummaryPanel({
  labels,
  selectedLead,
  detailData,
  leadDisplayName,
  leadDisplayCity,
  leadDisplaySource,
  leadDisplayStatus,
  leadDisplayOwner,
}: LeadSummaryPanelProps) {
  return (
    <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-2">
      {[
        {
          title: labels.leadInfo,
          body: `${leadDisplayName(selectedLead)} · ${leadDisplayCity(selectedLead)} · ${leadDisplaySource(selectedLead)}`,
        },
        {
          title: labels.currentStatus,
          body: `${labels.stage}: ${leadDisplayStatus(selectedLead.stage)} · ${labels.score}: ${
            selectedLead.leadScore || 0
          }/100`,
        },
        {
          title: labels.lastActivity,
          body: detailData?.updatedAt
            ? formatDisplayDate(detailData.updatedAt)
            : labels.notSpecified,
        },
        {
          title: labels.assignedTo,
          body: leadDisplayOwner(selectedLead.assignedTo),
        },
      ].map((row, index, rows) => (
        <div
          key={row.title}
          className={`grid min-h-[48px] grid-cols-[minmax(110px,0.34fr)_minmax(0,1fr)] items-center gap-3 py-2 ${
            index < rows.length - 1 ? "border-b border-[var(--nc-border)]" : ""
          }`}
        >
          <span className="text-xs font-bold text-[var(--nc-text-primary)]">{row.title}</span>
          <span className="truncate text-xs leading-6 text-[var(--nc-text-secondary)]">{row.body}</span>
        </div>
      ))}
    </div>
  );
}
