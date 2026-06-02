// app/operations/contract/[leadId]/PrintButton.tsx
'use client';

import React from 'react';

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2 rounded-lg transition-all cursor-pointer"
    >
      🖨️ طباعة وتنزيل كـ PDF
    </button>
  );
}
