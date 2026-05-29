// app/admin/login/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 🔒 تحويل تلقائي لبوابة الإدارة الفوقية الموحدة لتجنب المسارات القديمة
 */
export default function LegacyAdminLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center font-sans">
      <div className="text-slate-400 text-xs">
        ⏳ جاري توجيهك لبوابة الإدارة الموحدة...
      </div>
    </div>
  );
}
