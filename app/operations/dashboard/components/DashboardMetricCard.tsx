"use client";

import React from "react";
import InteractiveSurface from "@/components/ui/InteractiveSurface";

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
    <InteractiveSurface
      variant="card"
      className="flex h-36 flex-col justify-between p-5 text-start"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#0A1F3A]/70 dark:text-white/70">
          {title}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D9AD55]/10 text-[#D9AD55] transition-transform group-hover:scale-105">
          {icon}
        </span>
      </div>

      <strong className="text-4xl font-black text-[#0A1F3A] dark:text-white">
        {value}
      </strong>

      <p className="text-xs text-[#0A1F3A]/65 dark:text-white/70">
        {description}
      </p>
    </InteractiveSurface>
  );
}
