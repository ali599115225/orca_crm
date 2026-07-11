"use client";

import { ShieldAlert } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { revenueVisual } from "./visual";

export default function RevenueIntegrityRouteState({
  state,
}: {
  state: "unauthorized" | "forbidden";
}) {
  const { lang } = useApp();
  const isArabic = lang !== "EN";
  const forbidden = state === "forbidden";

  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
          <ShieldAlert size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-black text-[var(--nc-text-primary)]">
          {forbidden
            ? isArabic
              ? "لا تملك صلاحية الوصول"
              : "Access is restricted"
            : isArabic
              ? "يلزم تسجيل الدخول"
              : "Sign-in required"}
        </h1>
        <p className="mt-2 text-sm text-[var(--nc-text-secondary)]">
          {forbidden
            ? isArabic
              ? "حسابك لا يملك صلاحية عرض سلامة الإيراد."
              : "Your account does not have permission to view Revenue Integrity."
            : isArabic
              ? "سجّل الدخول بحساب مصرح له للمتابعة."
              : "Sign in with an authorized account to continue."}
        </p>
        <a
          href={forbidden ? "/operations" : "/login"}
          className={`${revenueVisual.primaryButton} mt-5`}
        >
          {forbidden
            ? isArabic
              ? "العودة إلى العمليات"
              : "Back to operations"
            : isArabic
              ? "تسجيل الدخول"
              : "Sign in"}
        </a>
      </section>
    </main>
  );
}
