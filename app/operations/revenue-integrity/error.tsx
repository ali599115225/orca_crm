"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { revenueVisual } from "@/components/revenue-integrity/visual";

export default function RevenueIntegrityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useApp();
  const isArabic = lang !== "EN";

  useEffect(() => {
    console.error("[RevenueIntegrityPage]", error.digest || "ROUTE_ERROR");
  }, [error.digest]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-rose-500/25 bg-[var(--nc-surface-solid)] p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-black text-[var(--nc-text-primary)]">
          {isArabic ? "تعذر تحميل سلامة الإيراد" : "Revenue Integrity could not load"}
        </h1>
        <p className="mt-2 text-sm text-[var(--nc-text-secondary)]">
          {isArabic
            ? "لم تُعرض بيانات غير مكتملة. أعد المحاولة بعد لحظات."
            : "Partial data was not shown. Try again in a moment."}
        </p>
        <button
          type="button"
          onClick={reset}
          className={`${revenueVisual.primaryButton} mt-5`}
        >
          {isArabic ? "إعادة المحاولة" : "Try again"}
        </button>
      </section>
    </main>
  );
}
