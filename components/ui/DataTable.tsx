'use client';

import React, { useState, useMemo, useEffect } from 'react';

export interface Column<T = any> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedId?: string;
  getId?: (row: T) => string;
  striped?: boolean;
  className?: string;
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  selectedId,
  getId,
  striped = true,
  className = '',
  emptyMessage = 'لا توجد بيانات',
  pageSize = 0,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const hasPagination = pageSize > 0 && data.length > pageSize;
  const totalPages = hasPagination ? Math.ceil(data.length / pageSize) : 1;

  const displayData = useMemo(() => {
    if (!hasPagination) return data;
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize, hasPagination]);

  // Reset page if data shrinks
  useEffect(() => {
    if (hasPagination && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [data.length, pageSize, page, totalPages, hasPagination]);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className={`nc-table ${striped ? 'nc-table-striped' : ''}`}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.headerClassName || ''}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-xs text-[var(--nc-text-dim)] font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            displayData.map((row, rowIdx) => {
              const rowId = getId ? getId(row) : String(rowIdx);
              const isSelected = selectedId ? rowId === selectedId : false;
              return (
                <tr
                  key={rowId}
                  className={`${isSelected ? 'nc-row-selected' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={col.className || ''}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : <span className="text-[var(--nc-text-dim)]">{row[col.accessor] ?? '—'}</span>}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {hasPagination && (
        <div className="flex items-center justify-between py-2 px-1 text-xs text-[var(--nc-text-dim)] border-t border-[var(--nc-glass-border)] mt-1">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} من {data.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >
              ««
            </button>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >
              «
            </button>
            <span className="px-2 py-1 text-[var(--nc-foreground)] font-mono">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >
              »
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded bg-[var(--nc-surface)] border border-[var(--nc-border)] disabled:opacity-30 text-[var(--nc-foreground)] cursor-pointer hover:bg-[var(--nc-surface-strong)] transition-colors"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
