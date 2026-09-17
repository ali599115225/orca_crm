import React from "react";

export const OPERATIONS_TABLE_PAGE_SIZE = 8;

interface OperationsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  locale: "ar" | "en";
  onPageChange: (page: number) => void;
  className?: string;
}

function format(value: number, locale: "ar" | "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value);
}

export default function OperationsPagination({
  page,
  totalPages,
  totalItems,
  pageSize = OPERATIONS_TABLE_PAGE_SIZE,
  locale,
  onPageChange,
  className = "",
}: OperationsPaginationProps) {
  if (totalItems <= 0) return null;

  const normalizedPage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
  const start = normalizedPage * pageSize + 1;
  const end = Math.min((normalizedPage + 1) * pageSize, totalItems);
  const isArabic = locale === "ar";

  return (
    <nav
      className={["orca-workspace-pagination", "orca-operations-pagination", className]
        .filter(Boolean)
        .join(" ")}
      aria-label={isArabic ? "التنقل بين صفحات الجدول" : "Table pagination"}
    >
      <span className="orca-operations-pagination-range">
        {format(start, locale)}-{format(end, locale)}{" "}
        {isArabic ? "من" : "of"} {format(totalItems, locale)}
      </span>

      <div className="orca-operations-pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, normalizedPage - 1))}
          disabled={normalizedPage === 0}
          className="orca-operations-secondary-button"
        >
          {isArabic ? "السابق" : "Previous"}
        </button>

        <span className="orca-operations-pagination-page">
          {isArabic ? "صفحة" : "Page"} {format(normalizedPage + 1, locale)}{" "}
          {isArabic ? "من" : "of"} {format(totalPages, locale)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, normalizedPage + 1))}
          disabled={normalizedPage >= totalPages - 1}
          className="orca-operations-secondary-button"
        >
          {isArabic ? "التالي" : "Next"}
        </button>
      </div>
    </nav>
  );
}
