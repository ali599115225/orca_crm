'use client';

import React from 'react';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}

export default function DashboardMetricCard({
  title,
  value,
  description,
  icon,
  onClick,
  ariaLabel,
}: DashboardMetricCardProps) {
  return (
    <div
      className="flex h-36 cursor-pointer flex-col justify-between rounded-xl border border-[#0A1F3A]/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] dark:border-white/10 dark:bg-[#0A1F3A]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={ariaLabel}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#0A1F3A]/70 dark:text-white/70">
          {title}
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D9AD55]/10 text-[#D9AD55]">
          {icon}
        </div>
      </div>
      <h3 className="text-4xl font-black text-[#0A1F3A] dark:text-white">
        {value}
      </h3>
      <p className="text-xs text-[#0A1F3A]/60 dark:text-white/60">
        {description}
      </p>
    </div>
  );
}
