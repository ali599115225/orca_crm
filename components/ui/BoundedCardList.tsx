'use client';

import React, { useState, useMemo, useEffect } from 'react';

interface BoundedCardListProps {
  children: React.ReactNode[];
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  /** If true, renders cards in a scroll container without pagination. Use only when items < 5. */
  compact?: boolean;
}

export function BoundedCardList({
  children,
  pageSize = 15,
  emptyMessage = 'لا توجد بيانات',
  className = '',
  compact = false,
}: BoundedCardListProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / pageSize);

  // Reset if data shrinks
  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [items.length, pageSize, page, totalPages]);

  if (items.length === 0) {
    return (
      <div className={`py-12 text-center text-[var(--nc-text-dim)] font-medium text-xs ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  if (compact && items.length <= 5) {
    return <div className={className}>{items}</div>;
  }

  const start = page * pageSize;
  const displayItems = items.slice(start, start + pageSize);

  return (
    <div className={className}>
      {displayItems}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 px-1 text-xs text-[var(--nc-text-dim)] border-t border-[var(--nc-glass-border)] mt-3">
          <span>
            {start + 1}–{Math.min(start + pageSize, items.length)} من {items.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >««</button>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >«</button>
            <span className="px-2 py-1 text-[var(--nc-foreground)] font-mono">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >»</button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >»»</button>
          </div>
        </div>
      )}
    </div>
  );
}
