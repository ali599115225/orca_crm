// app/operations/marketing/page.tsx
'use client';

import { Suspense } from 'react';
import MarketingView from '@/components/views/MarketingView';

export default function MarketingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 py-3 space-y-4 px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200/50 dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    }>
      <MarketingView />
    </Suspense>
  );
}
