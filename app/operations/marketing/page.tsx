// app/operations/marketing/page.tsx
"use client";

import { Suspense } from "react";
import MarketingView from "@/components/views/MarketingView";

function MarketingSkeleton() {
  return (
    <div className="nc-page nc-stack orca-container orca-marketing-final pb-4">
      <div className="space-y-4">
        {/* hero skeleton */}
        <div className="orca-workspace-hero">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--nc-accent-soft)]" />
            <div className="h-7 w-64 animate-pulse rounded-xl bg-[var(--nc-surface-strong)]" />
            <div className="h-4 w-80 animate-pulse rounded-lg bg-[var(--nc-surface)]" />
          </div>
        </div>

        {/* kpi cards skeleton */}
        <div className="orca-workspace-metrics">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-h-[98px] animate-pulse rounded-2xl bg-[var(--nc-surface)] dark:bg-white/5"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        {/* table panel skeleton */}
        <div className="orca-workspace-panel overflow-hidden">
          <div className="border-b border-[var(--nc-border)] px-5 py-4">
            <div className="h-4 w-48 animate-pulse rounded-lg bg-[var(--nc-surface-strong)]" />
          </div>
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-[var(--nc-surface)]"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        {/* connections panel skeleton */}
        <div className="orca-workspace-panel overflow-hidden">
          <div className="border-b border-[var(--nc-border)] px-5 py-4">
            <div className="h-4 w-40 animate-pulse rounded-lg bg-[var(--nc-surface-strong)]" />
          </div>
          <div className="p-4 space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-[var(--nc-surface)]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<MarketingSkeleton />}>
      <MarketingView />
    </Suspense>
  );
}
