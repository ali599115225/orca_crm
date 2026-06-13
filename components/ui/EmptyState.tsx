'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon = 'ph ph-package',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[var(--nc-accent-soft)] flex items-center justify-center mb-4">
        <i className={`${icon} text-2xl text-[var(--nc-accent)]`}></i>
      </div>
      <h4 className="text-sm font-bold text-[var(--nc-text-primary)] mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-[var(--nc-text-dim)] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl bg-[var(--nc-accent)] text-white text-xs font-bold hover:bg-[var(--nc-accent-hover)] transition-all nc-btn-press"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-xs text-[var(--nc-text-dim)] font-medium">
        {message}
      </td>
    </tr>
  );
}

export function CompactEmptyState({
  title,
  description,
  icon,
  className = '',
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-5 text-center ${className}`}>
      {icon && <div className="mb-2 text-[var(--nc-text-dim)] text-xl flex items-center justify-center">{icon}</div>}
      {title && <h4 className="text-xs font-bold text-[var(--nc-text-primary)] mb-1">{title}</h4>}
      {description && <p className="text-[11px] text-[var(--nc-text-dim)] max-w-[200px] leading-relaxed mx-auto">{description}</p>}
    </div>
  );
}
