'use client';

import React from 'react';

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
}: DataTableProps<T>) {
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
            data.map((row, rowIdx) => {
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
                        : row[col.accessor] ?? '-'}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
