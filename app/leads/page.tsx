"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeadsPageWrapper() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/operations/leads");
  }, [router]);

  return (
    <div className="min-h-screen bg-lightBg dark:bg-void text-slate-900 dark:text-white p-8 flex items-center justify-center" dir="rtl">
      <span>جاري الانتقال لمركز العمليات...</span>
    </div>
  );
}
