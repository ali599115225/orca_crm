// app/operations/documents/page.tsx
'use client';

import { Suspense } from 'react';
import DocumentsView from '@/components/views/DocumentsView';

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 py-3 space-y-4 px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 animate-pulse" />
        ))}
      </div>
    }>
      <div className="p-6">
        <DocumentsView />
      </div>
    </Suspense>
  );
}
