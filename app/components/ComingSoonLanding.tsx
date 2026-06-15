export default function ComingSoonLanding() {
  return (
    <main
      dir="rtl"
      aria-labelledby="coming-soon-title"
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--nc-bg)] px-6 py-16 text-center text-[var(--nc-text-primary)]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,var(--nc-accent-soft),transparent_34%),linear-gradient(180deg,var(--nc-surface-soft),transparent_56%)]" />
        <div className="absolute left-1/2 top-1/2 h-[min(58rem,92vw)] w-[min(58rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--nc-accent-border)] opacity-40" />
        <div className="absolute left-1/2 top-1/2 h-[min(34rem,76vw)] w-[min(34rem,76vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--nc-glass-border)] opacity-70" />
      </div>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-7">
        <h1
          id="coming-soon-title"
          className="font-heading text-balance text-4xl font-extrabold leading-[1.2] tracking-normal text-[var(--nc-text-primary)] sm:text-6xl lg:text-7xl"
        >
          قريبًا… ORCA CRM
        </h1>

        <p className="max-w-3xl text-pretty text-lg font-medium leading-[2.05] text-[var(--nc-text-secondary)] sm:text-2xl">
          نظام عقاري ذكي يُبنى ليمنح فرق المبيعات والإدارة رؤية أوضح، متابعة أسرع، وقرارات أدق.
          <br />
          نضع اللمسات الأخيرة قبل فتح التجربة المبكرة.
        </p>
      </section>
    </main>
  );
}
