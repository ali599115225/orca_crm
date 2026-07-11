"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { leadVisual } from "@/features/leads/visual";

interface LeadListPagerProps {
  page: number;
  totalPages: number;
  isArabic: boolean;
  onPageChange: (page: number) => void;
}

export default function LeadListPager({
  page,
  totalPages,
  isArabic,
  onPageChange,
}: LeadListPagerProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--nc-border)] pt-3">
      <span className={leadVisual.meta}>
        {isArabic ? "الصفحة" : "Page"} {page} {isArabic ? "من" : "of"} {totalPages}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={leadVisual.secondaryButton}
        >
          {isArabic ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          {isArabic ? "السابق" : "Previous"}
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={leadVisual.secondaryButton}
        >
          {isArabic ? "التالي" : "Next"}
          {isArabic ? <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
