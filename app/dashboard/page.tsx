"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/operations/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1C2B48] text-[#C4D8E5] font-medium p-8 flex items-center justify-center" dir="rtl">
      <span>جاري الانتقال لمركز العمليات...</span>
    </div>
  );
}
