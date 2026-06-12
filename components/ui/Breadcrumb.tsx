import React from 'react';
import { useApp } from '@/app/context/AppContext';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const { lang } = useApp();
  const isRTL = lang === 'AR';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <nav className={`flex items-center text-sm font-medium text-[var(--nc-text-dim)] ${className}`} aria-label="breadcrumb">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronIcon size={14} className="mx-1 opacity-40 shrink-0" />}
          {item.href ? (
            <a href={item.href} className="hover:text-[var(--nc-foreground)] transition-colors whitespace-nowrap">
              {item.label}
            </a>
          ) : (
            <span className="text-[var(--nc-accent)] font-bold whitespace-nowrap">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
