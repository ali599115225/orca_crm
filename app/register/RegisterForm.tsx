// app/register/RegisterForm.tsx
"use client";

/**
 * Compatibility-only component retained for stale imports.
 *
 * The current product is a single-company internal operating platform. This
 * component intentionally contains no form, input, submit handler, server
 * action, tenant creation path, trial language, or subdomain onboarding.
 */
export function RegisterForm() {
  return (
    <section
      className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-6 text-center"
      dir="rtl"
      aria-labelledby="registration-unavailable-title"
    >
      <h1
        id="registration-unavailable-title"
        className="text-lg font-bold text-[var(--nc-foreground)]"
      >
        تسجيل الشركات غير متاح
      </h1>
      <p className="mt-3 text-sm leading-7 text-[var(--nc-foreground-secondary)]">
        ORCA منصة تشغيل داخلية لشركة واحدة. لا يتوفر إنشاء منشأة جديدة أو فترة
        تجريبية أو اشتراك ذاتي من هذه الواجهة.
      </p>
      <a
        href="/login"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--nc-glass-border)] px-5 text-sm font-semibold text-[var(--nc-foreground)]"
      >
        العودة إلى تسجيل الدخول
      </a>
    </section>
  );
}
