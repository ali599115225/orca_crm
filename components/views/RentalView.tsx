'use client';
import React, { useState } from 'react';
import { LayoutDashboard, FileText, ShieldCheck, Calculator } from 'lucide-react';

export default function RentalView() {
  return (
    <div className="w-full p-8 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white" dir="rtl">
      <h1 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
         الواجهة التكتيكية الجديدة (Glassmorphism)
      </h1>
      <div className="p-12 border-2 border-dashed border-[#df7b62]/50 rounded-2xl bg-black/20 text-center">
        <p className="text-xl">إذا رأيت هذا النص، فالتصميم الجديد يعمل الآن.</p>
      </div>
    </div>
  );
}